import { Component, OnInit } from '@angular/core';
import * as localforage from 'localforage';
import { DownloadService } from 'src/app/download.service';
import { BtMotorControllerService, Direction } from 'src/app/service/bt-motor-controller.service';
import { HeadingCompassService } from 'src/app/service/heading-compass.service';
import { HeadingGpsService } from 'src/app/service/heading-gps.service';
import { PidControllerService } from 'src/app/service/pid-controller.service';
import { WakeLockService } from 'src/app/service/wake-lock.service';
import { HeadingStats } from '../../service/heading-stats';
import { AppChartData } from '../chart/chart.component';
import { LowPassFilter } from './low-pass-filter';

@Component({
  selector: 'app-test',
  templateUrl: './test.component.html',
  styleUrls: ['./test.component.css']
})
export class TestComponent implements OnInit {
  pidSpeed: number;
  Direction = Direction;
  logMessages = "";
  autoPilotOn = false;
  motorDirection: Direction
  chartData1: AppChartData[] = [];
  chartData2: AppChartData[] = [];
  chartData3: AppChartData[] = [];
  btConnected = false;
  clearDataString = "";
  activeHeadingService: HeadingCompassService | HeadingGpsService;
  loggingEnabled = false;

  private logData: LogData[] = [];
  private headingHistory: number[] = [];
  private filterError = this.getFilter();

  constructor(
    private wakeLockService: WakeLockService,
    public pidController: PidControllerService,
    public headingGpsService: HeadingGpsService,
    public headingCompassService: HeadingCompassService,
    private motorService: BtMotorControllerService,
    private downloadService: DownloadService,
  ) {
    this.saveLogRecursive();
    this.activeHeadingService = headingCompassService;
  }

  private saveLogRecursive(): void {
    setTimeout(async () => {
      this.trySaveLogData();
      this.saveLogRecursive();
    }, 5000);
  }

  private async trySaveLogData(): Promise<void> {
    if (this.loggingEnabled) {
      let existing: LogData[] = await localforage.getItem("asdf") || [];
      existing.push(...this.logData);
      await localforage.setItem("log", existing);
    }
  }

  async downloadLog(): Promise<void> {
    let log = await localforage.getItem("log")
    this.downloadService.download(JSON.stringify(log), `log-${(Date.now())}.txt`);
  }

  async clearData(): Promise<void> {
    if (this.canClear()) {
      await localforage.setItem("log", []);
      this.clearDataString = "";
    }
  }


  ngOnInit(): void {
    this.headingCompassService.update.subscribe(() => this.updateReceived())
    this.headingGpsService.update.subscribe(() => this.updateReceived());

    this.motorService.connected.subscribe(isConnected => this.btConnected = isConnected);
  }

  private updateReceived(): void {
    this.updateAverageHeading(this.activeHeadingService.current);
    const errorRaw = this.activeHeadingService.getError();
    const errorFiltered = this.filterError.process(errorRaw)

    let command = this.pidController.update(errorFiltered);
    this.pidController.saturationReached = Math.abs(command) > 1;
    command = Math.max(command, -1)
    command = Math.min(command, 1)

    let direction = Direction.RIGHT;
    if (command < 0)
      direction = Direction.LEFT;

    this.pidSpeed = Math.abs(command);
    this.motorDirection = direction;

    const useAutoPilot = this.motorService.connected.value && this.autoPilotOn;
    if (useAutoPilot)
      this.moveFsk(direction, this.pidSpeed);

    this.logData.push(new LogData(
      new Date(),
      this.headingGpsService.latitude,
      this.headingGpsService.longitude,
      this.activeHeadingService.desired,
      this.activeHeadingService.current,
      errorRaw,
      errorFiltered,
      command,
      useAutoPilot,
      this.headingGpsService.getSpeedKt(),
      this.getAverageHeading(),
    ));

    this.updateCharts();
  }


  private getFilter(): LowPassFilter {
    return new LowPassFilter(1 / 4);
  }

  private updateAverageHeading(currentHeading: number) {
    this.headingHistory.push(currentHeading);
    if (this.headingHistory.length > 6)
      this.headingHistory.shift()
  }

  getAverageHeading(): number {
    let avg = HeadingStats.circularMean(this.headingHistory);

    if (avg < 0)
      return 360 + avg;

    return avg;
  }


  private updateCharts() {
    const start = this.logData[0].time.getTime();
    let errorFiltered = new AppChartData("error filtered", []);
    let errorRaw = new AppChartData("error raw", []);
    let dataChart1: AppChartData[] = [errorRaw, errorFiltered];

    let headingRaw = new AppChartData("heading raw", []);
    let headingFiltered = new AppChartData("heading filtered", []);
    let dataChart2: AppChartData[] = [headingRaw, headingFiltered];

    let command = new AppChartData("command", []);
    let dataChart3: AppChartData[] = [errorFiltered, command];

    this.logData.forEach(singleLog => {
      const time = (singleLog.time.getTime() - start) / 1000;

      errorFiltered.data.push({ x: time, y: singleLog.errorFiltered })
      errorRaw.data.push({ x: time, y: singleLog.errorRaw })
      headingRaw.data.push({ x: time, y: singleLog.headingRaw })
      headingFiltered.data.push({ x: time, y: singleLog.headingAvg })
      command.data.push({ x: time, y: singleLog.command })
    })

    this.chartData1 = dataChart1;
    this.chartData2 = dataChart2;
    this.chartData3 = dataChart3;
  }

