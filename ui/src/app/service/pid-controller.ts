import { Filter, NotAFilter } from "./filter";

export class PidController {
  kP: number;
  kI: number;
  kD: number;

  saturationReached = false;

  private target = 0;
  private integral = 0;
  private previousError = 0;
  private lastUpdate = performance.now();
  private previousOutput = 0;
  private derivativeFilter: Filter;

  constructor(kP: number, kI: number, kD: number, derivativeFilter = new NotAFilter()) {
    this.kP = kP;
    this.kI = kI;
    this.kD = kD;
    this.derivativeFilter = derivativeFilter;
  }


  setTarget(target: number): void {
    this.target = target;
  }

  update(currentValue: number, time: number): number {
    let dt = (time - this.lastUpdate) / 1000;
    const error = this.target - currentValue;

    // Proportional term
    const proportional = this.kP * error;

    // Integral term
    let errorAndPreviousOutputSameSign = error * this.previousOutput > 0;
    // clamp integration if saturation is reached and the sign of the last output is the same as the current error to prevent windup
    if (!this.saturationReached || !errorAndPreviousOutputSameSign) 
      this.integral += error * dt;
    const integral = this.kI * this.integral;

    // Derivative term
    const derivative = this.kD * this.derivativeFilter.process(error - this.previousError, time) / dt;

    const output = proportional + integral + derivative;
    this.previousOutput = output;
    // Update previous error for the next iteration
    this.previousError = error;

    this.lastUpdate = time;

    return output;
  }

}

