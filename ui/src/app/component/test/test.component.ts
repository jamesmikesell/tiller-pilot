import { Component, HostListener, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { timer } from 'rxjs';
import { MockBoatSensorAndTillerController } from 'src/app/mock/mock-boat-sensor-and-tiller-controller.service';
import { BtMotorControllerService } from 'src/app/service/bt-motor-controller.service';
import { ConfigService } from 'src/app/service/config.service';
import { ControllerOrientationService } from 'src/app/service/controller-orientation.service';
import { ControllerRotationRateService } from 'src/app/service/controller-rotation-rate.service';
import { DataLogService } from 'src/app/service/data-log.service';
import { DeviceSelectService } from 'src/app/service/device-select.service';
import { SensorGpsService } from 'src/app/service/sensor-gps.service';
import { SensorNavigationService } from 'src/app/service/sensor-navigation.service';
import { SensorOrientationService } from 'src/app/service/sensor-orientation.service';
import { WakeLockService } from 'src/app/service/wake-lock.service';
import { AppChartData } from '../chart/chart.component';

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
  sensorOrientation: SensorOrientationService | MockBoatSensorAndTillerController;
  sensorLocation: SensorGpsService | MockBoatSensorAndTillerController;

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
    public configService: ConfigService,
  ) {
    this.motorControllerService = deviceSelectService.motorController;
    this.sensorOrientation = deviceSelectService.orientationSensor;
    this.sensorLocation = deviceSelectService.locationSensor;
  }



  ngOnInit(): void {
    this.sensorGpsService.update.subscribe(() => this.updateReceived());

    this.motorControllerService.connected.subscribe(isConnected => this.btConnected = isConnected);


    timer(0, 1 * 250)
      .subscribe(() => this.updateCharts());
  }


  @HostListener('window:beforeunload')
  onWindowReload(): void {
    this.motorControllerService.disconnect();
  }


  clearGraphs(): void {
    this.dataLog.clearLogData();
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
    if (!this.dataLog.logData.length) {
      console.log("no log data");
      return;
    }

    const start = this.dataLog.logData[0].time.getTime();
    let headingErrorFiltered = new AppChartData("Deviation filtered °", []);
    let headingErrorRaw = new AppChartData("Deviation °", []);
    let headingCommand = new AppChartData("Command (°/s)", []);
    let chartOrientation: AppChartData[] = [headingErrorRaw, headingErrorFiltered, headingCommand];

    let rotationRateRaw = new AppChartData("Actual (°/s)", []);
    let rotationRateFiltered = new AppChartData("Set Point (°/s)", []);
    let rotationRateCommand = new AppChartData("Command (motor power level)", []);
    let rotationRateErrorFilter = new AppChartData("Simulation Rate w/o Noise (°/s)", []);
    let chartDataRotationRate: AppChartData[] = [rotationRateRaw, rotationRateFiltered, rotationRateCommand];
    if (this.configService.config.simulation)
      chartDataRotationRate.push(rotationRateErrorFilter);

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
    this.dataLog.clearLogData();

    this.disableAllControllers();
    await this.controllerRotationRate.startPidTune();
    this.snackBar.open("1/2 - Rot. Rt. PID Tune Complete", "Dismiss")
  }

  private async tuneOrientationController(): Promise<void> {
    this.dataLog.clearLogData();

    this.disableAllControllers();
    await this.controllerOrientation.startPidTune();
    this.snackBar.open("2/2 - Orientation PID Tune Complete", "Dismiss")
  }


  private disableAllControllers(): void {
    this.controllerOrientation.enabled = false;
    this.controllerRotationRate.enabled = false;
  }


  async maintainCurrentHeading(): Promise<void> {
    this.controllerOrientation.maintainCurrentHeading();
    this.dataLog.clearLogData();
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