  private clearChartData(): void {
    this.chartData1 = [];
  }


  async maintainCurrentHeading(): Promise<void> {
    await this.trySaveLogData();
    this.logData = [];

    this.filterError = this.getFilter();
    this.activeHeadingService.desired = this.getAverageHeading();
    this.pidController.reset();
    this.autoPilotOn = true;
    this.clearChartData();
  }

  async initBluetooth(): Promise<void> {
    this.wakeLockService.wakeLock();

    this.motorService.connect();
  }

  changeAutoPilot(isOn: boolean): void {
    this.autoPilotOn = isOn;
    if (!isOn) {
      // calling move fsk so that it cancels any pending modulations
      this.moveFsk(Direction.LEFT, 0);
    }
  }

  private moveFsk(direction: Direction, speed: number): void {
    this.motorService.moveFsk(direction, speed);
  }

  moveManually(direction: Direction): void {
    this.vibrate();
    this.motorService.move(direction);
  }

  stopManually(): void {
    if (this.autoPilotOn)
      this.changeAutoPilot(false);
    else
      this.motorService.stop();

    this.vibrate();
  }

  private vibrate(): void {
    // let snd = new Audio("data:audio/wav;base64,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qJrx4KOQjahZxWbcZgztj2c49nKmkId44S71j0c8eV9yDK6uPRzx5X18eDvjvQ6yKo9ZSS6l//8elePK/Lf//IInrOF/FvDoADYAGBMGb7FtErm5MXMlmPAJQVgWta7Zx2go+8xJ0UiCb8LHHdftWyLJE0QIAIsI+UbXu67dZMjmgDGCGl1H+vpF4NSDckSIkk7Vd+sxEhBQMRU8j/12UIRhzSaUdQ+rQU5kGeFxm+hb1oh6pWWmv3uvmReDl0UnvtapVaIzo1jZbf/pD6ElLqSX+rUmOQNpJFa/r+sa4e/pBlAABoAAAAA3CUgShLdGIxsY7AUABPRrgCABdDuQ5GC7DqPQCgbbJUAoRSUj+NIEig0YfyWUho1VBBBA//uQZB4ABZx5zfMakeAAAAmwAAAAF5F3P0w9GtAAACfAAAAAwLhMDmAYWMgVEG1U0FIGCBgXBXAtfMH10000EEEEEECUBYln03TTTdNBDZopopYvrTTdNa325mImNg3TTPV9q3pmY0xoO6bv3r00y+IDGid/9aaaZTGMuj9mpu9Mpio1dXrr5HERTZSmqU36A3CumzN/9Robv/Xx4v9ijkSRSNLQhAWumap82WRSBUqXStV/YcS+XVLnSS+WLDroqArFkMEsAS+eWmrUzrO0oEmE40RlMZ5+ODIkAyKAGUwZ3mVKmcamcJnMW26MRPgUw6j+LkhyHGVGYjSUUKNpuJUQoOIAyDvEyG8S5yfK6dhZc0Tx1KI/gviKL6qvvFs1+bWtaz58uUNnryq6kt5RzOCkPWlVqVX2a/EEBUdU1KrXLf40GoiiFXK///qpoiDXrOgqDR38JB0bw7SoL+ZB9o1RCkQjQ2CBYZKd/+VJxZRRZlqSkKiws0WFxUyCwsKiMy7hUVFhIaCrNQsKkTIsLivwKKigsj8XYlwt/WKi2N4d//uQRCSAAjURNIHpMZBGYiaQPSYyAAABLAAAAAAAACWAAAAApUF/Mg+0aohSIRobBAsMlO//Kk4soosy1JSFRYWaLC4qZBYWFRGZdwqKiwkNBVmoWFSJkWFxX4FFRQWR+LsS4W/rFRb/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////VEFHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAU291bmRib3kuZGUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMjAwNGh0dHA6Ly93d3cuc291bmRib3kuZGUAAAAAAAAAACU=");
    // snd.play();
    navigator.vibrate([50]);
  }

  canClear(): boolean {
    return this.clearDataString.toLocaleLowerCase() === "clear";
  }

}



class LogData {
  constructor(
    public time: Date,
    public lat: number,
    public lon: number,
    public desiredHeading: number,
    public headingRaw: number,
    public errorRaw: number,
    public errorFiltered: number,
    public command: number,
    public autoPilotOn: boolean,
    public speedKt: number,
    public headingAvg: number,
  ) { }
}
