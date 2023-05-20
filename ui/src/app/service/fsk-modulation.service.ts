import { Injectable } from '@angular/core';
import { BehaviorSubject, Subscription, timer } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FskModulationService {
  pulseState = new BehaviorSubject<boolean>(false);


  private readonly minTimeBetweenStateChangeMs = 250;
  private impulseTimeMs = this.minTimeBetweenStateChangeMs;
  private readonly maxTimeMs = 60 * 1000;
  private lastOff: number;
  private nextPulseSubscription: Subscription;
  private totalTime: number;

  constructor() { }


  setPowerPercent(powerLevel: number): void {
    powerLevel = Math.min(powerLevel, 1);
    powerLevel = Math.max(powerLevel, 0);

    if (powerLevel === 0) {
      this.totalTime = undefined;
      this.unsubscribe();

      return;
    }

    this.totalTime = this.minTimeBetweenStateChangeMs / powerLevel;
    this.totalTime = Math.min(this.totalTime, this.maxTimeMs);
    let minTimeWindow = this.minTimeBetweenStateChangeMs * 2;
    if (this.totalTime < minTimeWindow) {
      // .75... 250/333
      //        375/500
      // .99... 250/252
      //        x/(x+w) = p
      //250 = w
      //x=p*(x+w)
      //x = px+pw
      //0 = px+pw-x
      //-pw=px-x
      //-pw=x(p-1)
      //-pw/(p-1)=x
      //
      // w = 250
      // x = (-.99 * 250)/(.99 - 1)
      // x= 24750
      // 24750/(24750+250)

      this.impulseTimeMs = (-powerLevel * this.minTimeBetweenStateChangeMs) / (powerLevel - 1);
      this.totalTime = 250 + this.impulseTimeMs;;

    } else {
      this.impulseTimeMs = this.minTimeBetweenStateChangeMs;
    }


    if (!this.lastOff) {
      this.pulse();
    } else {
      let offTime = this.totalTime - this.impulseTimeMs;
      let sinceLastOff = Date.now() - this.lastOff;
      if (offTime < sinceLastOff && this.nextPulseSubscription) {
        this.unsubscribe()
        this.pulse();
      }
    }
  }

  private unsubscribe(): void {
    if (this.nextPulseSubscription && !this.nextPulseSubscription.closed)
      this.nextPulseSubscription.unsubscribe();
  }

  private pulse(): void {
    if (!this.pulseState.value) {
      this.pulseState.next(true);
      timer(this.impulseTimeMs).subscribe(() => {
        this.pulseState.next(false);
        this.lastOff = Date.now();

        if (this.totalTime) {
          let offTime = this.totalTime - this.impulseTimeMs;
          this.nextPulseSubscription = timer(offTime).subscribe(() => {
            this.pulse();
          });
        }
      });
    }
  }

}
