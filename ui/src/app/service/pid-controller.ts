import { Filter, NotAFilter } from "./filter";

export class PidController {
  saturationReached = false;
  config: PidConfig;

  private target = 0;
  private integral = 0;
  private previousError = 0;
  private lastUpdate = performance.now();
  private previousOutput = 0;
  private derivativeFilter: Filter;

  constructor(config: PidConfig, derivativeFilter = new NotAFilter()) {
    this.config = config;
    this.derivativeFilter = derivativeFilter;
  }


  setTarget(target: number): void {
    this.target = target;
  }

  update(currentValue: number, time: number): number {
    let dt = (time - this.lastUpdate) / 1000;
    const error = this.target - currentValue;

    // Proportional term
    const proportional = this.config.kP * error;

    // Integral term
    let errorAndPreviousOutputSameSign = error * this.previousOutput > 0;
    // clamp integration if saturation is reached and the sign of the last output is the same as the current error to prevent windup
    if (!this.saturationReached || !errorAndPreviousOutputSameSign)
      this.integral += error * dt;
    const integral = this.config.kI * this.integral;

    // Derivative term
    const derivative = this.config.kD * this.derivativeFilter.process(error - this.previousError, time) / dt;

    const output = proportional + integral + derivative;
    this.previousOutput = output;
    // Update previous error for the next iteration
    this.previousError = error;

    this.lastUpdate = time;

    return output;
  }

}

export interface PidConfig {
  kP: number;
  kI: number;
  kD: number;
}
