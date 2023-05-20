import { ChainedFilter, Filter, LowPassFilter, NotAFilter } from "./filter";

export class PidController {
  get kP(): number { return this._kP; }
  set kP(val: number) {
    this._kP = val;
    this.reset()
  }
  get kI(): number { return this._kI; }
  set kI(val: number) {
    this._kI = val;
    this.reset()
  }
  get kD(): number { return this._kD; }
  set kD(val: number) {
    this._kD = val;
    this.reset()
  }

  saturationReached = false;

  private _kP: number;
  private _kI: number;
  private _kD: number;
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
    this.reset();
  }

  update(currentValue: number): number {
    const now = performance.now();
    let dt = (now - this.lastUpdate) / 1000;
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
    const derivative = this.kD * this.derivativeFilter.process(error - this.previousError) / dt;

    const output = proportional + integral + derivative;
    this.previousOutput = output;
    // Update previous error for the next iteration
    this.previousError = error;

    this.lastUpdate = now;

    return output;
  }

  reset(): void {
    // this.integral = 0;
    // this.previousError = 0;
    // this.lastUpdate = performance.now();
  }
}

