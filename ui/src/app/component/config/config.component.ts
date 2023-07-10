import { Component } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ConfigService } from 'src/app/service/config.service';
import { ControllerOrientationService } from 'src/app/service/controller-orientation.service';
import { ControllerRotationRateService } from 'src/app/service/controller-rotation-rate.service';
import { DataLogService } from 'src/app/service/data-log.service';

@Component({
  selector: 'app-config',
  templateUrl: './config.component.html',
  styleUrls: ['./config.component.css']
})
export class ConfigComponent {

  constructor(
    public configService: ConfigService,
    private dataLog: DataLogService,
    public controllerRotationRate: ControllerRotationRateService,
    public controllerOrientation: ControllerOrientationService,
    private snackBar: MatSnackBar,
  ) { }

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

  private disableAllControllers(): void {
    this.controllerOrientation.enabled = false;
    this.controllerRotationRate.enabled = false;
  }

}
