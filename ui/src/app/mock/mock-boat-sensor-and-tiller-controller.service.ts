import { Injectable } from "@angular/core";
import { BehaviorSubject, Subject, timer } from "rxjs";
import { Controller } from "../service/controller";



@Injectable({
  providedIn: 'root'
})
export class MockBoatSensorAndTillerController implements Controller {


  tillerAngle = 0;
  update = new Subject<void>();
  connected = new BehaviorSubject<boolean>(true);
  enabled = false;
  get headingCurrentWithoutError(): number { return this.moveQueue[0].real }
  get current(): number { return this.moveQueue[0].withNoise; }
  get currentMotorPower(): number { return this.tillerGainDegreesPerSecond / this.tillerPowerCoefficient };
  speedKt = 3;

  private moveQueue: SensorWithNoise[] = [new SensorWithNoise(0, 0, 0), new SensorWithNoise(0, 0, 1)];
  // private noiseAmplitude = .01;
  private noiseAmplitude = 0;
  private tillerGainDegreesPerSecond = 0;
  private nextTillerDegreesPerSecond = 0;
  private tillerPowerCoefficient = 0.2;
  private previousTime: number;


  constructor(
  ) {
    setTimeout(() => {
      this.connected.next(true);
    }, 1000);

    // This simulates how the we only send control updates to the bluetooth motor every 200ms
    timer(0, 200)
      .subscribe(() => {
        this.tillerGainDegreesPerSecond = this.nextTillerDegreesPerSecond;
      });

    timer(0, 50)
      .subscribe(() => {
        const now = performance.now();
        if (!this.previousTime) {
          this.previousTime = now;
          return;
        }

        const dt = now - this.previousTime;
        this.tillerAngle += this.tillerGainDegreesPerSecond * (dt / 1000);

        let current = this.moveQueue[this.moveQueue.length - 1].real;
        current -= this.tillerAngle * (dt / 1000) * this.speedKt;
        current = current % 360;
        if (current < 0)
          current = 360 + current;

        const headingWithNoise = current + (Math.random() - 0.5) * this.noiseAmplitude;
        this.moveQueue.push(new SensorWithNoise(current, headingWithNoise, now));
        if (this.moveQueue.length > 5) {
          this.moveQueue.shift();
        }

        this.previousTime = now;
        this.update.next();
      })


  }




  private getGetRotationAmount(currentAngle: number, previousAngle: number): number {
    let delta = currentAngle - previousAngle;
    if (delta > 180)
      delta = delta - 360;
    if (delta < -180)
      delta = delta + 360;

    return -delta;
  }


  rotationRateReal(): number {
    let end = this.moveQueue[this.moveQueue.length - 1];
    let start = this.moveQueue[this.moveQueue.length - 2];
    let rotation = this.getGetRotationAmount(end.real, start.real);
    return rotation / ((end.time - start.time) / 1000);
  }


  command(level: number): void {
    this.nextTillerDegreesPerSecond = level * 0.2;
  }


  stop(): void {
    this.nextTillerDegreesPerSecond = 0;
  }


  connect(): void {
    this.connected.next(true);
  }

}


class SensorWithNoise {
  constructor(
    public real: number,
    public withNoise: number,
    public time: number,
  ) { }
}
