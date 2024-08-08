import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { LocationHistorySpeedTracker } from './location-history-speed-calculator';

@Injectable({
  providedIn: 'root'
})
export class SensorGpsService implements SpeedSensor {

  desired = 0;
  currentHeading = 0
  update = new Subject<void>();
  latitude = 0;
  longitude = 0;

  private speedMps = 0;
  private speedTracker = new LocationHistorySpeedTracker();

  constructor() {
    navigator.geolocation.watchPosition((data) => this.locationChange(data), null, { enableHighAccuracy: true });
  }


  private locationChange(locationData: GeolocationPosition): void {
    let heading = locationData.coords.heading;
    if (heading != null)
      this.currentHeading = heading;

    this.latitude = locationData.coords.latitude;
    this.longitude = locationData.coords.longitude;

    this.speedTracker.tryAddLocationToHistory(locationData);
    this.speedMps = this.speedTracker.getSpeedMpsFromHistory();

    this.update.next();
  }


  getSpeedMps(): number {
    return this.speedMps;
  }

}

export interface SpeedSensor {
  getSpeedMps(): number
}
