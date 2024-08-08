
import { CoordinateUtils } from './coordinate-utils';

describe('SensorNavigationService', () => {

  const latitudeStart = 41.890074;
  const longitudeStart = 12.492374;
  const headingDegrees = 45;



  it('SE and close', () => {
    const latitudeCurrent = 41.893676;
    const longitudeCurrent = 12.498112;

    expect(CoordinateUtils.calculateDistanceFromLineMeters(
      latitudeStart,
      longitudeStart,
      headingDegrees,
      latitudeCurrent,
      longitudeCurrent
    )).toBeCloseTo(-53, 0);
  });


  it('NW and close', () => {
    const latitudeCurrent = 41.913454;
    const longitudeCurrent = 12.521008;

    expect(CoordinateUtils.calculateDistanceFromLineMeters(
      latitudeStart,
      longitudeStart,
      headingDegrees,
      latitudeCurrent,
      longitudeCurrent
    )).toBeCloseTo(163, 0);
  });


  it('SE and close', () => {
    const latitudeCurrent = 41.834777;
    const longitudeCurrent = 12.423430;

    expect(CoordinateUtils.calculateDistanceFromLineMeters(
      latitudeStart,
      longitudeStart,
      headingDegrees,
      latitudeCurrent,
      longitudeCurrent
    )).toBeCloseTo(-307, 0);
  });


  it('SE and far', () => {
    const latitudeCurrent = 41.826685;
    const longitudeCurrent = 12.594337;

    expect(CoordinateUtils.calculateDistanceFromLineMeters(
      latitudeStart,
      longitudeStart,
      headingDegrees,
      latitudeCurrent,
      longitudeCurrent
    )).toBeCloseTo(-10955, 0);
  });


  it('NW and far', () => {
    const latitudeCurrent = 41.942913;
    const longitudeCurrent = 12.458052;

    expect(CoordinateUtils.calculateDistanceFromLineMeters(
      latitudeStart,
      longitudeStart,
      headingDegrees,
      latitudeCurrent,
      longitudeCurrent
    )).toBeCloseTo(6162, 0);
  });



  it('calculate coordinate at distance and angle from location', () => {
    let start = {
      latitude: 40.1,
      longitude: 37.2,
    }

    let position2 = CoordinateUtils.calculateNewPosition(start, 1, 30);
    let distance = CoordinateUtils.haversineDistanceInMeters(start, position2);

    expect(distance).toBeCloseTo(1, 5);
  });


});
