import { Injectable } from '@angular/core';
import { MockBoatSensorAndTillerController } from '../mock/mock-boat-sensor-and-tiller-controller.service';
import { BtMotorControllerService } from './bt-motor-controller.service';
import { Controller } from './controller';
import { ControllerRotationRateLogData, DataLogService } from './data-log.service';
import { DeviceSelectService } from './device-select.service';
import { ChainedFilter, Filter, LowPassFilter, NotAFilter } from './filter';
import { PidController } from './pid-controller';
import { PidTuneService, Sensor, TuneConfig } from './pid-tune.service';
import { SensorGpsService } from './sensor-gps.service';
import { SensorOrientationService } from './sensor-orientation.service';

@Injectable({
  providedIn: 'root'
})
export class ControllerRotationRateService implements Controller {

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
  get enabled(): boolean { return this._enabled; }
  set enabled(val: boolean) {
    this._enabled = val;
    if (!val) {
      setTimeout(() => {
        this.motorService.command(0);
      }, 100);
    }
  }

  get currentMotorPower(): number { return this._motorPower; }
  desired = 0;
  lastErrorFiltered: number;



  private pidController: PidController;
  private filter = this.getFilter();
  private _enabled = false;
  private _motorPower = 0;
  private tuner: PidTuneService;
  private previousAngle: number;
  private previousTime: number;
  private currentRotationRate: number;
  private sensorOrientation: SensorOrientationService | MockBoatSensorAndTillerController;
  private motorService: MockBoatSensorAndTillerController | BtMotorControllerService;



  constructor(
    private deviceSelectService: DeviceSelectService,
    private dataLog: DataLogService,
  ) {
    this.motorService = deviceSelectService.motorController;
    this.sensorOrientation = deviceSelectService.orientationSensor;


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

    this.pidController = new PidController(kP, kI, kD, new ChainedFilter(1 / 10, 1));


    this.sensorOrientation.update.subscribe(() => this.updateReceived())
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


  private updateReceived(): void {
    const now = performance.now()
    let thisIsFirstPass = this.previousAngle === undefined;
    let timeDeltaSeconds = (now - this.previousTime) / 1000;
    const currentAngle = this.sensorOrientation.current;
    let rawRotationRate = this.getGetRotationAmount(currentAngle, this.previousAngle) / timeDeltaSeconds;
    this.previousAngle = currentAngle
    this.previousTime = now;
    if (thisIsFirstPass)
      return;


    this.currentRotationRate = this.filter.process(rawRotationRate);
    // this.currentRotationRate = rawRotationRate;

    const errorRaw = this.currentRotationRate - this.desired;
    const errorFiltered = errorRaw;
    this.lastErrorFiltered = errorFiltered;

    let command = this.pidController.update(errorFiltered);
    const maxRate = 1;
    this.pidController.saturationReached = Math.abs(command) > maxRate;
    command = Math.max(command, -maxRate)
    command = Math.min(command, maxRate)

    this._motorPower = command

    const useAutoPilot = this.motorService.connected.value && this.enabled;
    if (useAutoPilot)
      this.motorService.command(command);


    let logData = new ControllerRotationRateLogData(
      this.desired,
      this.currentRotationRate,
      errorRaw,
      this.deviceSelectService.mockBoat.rotationRateReal(),
      command,
    )

    this.dataLog.logControllerRotationRate(logData);
  }


  private updateLocalStorage(): void {
    localStorage.setItem(LocalStorageKeys.pidP, this.pidController.kP.toString());
    localStorage.setItem(LocalStorageKeys.pidI, this.pidController.kI.toString());
    localStorage.setItem(LocalStorageKeys.pidD, this.pidController.kD.toString());
  }



  private getFilter(): Filter {
    return new ChainedFilter(10, 1);
    // return new NotAFilter();
  }

  stopPidTune() {
    this.tuner?.cancel();
  }


  async autoTune(): Promise<void> {
    this.tuner = new PidTuneService();
    let parent = this;
    this.desired = 0;
    this.filter = this.getFilter();
    this._enabled = false;


    let sensor: Sensor = {
      getValue: function (): number {
        return parent.lastErrorFiltered
      }
    };


    let tuneConfig = new TuneConfig();
    tuneConfig.setPoint = this.desired;
    tuneConfig.step = 1;
    tuneConfig.intervalMs = 100;
    tuneConfig.maxCycleCount = 6;
    tuneConfig.noiseBand = 1;


    let results = await this.tuner.tune(this.motorService, sensor, tuneConfig);
    let tuningMethod = results.pid;
    this.kP = tuningMethod.kP;
    this.kI = tuningMethod.kI;
    this.kD = tuningMethod.kD;

    this.command(0);
  }


}



enum LocalStorageKeys {
  pidP = "pidP-rotation-rate",
  pidI = "pidI-rotation-rate",
  pidD = "pidD-rotation-rate",
}


class HeadingAndTime {
  constructor(
    public date: Date,
    public heading: number,
  ) { }
}