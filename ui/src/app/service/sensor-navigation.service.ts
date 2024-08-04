
export class SensorNavigationService {

  private static readonly EARTH_RADIUS_METERS = 6371e3;


  static calculateDistanceFromLineMeters(
    latitudeStart: number,
    longitudeStart: number,
    headingDegrees: number,
    latitudeCurrent: number,
    longitudeCurrent: number
  ): number {
    // Convert degrees to radians
    const latitudeStartRad = SensorNavigationService.toRadians(latitudeStart);
    const longitudeStartRad = SensorNavigationService.toRadians(longitudeStart);
    const latitudeCurrentRad = SensorNavigationService.toRadians(latitudeCurrent);
    const longitudeCurrentRad = SensorNavigationService.toRadians(longitudeCurrent);
    const headingRad = SensorNavigationService.toRadians(headingDegrees);

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
    const deltaLatitude = latitudeCurrentRad - latitudeStartRad;
    const a =
      Math.sin(deltaLatitude / 2) * Math.sin(deltaLatitude / 2) +
      Math.cos(latitudeStartRad) *
      Math.cos(latitudeCurrentRad) *
      Math.sin(deltaLongitude / 2) *
      Math.sin(deltaLongitude / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = SensorNavigationService.EARTH_RADIUS_METERS * c;

    // Calculate perpendicular distance from the line to the current point
    const perpendicularDistance = distance * Math.sin(bearingDifference);

    return perpendicularDistance; // Distance in kilometers
  }


  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }



  static haversineDistanceInMeters(location1: Location, location2: Location) {
    const lat1 = this.toRadians(location1.latitude);
    const lon1 = this.toRadians(location1.longitude);
    const lat2 = this.toRadians(location2.latitude);
    const lon2 = this.toRadians(location2.longitude);

    const dLat = lat2 - lat1;
    const dLon = lon2 - lon1;

    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = SensorNavigationService.EARTH_RADIUS_METERS * c;
    return distance;
  }

}


interface Location {
  latitude: number;
  longitude: number;
}