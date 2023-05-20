import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class HeadingCompassService {

  desired = 0;
  current = 0
  update = new Subject<void>();

  constructor() {
    window.addEventListener('deviceorientation', (eventData) => this.orientationChanged(eventData));
  }

  private orientationChanged(event: DeviceOrientationEvent): void {
    this.current = event.alpha;
    this.update.next();
  }

  getError(): number {
    let error = this.current - this.desired;
    if (error > 180)
      error = error - 360;
    if (error < -180)
      error = error + 360;

    return -error;
  }

}
