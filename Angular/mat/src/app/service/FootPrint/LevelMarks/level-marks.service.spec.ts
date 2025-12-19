import { TestBed } from '@angular/core/testing';

import { LevelMarksService } from './level-marks.service';

describe('LevelMarksService', () => {
  let service: LevelMarksService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LevelMarksService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
