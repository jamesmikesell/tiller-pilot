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
  private locationHistory: LocationHistory[] = [];

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
    const minAccuracyMeters = 7;
    if (locationData.coords.accuracy > minAccuracyMeters) {
      console.log(`GPS accuracy ${locationData.coords.accuracy.toFixed(1)} is above ${minAccuracyMeters} meters, ignoring location`);
      return;
    }

    let currentLocation = new LocationHistory(locationData.coords.latitude,
      locationData.coords.longitude,
      new Date(locationData.timestamp)
    )

    if (this.locationHistory.length > 0) {
      let distanceFromOldest = SensorNavigationService.haversineDistanceInMeters(this.locationHistory[0], currentLocation);
      if (distanceFromOldest < minAccuracyMeters) {
        // add or update the current location so there are at least 2 items in the the array (the oldest and the current)
        if (this.locationHistory.length === 1)
          this.locationHistory.push(currentLocation);
        else if (this.locationHistory.length > 1)
          this.locationHistory[this.locationHistory.length - 1] = currentLocation;

        return;
      }
    }

    // only keep the most recent location history
    this.locationHistory = this.locationHistory.slice(-1)
    this.locationHistory.push(currentLocation);
  }


  private getSpeedInKtsFromHistory(): number {
    if (this.locationHistory.length < 2)
      return 0;

    let oldest = this.locationHistory[0];
    let newest = this.locationHistory[this.locationHistory.length - 1];
    let distanceMeters = SensorNavigationService.haversineDistanceInMeters(newest, oldest);

    let timeInMs = newest.time.getTime() - oldest.time.getTime();
    let speedMetersPerSec = distanceMeters / (timeInMs / 1000);
    return speedMetersPerSec * 1.94384;
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