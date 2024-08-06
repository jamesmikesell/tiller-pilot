import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MockBoatSensorAndTillerController } from 'src/app/mock/mock-boat-sensor-and-tiller-controller.service';
import { BtMotorControllerService } from 'src/app/service/bt-motor-controller.service';
import { ConfigService } from 'src/app/service/config.service';
import { ControllerOrientationService } from 'src/app/service/controller-orientation.service';
import { ControllerRotationRateService } from 'src/app/service/controller-rotation-rate.service';
import { DataLogService } from 'src/app/service/data-log.service';
import { DeviceSelectService } from 'src/app/service/device-select.service';
import { TuningResult } from 'src/app/service/pid-tuner';

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


  async tuneRotationOnly(): Promise<TuningResult> {
    setTimeout(() => {
      this.dataLog.clearLogData();
    }, 500);

    this.disableAllControllers();
    let tuneResult = await this.controllerRotationRate.startPidTune();
    if (tuneResult.success)
      this.snackBar.open("Rot. Rt. PID Tune Complete", "Dismiss");
    else
      this.snackBar.open(`Rot. Rt. PID Tune Failed: ${tuneResult.description}`, "Dismiss")

    return tuneResult;
  }


  async tuneOrientationOnly(): Promise<TuningResult> {
    setTimeout(() => {
      this.dataLog.clearLogData();
    }, 500);

    this.disableAllControllers();
    let tuneResult = await this.controllerOrientation.startPidTune();
    if (tuneResult.success)
      this.snackBar.open("Orientation PID Tune Complete", "Dismiss")
    else
      this.snackBar.open(`Orientation PID Tune Failed: ${tuneResult.description}`, "Dismiss")

    return tuneResult;
  }


  async tuneAll(): Promise<void> {
    let rotationRateResults = await this.tuneRotationOnly();
    if (!rotationRateResults.success)
      return;
    this.snackBar.open("1/2 - Rot. Rt. PID Tune Complete", "Dismiss")

    let orientationResult = await this.tuneOrientationOnly();
    if (!orientationResult.success)
      return;
    this.snackBar.open("2/2 - Orientation PID Tune Complete", "Dismiss")

    this.controllerOrientation.maintainCurrentHeading();
  }


  private disableAllControllers(): void {
    this.controllerOrientation.enabled = false;
    this.controllerRotationRate.enabled = false;
  }

}
