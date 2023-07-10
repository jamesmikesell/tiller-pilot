import { Injectable } from '@angular/core';
import { MockBoatSensorAndTillerController } from '../mock/mock-boat-sensor-and-tiller-controller.service';
import { BtMotorControllerService } from './bt-motor-controller.service';
import { Controller } from './controller';
import { ControllerRotationRateLogData, DataLogService } from './data-log.service';
import { DeviceSelectService } from './device-select.service';
import { ChainedFilter, Filter, LowPassFilter, NotAFilter } from './filter';
import { PidController } from './pid-controller';
import { PidTuner, Sensor, TuneConfig } from './pid-tuner';
import { SensorGpsService } from './sensor-gps.service';
import { HeadingAndTime, SensorOrientationService } from './sensor-orientation.service';
import { Subject, firstValueFrom, max } from 'rxjs';
import { ConfigService } from './config.service';

@Injectable({
  providedIn: 'root'
})
export class ControllerRotationRateService implements Controller {

  get enabled(): boolean { return this._enabled; }
  set enabled(val: boolean) {
    this._enabled = val;
    if (!val) {
      setTimeout(() => {
        this.motorService.command(0);
      }, 100);
    }
  }

  get maxRotationRate(): number { return this.configService.config.maxTurnRateDegreesPerSecondPerKt * this.sensorLocation.getSpeedKt() }
  desired = 0;
  lastErrorFiltered: number;



  private pidController: PidController;
  private filter = this.getFilter();
  private _enabled = false;
  private tuner: PidTuner;
  private sensorOrientation: SensorOrientationService | MockBoatSensorAndTillerController;
  private motorService: MockBoatSensorAndTillerController | BtMotorControllerService;
  private previousHeading: HeadingAndTime;
  private pidTuneComplete = new Subject<void>();
  private sensorLocation: SensorGpsService | MockBoatSensorAndTillerController;


  constructor(
    private deviceSelectService: DeviceSelectService,
    private dataLog: DataLogService,
    private configService: ConfigService,
  ) {
    this.motorService = deviceSelectService.motorController;
    this.sensorOrientation = deviceSelectService.orientationSensor;
    this.sensorLocation = deviceSelectService.locationSensor;


    this.configurePidController();

    this.sensorOrientation.heading.subscribe(heading => this.updateReceived(heading))
  }


  private configurePidController(): void {
    this.pidController = new PidController(
      this.configService.config.rotationKp,
      this.configService.config.rotationKi,
      this.configService.config.rotationKd,
      new ChainedFilter(this.configService.config.rotationPidDerivativeLowPassFrequency, 1),
    );
  }


  command(level: number): void {
    this.desired = level;
    this.enabled = true;
  }


  stop(): void {
    this.enabled = false;
    this.motorService.stop()
  }


  private getGetRotationAmount(currentAngle: number, previousAngle: number): number {
    let delta = currentAngle - previousAngle;
    if (delta > 180)
      delta = delta - 360;
    if (delta < -180)
      delta = delta + 360;

    return -delta;
  }


  private updateReceived(heading: HeadingAndTime): void {
    try {
      if (!this.previousHeading)
        return;

      // disabling speed compensation if we're truly stopped
      let speed = 1;
      if (this.sensorLocation.getSpeedKt() > 0.01)
        speed = this.sensorLocation.getSpeedKt();

      let timeDeltaSeconds = (heading.time - this.previousHeading.time) / 1000;
      let rawRotationRate = this.getGetRotationAmount(heading.heading, this.previousHeading.heading) / timeDeltaSeconds;
      let speedMultiplier = 1;
      if (!this.tuner && this.configService.config.rotationTuneSpeed)
        speedMultiplier = this.configService.config.rotationTuneSpeed / speed;

      let filteredRotationRate = this.filter.process(rawRotationRate, heading.time);
      this.processPidAutoTuneUpdate(filteredRotationRate, heading.time);

      let maxRotationRate = this.configService.config.maxTurnRateDegreesPerSecondPerKt * speed;
      let limitedDesired = Math.min(this.desired, maxRotationRate);
      limitedDesired = Math.max(limitedDesired, -maxRotationRate);
      let error = filteredRotationRate - limitedDesired;


      let command = this.pidController.update(error * speedMultiplier, heading.time);
      this.pidController.saturationReached = Math.abs(command) >= 1;
      command = Math.max(command, -1)
      command = Math.min(command, 1)

      const useAutoPilot = this.motorService.connected.value && this.enabled;
      if (useAutoPilot)
        this.motorService.command(command);


      let logData = new ControllerRotationRateLogData(
        this.desired,
        filteredRotationRate,
        error,
        this.deviceSelectService.mockBoat.rotationRateReal(),
        command,
      )

      this.dataLog.logControllerRotationRate(logData);
    } finally {
      this.previousHeading = heading;
    }

  }




  private getFilter(): Filter {
    return new ChainedFilter(this.configService.config.rotationLowPassFrequency, 1);
  }

  stopPidTune() {
    this.motorService.command(0);
    this.tuner = undefined;
    this.pidTuneComplete.next();
  }


  private processPidAutoTuneUpdate(rotationRate: number, time: number): void {
    let results = this.tuner?.sensorValueUpdated(rotationRate, time);
    if (results) {
      this.stopPidTune();

      let tuningMethod = results.pid;
      this.configService.config.rotationKp = tuningMethod.kP;
      this.configService.config.rotationKi = tuningMethod.kI;
      this.configService.config.rotationKd = tuningMethod.kD;
      this.configService.config.rotationTuneSpeed = this.sensorLocation.getSpeedKt();
      this.configService.save();
      this.configurePidController();
    }
  }


  async startPidTune(): Promise<void> {
    let tuneConfig = new TuneConfig();
    this.desired = 0;
    tuneConfig.setPoint = 0;
    tuneConfig.step = 1;
    tuneConfig.maxCycleCount = 20;
    tuneConfig.noiseBand = this.configService.config.rotationTuneNoiseBand;
    tuneConfig.allowedAmplitudeVariance = this.configService.config.rotationTuneAllowedVariance / 100;
    tuneConfig.disableNoiseBandAfterCycle = this.configService.config.rotationTuneDisableNoiseBandCycles;

    this._enabled = false;
    this.tuner = new PidTuner(this.motorService, tuneConfig);


    return await firstValueFrom(this.pidTuneComplete);
  }


}
