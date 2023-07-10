import { HostListener, Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SensorOrientationService {

  heading = new BehaviorSubject<HeadingAndTime>(new HeadingAndTime(0, 0));

  private lastUpdateTime = Date.now();

  constructor() {
    window.addEventListener('deviceorientationabsolute', (eventData) => this.orientationChanged(eventData as any));
  }

  orientationChanged(event: DeviceOrientationEvent): void {
    this.heading.next(new HeadingAndTime(event.timeStamp, event.alpha));
  }

}


export class HeadingAndTime {
  constructor(
    public time: number,
    public heading: number,
  ) { }
}