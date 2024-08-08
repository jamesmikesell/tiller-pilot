import { Injectable } from '@angular/core';
import { Subject, firstValueFrom } from 'rxjs';
import { ConfigService, PidTuneSaver, RotationControllerConfig } from './config.service';
import { Controller } from './controller';
import { ControllerRotationRateLogData, DataLogService } from './data-log.service';
import { DeviceSelectService } from './device-select.service';
import { Filter, LowPassFilter } from './filter';
import { PidConfig, PidController } from './pid-controller';
import { PidTuner, PidTuningSuggestedValues, TuneConfig, TuningResult } from './pid-tuner';
import { SpeedSensor } from './sensor-gps.service';
import { HeadingAndTime } from './sensor-orientation.service';
import { UnitConverter } from './unit-converter';

@Injectable({
  providedIn: 'root'
})
export class ControllerRotationRateService implements Controller {

  get enabled(): boolean { return this._enabled; }
  set enabled(val: boolean) {
    this._enabled = val;
    if (!val) {
      setTimeout(() => {
        this.motorService.command(0);
      }, 100);
    }
  }

  get maxRotationRate(): number {
    let speedKts = UnitConverter.mpsToKts(this.sensorLocation.getSpeedMps());
    return this.configService.config.maxTurnRateDegreesPerSecondPerKt * speedKts
  }
  desired = 0;
  lastErrorFiltered: number;



  private pidController: PidController;
  private filter = this.getFilter();
  private _enabled = false;
  private tuner: PidTuner;
  private motorService: Controller;
  private previousHeading: HeadingAndTime;
  private pidTuneComplete = new Subject<TuningResult>();
  private sensorLocation: SpeedSensor;


  constructor(
    private deviceSelectService: DeviceSelectService,
    private dataLog: DataLogService,
    private configService: ConfigService,
  ) {
    this.motorService = deviceSelectService.motorController;
    this.sensorLocation = deviceSelectService.locationSensor;


    this.configurePidController();

    let sensorOrientation = deviceSelectService.orientationSensor;
    sensorOrientation.heading.subscribe(heading => this.updateReceived(heading))
  }


  private configurePidController(): void {
    let self = this;
    let config: PidConfig = {
      get kP(): number { return self.configService.config.rotationKp; },
      get kI(): number { return self.configService.config.rotationKi; },
      get kD(): number { return self.configService.config.rotationKd; },
    }

    this.pidController = new PidController(
      config,
      new LowPassFilter({ getCutoffFrequency: () => this.configService.config.rotationPidDerivativeLowPassFrequency }),
    );
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


  private updateReceived(heading: HeadingAndTime): void {
    try {
      if (!this.previousHeading)
        return;

      // disabling speed compensation if we're truly stopped
      let speedMps = 1;
      if (this.sensorLocation.getSpeedMps() > 0.01)
        speedMps = this.sensorLocation.getSpeedMps();

      let timeDeltaSeconds = (heading.time - this.previousHeading.time) / 1000;
      let rawRotationRate = this.getGetRotationAmount(heading.heading, this.previousHeading.heading) / timeDeltaSeconds;

      let filteredRotationRate = this.filter.process(rawRotationRate, heading.time);
      let command: number;
      if (this.tuner) {
        command = this.tuner.sensorValueUpdated(filteredRotationRate, heading.time);
      } else {
        let maxRotationRate = UnitConverter.ktToMps(this.configService.config.maxTurnRateDegreesPerSecondPerKt) * speedMps;
        let limitedDesired = Math.min(this.desired, maxRotationRate);
        limitedDesired = Math.max(limitedDesired, -maxRotationRate);
        let error = filteredRotationRate - limitedDesired;

        let speedMultiplier = 1;
        if (this.configService.config.rotationTuneSpeedKts)
          speedMultiplier = UnitConverter.ktToMps(this.configService.config.rotationTuneSpeedKts) / speedMps;

        command = this.pidController.update(error * speedMultiplier, heading.time);
        this.pidController.saturationReached = Math.abs(command) >= 1;
        command = Math.max(command, -1)
        command = Math.min(command, 1)

        if (this.enabled)
          this.motorService.command(command);
      }


      let logData = new ControllerRotationRateLogData(
        this.desired,
        filteredRotationRate,
        this.deviceSelectService.mockBoat.rotationRateReal(),
        command,
      )

      this.dataLog.logControllerRotationRate(logData);
    } finally {
      this.previousHeading = heading;
    }

  }


  private getFilter(): Filter {
    return new LowPassFilter({ getCutoffFrequency: () => this.configService.config.rotationLowPassFrequency });
  }


  private finalizePidTune(): void {
    this.motorService.command(0);
    this.tuner = undefined;
  }


  cancelPidTune(): void {
    this.finalizePidTune();
    this.pidTuneComplete.next({
      success: false,
      description: "PID Tuning Canceled",
      suggestedValues: undefined,
    })
  }


  private pidTuneSuccess(suggestedPidValues: PidTuningSuggestedValues): void {
    let tuningMethod = suggestedPidValues.p;
    this.configService.config.rotationKp = +tuningMethod.kP.toPrecision(4);
    this.configService.config.rotationKi = +tuningMethod.kI.toPrecision(4);
    this.configService.config.rotationKd = +tuningMethod.kD.toPrecision(4);
    this.configService.config.rotationTuneSpeedKts = +UnitConverter
      .mpsToKts(this.sensorLocation.getSpeedMps())
      .toPrecision(3);

    let configValues = PidTuneSaver.convert(suggestedPidValues,
      this.configService.config.rotationLowPassFrequency,
      this.configService.config.rotationPidDerivativeLowPassFrequency)
      .map(singleConfig => {
        let cast = (singleConfig as RotationControllerConfig);
        cast.rotationTuneSpeedMps = +this.sensorLocation.getSpeedMps().toPrecision(3);
        return cast;
      })

    let existing = this.configService.config.rotationConfigs || []
    this.configService.config.rotationConfigs = [...configValues, ...existing]

    this.command(0);
  }


  async startPidTune(): Promise<TuningResult> {
    let tuneConfig = new TuneConfig();
    this.desired = 0;
    tuneConfig.setPoint = 0;
    tuneConfig.step = 1;
    tuneConfig.maxCycleCount = 20;
    tuneConfig.noiseBand = this.configService.config.rotationTuneNoiseBand;
    tuneConfig.allowedAmplitudeVariance = this.configService.config.rotationTuneAllowedVariance / 100;
    tuneConfig.disableNoiseBandAfterCycle = this.configService.config.rotationTuneDisableNoiseBandCycles;

    this._enabled = false;
    this.tuner = new PidTuner(this.motorService, tuneConfig);
    this.tuner.tuneComplete.subscribe(result => {
      this.finalizePidTune();
      if (result.success)
        this.pidTuneSuccess(result.suggestedValues);
      this.pidTuneComplete.next(result);
    })


    return await firstValueFrom(this.pidTuneComplete);
  }


}
