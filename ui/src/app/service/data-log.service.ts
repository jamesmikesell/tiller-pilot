import { Injectable } from '@angular/core';
import { Subject, timer } from 'rxjs';
import { LocationLogData } from '../component/test/test.component';
import { DownloadService } from '../download.service';

@Injectable({
  providedIn: 'root'
})
export class DataLogService {

  updated = new Subject<void>();
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
  }


  clearLogData(): void {
    this._logData = [];
  }

  async downloadLog(): Promise<void> {
    this.downloadService.download(JSON.stringify(this._logData), `log-${(Date.now())}.txt`);
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