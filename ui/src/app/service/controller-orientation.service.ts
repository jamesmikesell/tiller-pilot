import { Injectable } from '@angular/core';
import { ControllerRotationRateService } from './controller-rotation-rate.service';
import { ControllerOrientationLogData, DataLogService } from './data-log.service';
import { HeadingStats } from './heading-stats';
import { ChainedFilter, Filter, LowPassFilter, NotAFilter } from './filter';
import { PidController } from './pid-controller';
import { PidTuneService, Sensor, TuneConfig } from './pid-tune.service';
import { SensorOrientationService } from './sensor-orientation.service';
import { MockBoatSensorAndTillerController } from '../mock/mock-boat-sensor-and-tiller-controller.service';
import { DeviceSelectService } from './device-select.service';

@Injectable({
  providedIn: 'root'
})
export class ControllerOrientationService {

  get kP(): number { return this.pidController.kP; }
  set kP(val: number) {
    this.pidController.kP = val;
    this.updateLocalStorage();
  }
  get kI(): number { return this.pidController.kI; }
  set kI(val: number) {
    this.pidController.kI = val;
    this.updateLocalStorage();
  }
  get kD(): number { return this.pidController.kD; }
  set kD(val: number) {
    this.pidController.kD = val;
    this.updateLocalStorage();
  }
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
  private lastErrorFiltered: number;
  private tuner: PidTuneService;
  private sensorOrientation: SensorOrientationService | MockBoatSensorAndTillerController;





  // private sensorOrientation: MockBoatSensorAndTillerController,
  // private motorService: MockBoatSensorAndTillerController,
  constructor(
    deviceSelectService: DeviceSelectService,
    private rotationRateController: ControllerRotationRateService,
    private dataLog: DataLogService,
  ) {
    this.sensorOrientation = deviceSelectService.orientationSensor

    let pidStringP = localStorage.getItem(LocalStorageKeys.pidP);
    let pidStringI = localStorage.getItem(LocalStorageKeys.pidI);
    let pidStringD = localStorage.getItem(LocalStorageKeys.pidD);

    let kP = 0;
    let kI = 0;
    let kD = 0;

    if (pidStringP != null)
      kP = +pidStringP;
    if (pidStringI != null)
      kI = +pidStringI;
    if (pidStringD != null)
      kD = +pidStringD;

    this.pidController = new PidController(kP, kI, kD);


    this.sensorOrientation.update.subscribe(() => this.updateReceived())
  }


  maintainCurrentHeading() {
    this.setDesiredHeadingToCurrent();
    this.enabled = true;
  }

  private setDesiredHeadingToCurrent(): void {
    this.desired = this.getAverageHeading();
    // this.errorFilter = this.getFilter();
    this.pidController.reset();
  }


  private getError(): number {
    let delta = this.sensorOrientation.current - this.desired;
    if (delta > 180)
      delta = delta - 360;
    if (delta < -180)
      delta = delta + 360;

    return -delta;
  }


  private updateReceived(): void {
    this.updateAverageHeading(this.sensorOrientation.current);
    const errorRaw = this.getError();
    const errorFiltered = this.errorFilter.process(errorRaw)
    // const errorFiltered = errorRaw;
    this.lastErrorFiltered = errorFiltered;

    let command = this.pidController.update(errorFiltered);

    const maxRate = 5;
    this.pidController.saturationReached = Math.abs(command) > maxRate;
    command = Math.max(command, -maxRate)
    command = Math.min(command, maxRate)

    if (this._enabled)
      this.rotationRateController.desired = command;


    let logData = new ControllerOrientationLogData(
      this.desired,
      this.sensorOrientation.current,
      errorRaw,
      errorFiltered,
      command,
      this.enabled,
      this.getAverageHeading(),
    )

    this.dataLog.logControllerOrientation(logData);
  }


  private updateLocalStorage(): void {
    localStorage.setItem(LocalStorageKeys.pidP, this.pidController.kP.toString());
    localStorage.setItem(LocalStorageKeys.pidI, this.pidController.kI.toString());
    localStorage.setItem(LocalStorageKeys.pidD, this.pidController.kD.toString());
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
    // return new ChainedFilter(1 / 1, 1);
    return new NotAFilter();
  }

  stopPidTune() {
    this.tuner?.cancel();
  }


  async autoTune(): Promise<void> {
    this.tuner = new PidTuneService();
    let parent = this;
    this.setDesiredHeadingToCurrent();
    this._enabled = false;

    let sensor: Sensor = {
      getValue: function (): number {
        return parent.lastErrorFiltered
      }
    };


    let tuneConfig = new TuneConfig();
    tuneConfig.setPoint = 0;
    tuneConfig.step = 1;
    tuneConfig.intervalMs = 100;
    tuneConfig.maxCycleCount = 15;
    tuneConfig.noiseBand = 0.5;


    let results = await this.tuner.tune(this.rotationRateController, sensor, tuneConfig);
    let tuningMethod = results.pid;
    this.kP = tuningMethod.kP;
    this.kI = tuningMethod.kI;
    this.kD = tuningMethod.kD;
  }


}



enum LocalStorageKeys {
  pidP = "pidP-orientation",
  pidI = "pidI-orientation",
  pidD = "pidD-orientation",
}
