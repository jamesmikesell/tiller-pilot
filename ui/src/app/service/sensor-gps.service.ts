import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { LocationHistorySpeedTracker } from './location-history-speed-calculator';

@Injectable({
  providedIn: 'root'
})
export class SensorGpsService {

  desired = 0;
  currentHeading = 0
  update = new Subject<void>();
  latitude = 0;
  longitude = 0;

  private speedKt = 0;
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
    this.speedKt = this.speedTracker.getSpeedInKtsFromHistory();

    this.update.next();
  }


  getSpeedKt(): number {
    return this.speedKt;
  }

  getError(): number {
    let error = this.currentHeading - this.desired;
    if (error > 180)
      return error - 360;
    if (error < -180)
      return error + 360;

    return error;
  }

}
