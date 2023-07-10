import { TestBed } from '@angular/core/testing';

import { PidTuner, Point } from './pid-tuner';

describe('PidTuneService', () => {
  let service: PidTuner;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = new PidTuner(null, null);
  });


  it('should find extrema', () => {
    const points: Point[] = [
      new Point(new Date(2023, 4, 1), 10),
      new Point(new Date(2023, 4, 2), 15),
      new Point(new Date(2023, 4, 3), 12),
      new Point(new Date(2023, 4, 4), 8),
      new Point(new Date(2023, 4, 5), 11),
      new Point(new Date(2023, 4, 6), 16),
    ];

    const extremaPoints = service.findLocalExtrema(points);
    expect(extremaPoints).toHaveSize(2);
    expect(extremaPoints[0]).toBe(points[1]);
    expect(extremaPoints[1]).toBe(points[3]);
  });

  it('should find extrema even if values flatten', () => {
    let i = 1;
    const points: Point[] = [
      new Point(new Date(2023, 4, i++), 10),
      new Point(new Date(2023, 4, i++), 15),
      new Point(new Date(2023, 4, i++), 15),
      new Point(new Date(2023, 4, i++), 15),
      new Point(new Date(2023, 4, i++), 12),
      new Point(new Date(2023, 4, i++), 12),
      new Point(new Date(2023, 4, i++), 12),
      new Point(new Date(2023, 4, i++), 12),
      new Point(new Date(2023, 4, i++), 12),
      new Point(new Date(2023, 4, i++), 8),
      new Point(new Date(2023, 4, i++), 8),
      new Point(new Date(2023, 4, i++), 8),
      new Point(new Date(2023, 4, i++), 8),
      new Point(new Date(2023, 4, i++), 8),
      new Point(new Date(2023, 4, i++), 8),
      new Point(new Date(2023, 4, i++), 11),
      new Point(new Date(2023, 4, i++), 16),
      new Point(new Date(2023, 4, i++), 16),
      new Point(new Date(2023, 4, i++), 16),
      new Point(new Date(2023, 4, i++), 16),
      new Point(new Date(2023, 4, i++), 16),
      new Point(new Date(2023, 4, i++), 18),
      new Point(new Date(2023, 4, i++), 19),
    ];

    const extremaPoints = service.findLocalExtrema(points);
    expect(extremaPoints).toHaveSize(2);
    expect(extremaPoints[0]).toBe(points[2]);
    expect(extremaPoints[1]).toBe(points[12]);
  });

});
