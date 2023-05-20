import { TestBed } from '@angular/core/testing';

import { SensorNavigationService } from './sensor-navigation.service';

describe('SensorNavigationService', () => {
  let service: SensorNavigationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SensorNavigationService);
  });

  const latitudeStart = 41.890074;
  const longitudeStart = 12.492374;
  const headingDegrees = 45;



  it('SE and close', () => {
    const latitudeCurrent = 41.893676;
    const longitudeCurrent = 12.498112;

    expect(service.calculateDistanceFromLine(
      latitudeStart,
      longitudeStart,
      headingDegrees,
      latitudeCurrent,
      longitudeCurrent
    )).toBeCloseTo(-0.052612, 4);
  });


  it('NW and close', () => {
    const latitudeCurrent = 41.913454;
    const longitudeCurrent = 12.521008;

    expect(service.calculateDistanceFromLine(
      latitudeStart,
      longitudeStart,
      headingDegrees,
      latitudeCurrent,
      longitudeCurrent
    )).toBeCloseTo(0.16318415, 4);
  });


  it('SE and close', () => {
    const latitudeCurrent = 41.834777;
    const longitudeCurrent = 12.423430;

    expect(service.calculateDistanceFromLine(
      latitudeStart,
      longitudeStart,
      headingDegrees,
      latitudeCurrent,
      longitudeCurrent
    )).toBeCloseTo(-0.30728, 4);
  });


  it('SE and far', () => {
    const latitudeCurrent = 41.826685;
    const longitudeCurrent = 12.594337;

    expect(service.calculateDistanceFromLine(
      latitudeStart,
      longitudeStart,
      headingDegrees,
      latitudeCurrent,
      longitudeCurrent
    )).toBeCloseTo(-10.95452033, 4);
  });


  it('NW and far', () => {
    const latitudeCurrent = 41.942913;
    const longitudeCurrent = 12.458052;

    expect(service.calculateDistanceFromLine(
      latitudeStart,
      longitudeStart,
      headingDegrees,
      latitudeCurrent,
      longitudeCurrent
    )).toBeCloseTo(6.1622247, 4);
  });



});
