import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SensorGpsService {

  desired = 0;
  currentHeading = 0
  update = new Subject<void>();
  private speedKt = 0;
  latitude = 0;
  longitude = 0;

  constructor() {
    navigator.geolocation.watchPosition((data) => this.locationChange(data), null, { enableHighAccuracy: true });
  }


  private locationChange(locationData: GeolocationPosition): void {
    let heading = locationData.coords.heading;
    if (heading != null)
      this.currentHeading = heading;

    this.latitude = locationData.coords.latitude;
    this.longitude = locationData.coords.longitude;

    let knotsPerMeterPerSecond = 1.94384;
    this.speedKt = locationData.coords.speed * knotsPerMeterPerSecond;

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
