import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PidControllerService {

  get kP(): number { return this._kP; }
  set kP(val: number) {
    this._kP = val;
    this.updateLocalStorage();
    this.reset()
  }
  get kI(): number { return this._kI; }
  set kI(val: number) {
    this._kI = val;
    this.updateLocalStorage();
    this.reset()
  }
  get kD(): number { return this._kD; }
  set kD(val: number) {
    this._kD = val;
    this.updateLocalStorage();
    this.reset()
  }
  saturationReached = false;

  private _kP = 1;
  private _kI = 1;
  private _kD = 1;
  private target = 0;
  private integral = 0;
  private previousError = 0;
  private lastUpdate = Date.now();
  private previousOutput = 0;


  constructor() {
    let pidP = localStorage.getItem(LocalStorageKeys.pidP);
    let pidI = localStorage.getItem(LocalStorageKeys.pidI);
    let pidD = localStorage.getItem(LocalStorageKeys.pidD);

    if (pidP != null)
      this._kP = +pidP;
    if (pidI != null)
      this._kI = +pidI;
    if (pidD != null)
      this._kD = +pidD;
  }


  private updateLocalStorage(): void {
    localStorage.setItem(LocalStorageKeys.pidP, this._kP.toString());
    localStorage.setItem(LocalStorageKeys.pidI, this._kI.toString());
    localStorage.setItem(LocalStorageKeys.pidD, this._kD.toString());
  }


  setTarget(target: number): void {
    this.target = target;
    this.reset();
  }

  update(currentValue: number): number {
    let dt = (Date.now() - this.lastUpdate) / 1000;
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
    const derivative = this.kD * (error - this.previousError) / dt;

    const output = proportional + integral + derivative;
    this.previousOutput = output;
    // Update previous error for the next iteration
    this.previousError = error;

    this.lastUpdate = Date.now();

    return output;
  }

  reset(): void {
    this.integral = 0;
    this.previousError = 0;
    this.lastUpdate = Date.now();
  }
}



enum LocalStorageKeys {
  pidP = "pidP",
  pidI = "pidI",
  pidD = "pidD",
}
