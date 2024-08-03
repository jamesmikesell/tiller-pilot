import { Injectable } from '@angular/core';
import { Subject, firstValueFrom } from 'rxjs';
import { MockBoatSensorAndTillerController } from '../mock/mock-boat-sensor-and-tiller-controller.service';
import { ConfigService } from './config.service';
import { ControllerRotationRateService } from './controller-rotation-rate.service';
import { ControllerOrientationLogData, DataLogService } from './data-log.service';
import { DeviceSelectService } from './device-select.service';
import { Filter, LowPassFilter } from './filter';
import { HeadingStats } from './heading-stats';
import { PidController } from './pid-controller';
import { PidTuner, TuneConfig } from './pid-tuner';
import { SensorGpsService } from './sensor-gps.service';
import { HeadingAndTime, SensorOrientationService } from './sensor-orientation.service';

@Injectable({
  providedIn: 'root'
})
export class ControllerOrientationService {

  get enabled(): boolean { return this._enabled && this.rotationRateController.enabled; }
  set enabled(val: boolean) {
    this._enabled = val;
    this.rotationRateController.enabled = val;
  }

  desired = 0;


  private pidController: PidController;
  private errorFilter = this.getFilter();
  private headingHistory: number[] = [];
  private _enabled = false;
  private tuner: PidTuner;
  private sensorOrientation: SensorOrientationService | MockBoatSensorAndTillerController;
  private sensorLocation: SensorGpsService | MockBoatSensorAndTillerController;
  private pidTuneComplete = new Subject<void>();



  constructor(
    deviceSelectService: DeviceSelectService,
    private rotationRateController: ControllerRotationRateService,
    private configService: ConfigService,
    private dataLog: DataLogService,
  ) {
    this.sensorOrientation = deviceSelectService.orientationSensor;
    this.sensorLocation = deviceSelectService.locationSensor;

    this.configurePidController();

    this.sensorOrientation.heading.subscribe(heading => this.updateReceived(heading))
  }


  private configurePidController(): void {
    this.pidController = new PidController(
      this.configService.config.orientationKp,
      this.configService.config.orientationKi,
      this.configService.config.orientationKd,
      new LowPassFilter(this.configService.config.orientationPidDerivativeLowPassFrequency),
    );
  }

  maintainCurrentHeading() {
    this.setDesiredHeadingToCurrent();
    this.enabled = true;
  }

  private setDesiredHeadingToCurrent(): void {
    this.desired = this.getAverageHeading();
  }


  private getError(currentHeading: number): number {
    let delta = currentHeading - this.desired;
    if (delta > 180)
      delta = delta - 360;
    if (delta < -180)
      delta = delta + 360;

    return -delta;
  }


  private updateReceived(heading: HeadingAndTime): void {
    this.updateAverageHeading(heading.heading);
    let errorRaw = this.getError(heading.heading);
    let speedMultiplier = 1;
    // also disabling speed compensation if we're truly stopped
    if (!this.tuner && this.configService.config.orientationTuneSpeed && this.sensorLocation.getSpeedKt() > 0.01)
      speedMultiplier = this.configService.config.orientationTuneSpeed / this.sensorLocation.getSpeedKt();

    const errorFiltered = this.errorFilter.process(errorRaw, heading.time)

    this.processPidAutoTuneUpdate(errorRaw, heading.time);

    let command = this.pidController.update(errorFiltered * speedMultiplier, heading.time);

    const maxRate = this.rotationRateController.maxRotationRate;
    this.pidController.saturationReached = Math.abs(command) > maxRate;
    command = Math.max(command, -maxRate)
    command = Math.min(command, maxRate)

    if (this._enabled)
      this.rotationRateController.desired = command;


    let logData = new ControllerOrientationLogData(
      this.desired,
      heading.heading,
      errorRaw,
      errorFiltered,
      command,
      this.enabled,
      this.getAverageHeading(),
    )

    this.dataLog.logControllerOrientation(logData);
  }


  getAverageHeading(): number {
    let avg = HeadingStats.circularMean(this.headingHistory);

    if (avg < 0)
      return 360 + avg;

    return avg;
  }


  private updateAverageHeading(currentHeading: number) {
    this.headingHistory.push(currentHeading);
    if (this.headingHistory.length > 6)
      this.headingHistory.shift()
  }


  private getFilter(): Filter {
    return new LowPassFilter(this.configService.config.orientationLowPassFrequency);
  }

  stopPidTune() {
    this.rotationRateController.command(0);
    this.tuner = undefined;
    this.pidTuneComplete.next();
  }


  private processPidAutoTuneUpdate(headingError: number, time: number): void {
    let results = this.tuner?.sensorValueUpdated(headingError, time);
    if (results) {
      this.stopPidTune();

      let tuningMethod = results.pid;
      this.configService.config.orientationKp = tuningMethod.kP;
      this.configService.config.orientationKi = tuningMethod.kI;
      this.configService.config.orientationKd = tuningMethod.kD;
      this.configService.config.orientationTuneSpeed = this.sensorLocation.getSpeedKt();
      this.configService.save();

      this.configurePidController();
    }
  }


  async startPidTune(): Promise<void> {
    let tuneConfig = new TuneConfig();
    tuneConfig.setPoint = 0;
    tuneConfig.step = 1;
    tuneConfig.maxCycleCount = 20;
    tuneConfig.noiseBand = this.configService.config.orientationTuneNoiseBand;
    tuneConfig.allowedAmplitudeVariance = this.configService.config.orientationTuneAllowedVariance / 100;
    tuneConfig.disableNoiseBandAfterCycle = this.configService.config.orientationTuneDisableNoiseBandCycles;


    this.setDesiredHeadingToCurrent();
    this._enabled = false;
    this.tuner = new PidTuner(this.rotationRateController, tuneConfig);

    return await firstValueFrom(this.pidTuneComplete);
  }


}
