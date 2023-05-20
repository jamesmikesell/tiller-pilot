import { Injectable } from '@angular/core';
import { Subject, timer } from 'rxjs';
import { LocationLogData } from '../component/test/test.component';
import * as localforage from 'localforage';
import { DownloadService } from '../download.service';

@Injectable({
  providedIn: 'root'
})
export class DataLogService {

  updated = new Subject<void>();
  autoSaveEnabled = false;
  get logData(): LogData[] { return this._logData; }


  private lastControllerOrientation: ControllerOrientationLogData;
  private lastControllerRotationRate: ControllerRotationRateLogData;
  private lastLocation: LocationLogData;
  private _logData: LogData[] = [];


  constructor(
    private downloadService: DownloadService,
  ) {
    timer(0, 100)
      .subscribe(() => {
        this.update();
      })

    this.saveLogRecursive();
  }



  private saveLogRecursive(): void {
    setTimeout(async () => {
      this.trySaveLogData();
      this.saveLogRecursive();
    }, 5000);
  }


  async clearSavedData(): Promise<void> {
    await localforage.setItem("log", []);
  }

  clearUnsavedData(): void {
    this._logData = [];
  }

  async trySaveLogData(): Promise<void> {
    if (this.autoSaveEnabled)
      this.forceSaveLogData();
  }

  async forceSaveLogData(): Promise<void> {
    let existing: LogData[] = await localforage.getItem("asdf") || [];
    existing.push(...this._logData);
    await localforage.setItem("log", existing);
  }

  async downloadLog(): Promise<void> {
    await this.forceSaveLogData();
    let log = await localforage.getItem("log")
    this.downloadService.download(JSON.stringify(log), `log-${(Date.now())}.txt`);
  }



  logLocation(data: LocationLogData) {
    this.lastLocation = data;
  }


  logControllerOrientation(data: ControllerOrientationLogData) {
    this.lastControllerOrientation = data;
  }

  logControllerRotationRate(data: ControllerRotationRateLogData) {
    this.lastControllerRotationRate = data;
  }

  private update(): void {
    this._logData.push(new LogData(
      new Date(),
      this.lastLocation?.locationLat,
      this.lastLocation?.locationLon,
      this.lastLocation?.locationSpeedKt,
      this.lastLocation?.locationDistanceFromTarget,
      this.lastLocation?.locationGpsHeading,

      this.lastControllerOrientation?.headingDesired,
      this.lastControllerOrientation?.headingRaw,
      this.lastControllerOrientation?.headingErrorRaw,
      this.lastControllerOrientation?.headingErrorFiltered,
      this.lastControllerOrientation?.headingCommand,
      this.lastControllerOrientation?.headingPidEnabled,
      this.lastControllerOrientation?.headingAvg,

      this.lastControllerRotationRate?.rotationRateDesired,
      this.lastControllerRotationRate?.rotationRateCurrent,
      this.lastControllerRotationRate?.rotationRateErrorRaw,
      this.lastControllerRotationRate?.rotationRateReal,
      this.lastControllerRotationRate?.rotationRateCommand,
    ));

    this._logData = this._logData.filter(single => Date.now() - single.time.getTime() < 5 * 60 * 1000)

    this.updated.next();
  }

}



class LogData {
  constructor(
    public time: Date,
    public locationLat: number,
    public locationLon: number,
    public locationSpeedKt: number,
    public locationDistanceFromTarget: number,
    public locationGpsHeading: number,

    public headingDesired: number,
    public headingRaw: number,
    public headingErrorRaw: number,
    public headingErrorFiltered: number,
    public headingCommand: number,
    public headingPidEnabled: boolean,
    public headingAvg: number,

    public rotationRateDesired: number,
    public rotationRateCurrent: number,
    public rotationRateErrorRaw: number,
    public rotationRateReal: number,
    public rotationRateCommand: number,
  ) { }
}


export class ControllerOrientationLogData {
  constructor(
    public headingDesired: number,
    public headingRaw: number,
    public headingErrorRaw: number,
    public headingErrorFiltered: number,
    public headingCommand: number,
    public headingPidEnabled: boolean,
    public headingAvg: number,
  ) { }
}

export class ControllerRotationRateLogData {
  constructor(
    public rotationRateDesired: number,
    public rotationRateCurrent: number,
    public rotationRateErrorRaw: number,
    public rotationRateReal: number,
    public rotationRateCommand: number,
  ) { }
}