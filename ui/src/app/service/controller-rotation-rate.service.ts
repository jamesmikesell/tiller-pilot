import { Injectable } from '@angular/core';
import { Subject, firstValueFrom } from 'rxjs';
import { MockBoatSensorAndTillerController } from '../mock/mock-boat-sensor-and-tiller-controller.service';
import { BtMotorControllerService } from './bt-motor-controller.service';
import { ConfigService } from './config.service';
import { Controller } from './controller';
import { ControllerRotationRateLogData, DataLogService } from './data-log.service';
import { DeviceSelectService } from './device-select.service';
import { Filter, LowPassFilter } from './filter';
import { PidConfig, PidController } from './pid-controller';
import { PidTuner, PidTuningSuggestedValues, TuneConfig, TuningResult } from './pid-tuner';
import { SensorGpsService } from './sensor-gps.service';
import { HeadingAndTime, SensorOrientationService } from './sensor-orientation.service';

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
  private pidTuneComplete = new Subject<TuningResult>();
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
    let self = this;
    let config: PidConfig = {
      get kP(): number { return self.configService.config.rotationKp; },
      get kI(): number { return self.configService.config.rotationKi; },
      get kD(): number { return self.configService.config.rotationKd; },
    }

    this.pidController = new PidController(
      config,
      new LowPassFilter({ getCutoffFrequency: () => this.configService.config.rotationPidDerivativeLowPassFrequency }),
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
    return new LowPassFilter({ getCutoffFrequency: () => this.configService.config.rotationLowPassFrequency });
  }


  private finalizePidTune(): void {
    this.motorService.command(0);
    this.tuner = undefined;
  }


  cancelPidTune(): void {
    this.finalizePidTune();
    this.pidTuneComplete.next({
      success: false,
      description: "PID Tuning Canceled",
      suggestedValues: undefined,
    })
  }


  private processPidAutoTuneUpdate(rotationRate: number, time: number): void {
    this.tuner?.sensorValueUpdated(rotationRate, time);
  }


  private pidTuneSuccess(suggestedPidValues: PidTuningSuggestedValues): void {
    let tuningMethod = suggestedPidValues.pid;
    this.configService.config.rotationKp = +tuningMethod.kP.toPrecision(4);
    this.configService.config.rotationKi = +tuningMethod.kI.toPrecision(4);
    this.configService.config.rotationKd = +tuningMethod.kD.toPrecision(4);
    this.configService.config.rotationTuneSpeed = +this.sensorLocation.getSpeedKt().toPrecision(3);

    this.configurePidController();
  }


  async startPidTune(): Promise<TuningResult> {
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
    this.tuner.tuneComplete.subscribe(result => {
      this.finalizePidTune();
      if (result.success)
        this.pidTuneSuccess(result.suggestedValues);
      this.pidTuneComplete.next(result);
    })


    return await firstValueFrom(this.pidTuneComplete);
  }


}
