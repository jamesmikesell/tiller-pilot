import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BtMotorControllerService } from 'src/app/service/bt-motor-controller.service';
import { ControllerOrientationService } from 'src/app/service/controller-orientation.service';
import { ControllerRotationRateService } from 'src/app/service/controller-rotation-rate.service';
import { DataLogService } from 'src/app/service/data-log.service';
import { SensorGpsService } from 'src/app/service/sensor-gps.service';
import { SensorNavigationService } from 'src/app/service/sensor-navigation.service';
import { SensorOrientationService } from 'src/app/service/sensor-orientation.service';
import { WakeLockService } from 'src/app/service/wake-lock.service';
import { AppChartData } from '../chart/chart.component';
import { Controller } from 'src/app/service/controller';
import { DeviceSelectService } from 'src/app/service/device-select.service';
import { MockBoatSensorAndTillerController } from 'src/app/mock/mock-boat-sensor-and-tiller-controller.service';
import { timer } from 'rxjs';

@Component({
  selector: 'app-test',
  templateUrl: './test.component.html',
  styleUrls: ['./test.component.css']
})
export class TestComponent implements OnInit {
  chartOrientation: AppChartData[] = [];
  chartDataRotationRate: AppChartData[] = [];
  chartNavigation: AppChartData[] = [];
  chartGpsHeading: AppChartData[] = [];
  btConnected = false;
  clearDataString = "";
  loggingEnabled = false;
  showGraphs = true;
  sensorOrientation: SensorOrientationService | MockBoatSensorAndTillerController;

  private motorControllerService: MockBoatSensorAndTillerController | BtMotorControllerService;


  constructor(
    private wakeLockService: WakeLockService,
    public controllerRotationRate: ControllerRotationRateService,
    public controllerOrientation: ControllerOrientationService,
    public sensorGpsService: SensorGpsService,
    deviceSelectService: DeviceSelectService,
    private navigationService: SensorNavigationService,
    private dataLog: DataLogService,
    private snackBar: MatSnackBar,
  ) {
    this.motorControllerService = deviceSelectService.motorController;
    this.sensorOrientation = deviceSelectService.orientationSensor;
  }


  async clearData(): Promise<void> {
    if (this.canClear()) {
      await this.dataLog.clearSavedData();
      this.clearDataString = "";
    }
  }


  ngOnInit(): void {
    this.sensorGpsService.update.subscribe(() => this.updateReceived());

    this.motorControllerService.connected.subscribe(isConnected => this.btConnected = isConnected);


    timer(0, 1 * 1000)
      .subscribe(() => this.updateCharts());
  }


  copyResults(): void {
    let rot = this.controllerRotationRate;
    let or = this.controllerOrientation;
    let text = `${rot.kP}\t${rot.kI}\t${rot.kD}\t${or.kP}\t${or.kI}\t${or.kD}`
    navigator.clipboard.writeText(text);
  }

  clearGraphs(): void {
    this.dataLog.clearUnsavedData();
    this.updateCharts();
  }

  private gpsLat: number;
  private gpsLon: number;
  private gpsHeading: number;
  setGpsHeading(): void {
    this.gpsLat = this.sensorGpsService.latitude;
    this.gpsLon = this.sensorGpsService.longitude;
    this.gpsHeading = this.sensorGpsService.currentHeading;
    this.clearGraphs();
  }

  private updateReceived(): void {
    let distance = this.navigationService.calculateDistanceFromLine(
      this.gpsLat,
      this.gpsLon,
      this.gpsHeading,
      this.sensorGpsService.latitude,
      this.sensorGpsService.longitude
    )

    let logData = new LocationLogData(
      this.sensorGpsService.latitude,
      this.sensorGpsService.longitude,
      this.sensorGpsService.getSpeedKt(),
      distance,
      this.sensorGpsService.currentHeading
    )

    this.dataLog.logLocation(logData);
  }



