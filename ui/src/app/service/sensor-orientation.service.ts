import { HostListener, Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SensorOrientationService {

  current = 0
  update = new Subject<void>();

  private lastUpdateTime = Date.now();

  constructor() {
    window.addEventListener('deviceorientationabsolute', (eventData) => this.orientationChanged(eventData as any));
  }

  orientationChanged(event: DeviceOrientationEvent): void {
    if (Date.now() - this.lastUpdateTime > 200 && event.absolute) {
      this.lastUpdateTime = Date.now();
      this.current = event.alpha;
      this.update.next();
    }
  }

}
