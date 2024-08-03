import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { SensorNavigationService } from './sensor-navigation.service';

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
  private locationHistory = new Map<string, LocationHistory>();

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
    this.tryAddLocationToHistory(locationData);
    this.speedKt = this.getSpeedInKtsFromHistory();

    this.update.next();
  }


  private tryAddLocationToHistory(locationData: GeolocationPosition) {
    let locationItem = new LocationHistory(locationData.coords.latitude,
      locationData.coords.longitude,
      new Date(locationData.timestamp)
    )
    let key = this.getKey(locationItem);
    if (this.locationHistory.has(key)) {
      console.log("already have location history");
      return;
    }


    let maxHistoryItems = 10;
    if (this.locationHistory.size >= maxHistoryItems) {
      // oldest first
      let newest = [...this.locationHistory.values()]
        .sort((a, b) => b.time.getTime() - a.time.getTime())
        .slice(0, maxHistoryItems - 1)

      this.locationHistory.clear();
      newest.forEach(single => {
        let tempKey = this.getKey(single);
        this.locationHistory.set(tempKey, single);
      })
    }

    this.locationHistory.set(key, locationItem);
  }


  private getSpeedInKtsFromHistory(): number {
    if (this.locationHistory.size < 2)
      return 0;

    let newestFirst = [...this.locationHistory.values()]
      .sort((a, b) => b.time.getTime() - a.time.getTime())

    let newest = newestFirst[0];
    let oldest = newestFirst[newestFirst.length - 1];
    let distanceMeters = SensorNavigationService.haversineDistanceInMeters(newest.latitude,
      newest.longitude,
      oldest.latitude,
      oldest.longitude
    )

    let timeInMs = newest.time.getTime() - oldest.time.getTime();
    let speedMetersPerSec = distanceMeters / (timeInMs / 1000);
    return speedMetersPerSec * 1.94384;
  }


  private getKey(locationData: LocationHistory): string {
    return `${locationData.latitude}_${locationData.longitude}`
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

class LocationHistory {
  constructor(
    public latitude: number,
    public longitude: number,
    public time: Date,
  ) { }
}