  private updateCharts() {
    const start = this.dataLog.logData[0].time.getTime();
    let headingErrorFiltered = new AppChartData("Heading Er Fltr", []);
    let headingErrorRaw = new AppChartData("Heading Er Raw", []);
    let headingCommand = new AppChartData("Heading Cmd", []);
    let chartOrientation: AppChartData[] = [headingErrorRaw, headingErrorFiltered, headingCommand];

    let rotationRateRaw = new AppChartData("Rot. Rt. Cur", []);
    let rotationRateFiltered = new AppChartData("Rot. Rt. Desired", []);
    let rotationRateCommand = new AppChartData("Rot. Rt. Cmd", []);
    let rotationRateErrorFilter = new AppChartData("Rot. Rt. Sim. w/o Noise", []);
    let chartDataRotationRate: AppChartData[] = [rotationRateRaw, rotationRateFiltered, rotationRateCommand, rotationRateErrorFilter];


    let distanceFromLine = new AppChartData("Dst Fr Ln", []);
    let chartNavigation: AppChartData[] = [distanceFromLine];

    let gpsHeading = new AppChartData("GPS Heading", []);
    let chartGpsHeading: AppChartData[] = [gpsHeading];

    const now = Date.now();
    this.dataLog.logData
      // .filter(single => now - single.time.getTime() < 10000)
      .forEach(singleLog => {
        const time = (singleLog.time.getTime() - start) / 1000;

        headingErrorFiltered.data.push({ x: time, y: singleLog.headingErrorFiltered })
        headingErrorRaw.data.push({ x: time, y: singleLog.headingErrorRaw })
        headingCommand.data.push({ x: time, y: singleLog.headingCommand })
        rotationRateRaw.data.push({ x: time, y: singleLog.rotationRateCurrent })
        rotationRateFiltered.data.push({ x: time, y: singleLog.rotationRateDesired })
        rotationRateCommand.data.push({ x: time, y: singleLog.rotationRateCommand })
        rotationRateErrorFilter.data.push({ x: time, y: singleLog.rotationRateReal })
        distanceFromLine.data.push({ x: time, y: singleLog.locationDistanceFromTarget })
        gpsHeading.data.push({ x: time, y: singleLog.locationGpsHeading })
      })

    this.chartOrientation = chartOrientation;
    this.chartDataRotationRate = chartDataRotationRate;
    this.chartNavigation = chartNavigation;
    this.chartGpsHeading = chartGpsHeading;
  }

  async tune(): Promise<void> {
    await this.tuneRotationRateController();
    await this.tuneOrientationController();

    this.controllerOrientation.maintainCurrentHeading();
  }


  private async tuneRotationRateController(): Promise<void> {
    await this.dataLog.trySaveLogData();
    this.dataLog.clearUnsavedData();

    this.disableAllControllers();
    await this.controllerRotationRate.autoTune();
    this.snackBar.open("1/2 - Rot. Rt. PID Tune Complete", "Dismiss")
  }

  private async tuneOrientationController(): Promise<void> {
    await this.dataLog.trySaveLogData();
    this.dataLog.clearUnsavedData();

    this.disableAllControllers();
    await this.controllerOrientation.autoTune();
    this.snackBar.open("2/2 - Orientation PID Tune Complete", "Dismiss")
  }


  private disableAllControllers(): void {
    this.controllerOrientation.enabled = false;
    this.controllerRotationRate.enabled = false;
  }


  async maintainCurrentHeading(): Promise<void> {
    await this.dataLog.trySaveLogData();

    this.controllerOrientation.maintainCurrentHeading();
    this.dataLog.clearUnsavedData();
  }

  downloadLog(): void {
    this.dataLog.downloadLog();
  }

  async initBluetooth(): Promise<void> {
    this.wakeLockService.wakeLock();

    this.motorControllerService.connect();
  }


  moveManually(level: number): void {
    this.vibrate();
    if (this.controllerOrientation.enabled)
      this.controllerOrientation.desired = (this.controllerOrientation.desired - (level * 5)) % 360;
    else
      this.controllerRotationRate.command(this.controllerRotationRate.desired + level);
  }

  stopManually(): void {
    this.controllerRotationRate.stopPidTune();
    this.controllerOrientation.stopPidTune();

    if (this.controllerOrientation.enabled)
      this.controllerOrientation.enabled = false;

    this.controllerRotationRate.command(0)

    this.vibrate();
  }

  private vibrate(): void {
    navigator.vibrate([50]);
  }

  canClear(): boolean {
    return this.clearDataString.toLocaleLowerCase() === "clear";
  }

  private eStop(): void {
    this.controllerOrientation.stopPidTune();
    this.controllerRotationRate.stopPidTune();

    if (this.controllerOrientation.enabled)
      this.controllerOrientation.enabled = false;

    if (this.controllerRotationRate.enabled)
      this.controllerRotationRate.enabled = false;
  }


  motor(power: number): void {
    if (power === 0)
      this.eStop();


    this.motorControllerService.command(power);
    this.vibrate();
  }

}


export class LocationLogData {
  constructor(
    public locationLat: number,
    public locationLon: number,
    public locationSpeedKt: number,
    public locationDistanceFromTarget: number,
    public locationGpsHeading: number,
  ) { }
}