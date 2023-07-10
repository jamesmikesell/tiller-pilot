import { TestBed } from '@angular/core/testing';

import { SensorGpsService } from './sensor-gps.service';

describe('SensorGpsService', () => {
  let service: SensorGpsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SensorGpsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('turn right 1', () => {
    service.currentHeading = 350;
    service.desired = 10;
    expect(service.getError()).toEqual(-20);
  });

  it('turn right 2', () => {
    service.currentHeading = 10;
    service.desired = 30;
    expect(service.getError()).toEqual(-20);
  });

  it('turn right 3', () => {
    service.currentHeading = 270;
    service.desired = 290;
    expect(service.getError()).toEqual(-20);
  });

  it('turn right 4', () => {
    service.currentHeading = 170;
    service.desired = 190;
    expect(service.getError()).toEqual(-20);
  });




  it('turn left 1', () => {
    service.currentHeading = 10;
    service.desired = 350;
    expect(service.getError()).toEqual(20);
  });

  it('turn left 2', () => {
    service.currentHeading = 30;
    service.desired = 10;
    expect(service.getError()).toEqual(20);
  });

  it('turn left 3', () => {
    service.currentHeading = 290;
    service.desired = 270;
    expect(service.getError()).toEqual(20);
  });

  it('turn left 3', () => {
    service.currentHeading = 190;
    service.desired = 170;
    expect(service.getError()).toEqual(20);
  });

});
