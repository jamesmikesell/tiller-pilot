import { TestBed } from '@angular/core/testing';

import { HeadingGpsService } from './heading-gps.service';

describe('HeadingGpsService', () => {
  let service: HeadingGpsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(HeadingGpsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('turn right 1', () => {
    service.current = 350;
    service.desired = 10;
    expect(service.getError()).toEqual(-20);
  });

  it('turn right 2', () => {
    service.current = 10;
    service.desired = 30;
    expect(service.getError()).toEqual(-20);
  });

  it('turn right 3', () => {
    service.current = 270;
    service.desired = 290;
    expect(service.getError()).toEqual(-20);
  });

  it('turn right 4', () => {
    service.current = 170;
    service.desired = 190;
    expect(service.getError()).toEqual(-20);
  });




  it('turn left 1', () => {
    service.current = 10;
    service.desired = 350;
    expect(service.getError()).toEqual(20);
  });

  it('turn left 2', () => {
    service.current = 30;
    service.desired = 10;
    expect(service.getError()).toEqual(20);
  });

  it('turn left 3', () => {
    service.current = 290;
    service.desired = 270;
    expect(service.getError()).toEqual(20);
  });

  it('turn left 3', () => {
    service.current = 190;
    service.desired = 170;
    expect(service.getError()).toEqual(20);
  });

});
