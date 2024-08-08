import { Component, HostListener, OnInit } from '@angular/core';
import { timer } from 'rxjs';
import { ConfigService } from 'src/app/service/config.service';
import { Controller } from 'src/app/service/controller';
import { ConnectableDevice } from 'src/app/service/controller-bt-motor.service';
import { ControllerOrientationService } from 'src/app/service/controller-orientation.service';
import { ControllerRotationRateService } from 'src/app/service/controller-rotation-rate.service';
import { CoordinateUtils } from 'src/app/service/coordinate-utils';
import { DataLogService } from 'src/app/service/data-log.service';
import { DeviceSelectService } from 'src/app/service/device-select.service';
import { SensorGpsService, SpeedSensor } from 'src/app/service/sensor-gps.service';
import { OrientationSensor } from 'src/app/service/sensor-orientation.service';
import { UnitConverter } from 'src/app/service/unit-converter';
import { WakeLockService } from 'src/app/service/wake-lock.service';
import { AppChartData } from '../chart/chart.component';

@Component({
  selector: 'app-test',
  templateUrl: './test.component.html',
  styleUrls: ['./test.component.scss']
})
export class TestComponent implements OnInit {
  chartOrientation: AppChartData[] = [];
  chartDataRotationRate: AppChartData[] = [];
  chartNavigation: AppChartData[] = [];
  chartGpsHeading: AppChartData[] = [];
  btConnected = false;
  sensorOrientation: OrientationSensor;
  sensorLocation: SpeedSensor;
  blackoutScreen = false;
  UnitConverter = UnitConverter;

  private motorControllerService: Controller & ConnectableDevice;


  constructor(
    private wakeLockService: WakeLockService,
    public controllerRotationRate: ControllerRotationRateService,
    public controllerOrientation: ControllerOrientationService,
    public sensorGpsService: SensorGpsService,
    deviceSelectService: DeviceSelectService,
    private dataLog: DataLogService,
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


  toggleFullScreen(): void {
    if (this.isInFullscreenMode())
      document.exitFullscreen();
    else
      document.documentElement.requestFullscreen();
  }


  isInFullscreenMode(): boolean {
    return !!document.fullscreenElement;
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
    let distanceKm = CoordinateUtils.calculateDistanceFromLineMeters(
      this.gpsLat,
      this.gpsLon,
      this.gpsHeading,
      this.sensorGpsService.latitude,
      this.sensorGpsService.longitude
    ) / 1000

    let logData = new LocationLogData(
      this.sensorGpsService.latitude,
      this.sensorGpsService.longitude,
      UnitConverter.mpsToKts(this.sensorGpsService.getSpeedMps()),
      distanceKm,
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
    this.controllerRotationRate.cancelPidTune();
    this.controllerOrientation.cancelPidTune();

    if (this.controllerOrientation.enabled)
      this.controllerOrientation.enabled = false;

    this.controllerRotationRate.command(0)

    this.vibrate();
  }

  private vibrate(): void {
    navigator.vibrate([50]);
  }


  private eStop(): void {
    this.controllerOrientation.cancelPidTune();
    this.controllerRotationRate.cancelPidTune();

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