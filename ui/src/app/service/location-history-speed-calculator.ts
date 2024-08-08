import { CoordinateUtils } from './coordinate-utils';

export class LocationHistorySpeedTracker {

  private locationHistory: LocationHistory[] = [];
  private lastLocation: LocationHistory;


  constructor(private maxHistoriesToKeep = 3) { }


  tryAddLocationToHistory(locationData: LocationData | GeolocationPosition) {
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
      this.lastLocation = currentLocation;
      let currentLocationIsCloseToHistory = this.locationHistory
        .map(single => CoordinateUtils.haversineDistanceInMeters(single, currentLocation))
        .some(singleDistance => singleDistance < minAccuracyMeters)

      if (currentLocationIsCloseToHistory)
        return;
    }

    // only keep the most recent location histories
    this.locationHistory = this.locationHistory.slice(-(this.maxHistoriesToKeep - 1))
    this.locationHistory.push(currentLocation);
  }


  getSpeedMpsFromHistory(): number {
    if (this.locationHistory.length === 0 || !this.lastLocation)
      return 0;

    let oldest = this.locationHistory[0];
    let newest = this.lastLocation;
    let distanceMeters = CoordinateUtils.haversineDistanceInMeters(newest, oldest);

    let timeInMs = newest.time.getTime() - oldest.time.getTime();
    let speedMetersPerSec = distanceMeters / (timeInMs / 1000);
    return speedMetersPerSec;
  }

}


export class LocationHistory {
  constructor(
    public latitude: number,
    public longitude: number,
    public time: Date,
  ) { }
}


interface LocationData {
  coords: {
    accuracy: number;
    latitude: number;
    longitude: number;
  };
  timestamp: number;
}
