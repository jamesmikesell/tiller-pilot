import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SensorNavigationService {

  constructor() { }


  calculateDistanceFromLine(
    latitudeStart: number,
    longitudeStart: number,
    headingDegrees: number,
    latitudeCurrent: number,
    longitudeCurrent: number
  ): number {
    // Convert degrees to radians
    const latitudeStartRad = this.toRadians(latitudeStart);
    const longitudeStartRad = this.toRadians(longitudeStart);
    const latitudeCurrentRad = this.toRadians(latitudeCurrent);
    const longitudeCurrentRad = this.toRadians(longitudeCurrent);
    const headingRad = this.toRadians(headingDegrees);

    // Calculate great circle bearing between starting point and current point
    const deltaLongitude = longitudeCurrentRad - longitudeStartRad;
    const y = Math.sin(deltaLongitude) * Math.cos(latitudeCurrentRad);
    const x =
      Math.cos(latitudeStartRad) * Math.sin(latitudeCurrentRad) -
      Math.sin(latitudeStartRad) * Math.cos(latitudeCurrentRad) * Math.cos(deltaLongitude);
    const greatCircleBearing = Math.atan2(y, x);

    // Calculate difference in bearings
    const bearingDifference = headingRad - greatCircleBearing;

    // Calculate distance between starting point and current point
    const earthRadius = 6371; // Earth's radius in kilometers
    const deltaLatitude = latitudeCurrentRad - latitudeStartRad;
    const a =
      Math.sin(deltaLatitude / 2) * Math.sin(deltaLatitude / 2) +
      Math.cos(latitudeStartRad) *
      Math.cos(latitudeCurrentRad) *
      Math.sin(deltaLongitude / 2) *
      Math.sin(deltaLongitude / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = earthRadius * c;

    // Calculate perpendicular distance from the line to the current point
    const perpendicularDistance = distance * Math.sin(bearingDifference);

    return perpendicularDistance; // Distance in kilometers
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }


}
