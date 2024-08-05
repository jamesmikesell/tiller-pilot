import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MockBoatSensorAndTillerController } from 'src/app/mock/mock-boat-sensor-and-tiller-controller.service';
import { BtMotorControllerService } from 'src/app/service/bt-motor-controller.service';
import { ConfigService } from 'src/app/service/config.service';
import { ControllerOrientationService } from 'src/app/service/controller-orientation.service';
import { ControllerRotationRateService } from 'src/app/service/controller-rotation-rate.service';
import { DataLogService } from 'src/app/service/data-log.service';
import { DeviceSelectService } from 'src/app/service/device-select.service';

@Component({
  selector: 'app-config',
  templateUrl: './config.component.html',
  styleUrls: ['./config.component.scss']
})
export class ConfigComponent implements OnInit {

  btConnected = false;


  private motorControllerService: MockBoatSensorAndTillerController | BtMotorControllerService;


  constructor(
    public configService: ConfigService,
    private dataLog: DataLogService,
    public controllerRotationRate: ControllerRotationRateService,
    public controllerOrientation: ControllerOrientationService,
    private snackBar: MatSnackBar,
    deviceSelectService: DeviceSelectService,
  ) {
    this.motorControllerService = deviceSelectService.motorController;
  }


  ngOnInit(): void {
    this.motorControllerService.connected.subscribe(isConnected => this.btConnected = isConnected);
  }


  refresh(): void {
    location.reload();
  }


  clearGraphs(): void {
    this.dataLog.clearLogData();
  }


  downloadLog(): void {
    this.dataLog.downloadLog();
  }


  async tuneRotationOnly(): Promise<void> {
    this.dataLog.clearLogData();

    this.disableAllControllers();
    await this.controllerRotationRate.startPidTune();
    this.snackBar.open("Rot. Rt. PID Tune Complete", "Dismiss")
  }


  async tuneOrientationOnly(): Promise<void> {
    this.dataLog.clearLogData();

    this.disableAllControllers();
    await this.controllerOrientation.startPidTune();
    this.snackBar.open("Orientation PID Tune Complete", "Dismiss")
  }


  async tuneAll(): Promise<void> {
    await this.tuneRotationOnly();
    this.snackBar.open("1/2 - Rot. Rt. PID Tune Complete", "Dismiss")
    await this.tuneOrientationOnly();
    this.snackBar.open("2/2 - Orientation PID Tune Complete", "Dismiss")

    this.controllerOrientation.maintainCurrentHeading();
  }


  private disableAllControllers(): void {
    this.controllerOrientation.enabled = false;
    this.controllerRotationRate.enabled = false;
  }

}
