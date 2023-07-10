import { Injectable } from '@angular/core';
import { classToPlain, instanceToPlain, plainToClass, plainToInstance } from 'class-transformer';

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
  rotationTuneSpeed: number;
  rotationTuneNoiseBand = 1;
  rotationTuneAllowedVariance = 10;
  rotationTuneDisableNoiseBandCycles = 2;
  
  orientationKp = 0;
  orientationKi = 0;
  orientationKd = 0;
  orientationPidDerivativeLowPassFrequency = 1;
  orientationLowPassFrequency = 1;
  orientationTuneSpeed: number;
  orientationTuneNoiseBand = 0.5;
  orientationTuneAllowedVariance = 10;
  orientationTuneDisableNoiseBandCycles = 2;

  maxTurnRateDegreesPerSecondPerKt = 4;

  showGraphRotation = false;
  showGraphOrientation = false;
  showGraphDistanceFromLine = false;
  showGraphGps = false;
}
