import { Injectable } from '@angular/core';
import { instanceToPlain, plainToInstance } from 'class-transformer';
import { PidConfig } from './pid-controller';
import { PidTuningSuggestedValues } from './pid-tuner';
import { UnitConverter } from './unit-converter';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {

  config: AppConfig;

  private readonly KEY = "appConfig"

  constructor() {
    let configPlain = localStorage.getItem(this.KEY);
    if (!configPlain)
      configPlain = "{}"

    this.config = plainToInstance(AppConfig, JSON.parse(configPlain));
  }


  save(): void {
    localStorage.setItem(this.KEY, JSON.stringify(instanceToPlain(this.config)));
  }


  addCurrentOrientationToConfigs(title: string) {
    let cfg = this.config;
    this.config.orientationConfigs.unshift({
      kP: cfg.orientationKp,
      kI: cfg.orientationKi,
      kD: cfg.orientationKd,
      title: title,
      derivativeLowPassFrequency: cfg.orientationPidDerivativeLowPassFrequency,
      lowPassFrequency: cfg.orientationLowPassFrequency,
    })
  }


  addCurrentRotationToConfigs(title: string) {
    let cfg = this.config;
    this.config.rotationConfigs.unshift({
      kP: cfg.rotationKp,
      kI: cfg.rotationKi,
      kD: cfg.rotationKd,
      title: title,
      derivativeLowPassFrequency: cfg.rotationPidDerivativeLowPassFrequency,
      lowPassFrequency: cfg.rotationLowPassFrequency,
      rotationTuneSpeedMps: UnitConverter.ktToMps(cfg.rotationTuneSpeedKts),
    })
  }

}


export class AppConfig {
  simulation = false;
  simulationSpeedKt = 3;
  simulationNoiseAmplitude = 0.01;

  rotationKp = 0;
  rotationKi = 0;
  rotationKd = 0;
  rotationPidDerivativeLowPassFrequency = 1 / 10;
  rotationLowPassFrequency = 1 / 8;
  rotationTuneSpeedKts: number;
  rotationTuneNoiseBand = 1;
  rotationTuneAllowedVariance = 10;
  rotationTuneDisableNoiseBandCycles = 2;
  rotationConfigs: RotationControllerConfig[] = [];
  maxTurnRateDegreesPerSecondPerKt = 4;


  orientationKp = 0;
  orientationKi = 0;
  orientationKd = 0;
  orientationPidDerivativeLowPassFrequency = 1;
  orientationLowPassFrequency = 1;
  orientationTuneNoiseBand = 0.5;
  orientationTuneAllowedVariance = 10;
  orientationTuneDisableNoiseBandCycles = 2;
  orientationConfigs: ControllerConfig[] = [];


  showGraphRotation = false;
  showGraphOrientation = false;
  showGraphDistanceFromLine = false;
  showGraphGps = false;
}


export interface ControllerConfig {
  kP: number;
  kI: number;
  kD: number;
  title: string;
  derivativeLowPassFrequency: number;
  lowPassFrequency: number;
}


export interface RotationControllerConfig extends ControllerConfig {
  rotationTuneSpeedMps: number;
}


export class PidTuneSaver {
  static convert(tunerResults: PidTuningSuggestedValues, lowPassFrequency: number, derivativeLowPassFrequency: number): ControllerConfig[] {
    return [
      this.convertSingle(tunerResults.p, `Auto Tune - P - ${new Date().toLocaleString()}`, lowPassFrequency, derivativeLowPassFrequency),
      this.convertSingle(tunerResults.pi, `Auto Tune - PI - ${new Date().toLocaleString()}`, lowPassFrequency, derivativeLowPassFrequency),
      this.convertSingle(tunerResults.pd, `Auto Tune - PD - ${new Date().toLocaleString()}`, lowPassFrequency, derivativeLowPassFrequency),
      this.convertSingle(tunerResults.pid, `Auto Tune - PID - ${new Date().toLocaleString()}`, lowPassFrequency, derivativeLowPassFrequency),
      this.convertSingle(tunerResults.noOvershoot, `Auto Tune - "N. OS" - ${new Date().toLocaleString()}`, lowPassFrequency, derivativeLowPassFrequency),
      this.convertSingle(tunerResults.pessen, `Auto Tune - Pessen - ${new Date().toLocaleString()}`, lowPassFrequency, derivativeLowPassFrequency),
      this.convertSingle(tunerResults.someOvershoot, `Auto Tune - S. OS - ${new Date().toLocaleString()}`, lowPassFrequency, derivativeLowPassFrequency),
    ];
  }


  static convertSingle(config: PidConfig, title: string, lowPassFrequency: number, derivativeLowPassFrequency: number): ControllerConfig {
    return {
      kP: +config.kP.toPrecision(4),
      kI: +config.kI.toPrecision(4),
      kD: +config.kD.toPrecision(4),
      title: title,
      derivativeLowPassFrequency: derivativeLowPassFrequency,
      lowPassFrequency: lowPassFrequency,
    };
  }
}
