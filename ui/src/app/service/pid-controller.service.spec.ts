import { TestBed } from '@angular/core/testing';

import { PidControllerService } from './pid-controller.service';

describe('PidControllerService', () => {
  let service: PidControllerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PidControllerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
