import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { LevelMarksService } from './level-marks.service';

describe('LevelMarksService', () => {
  let service: LevelMarksService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    service = TestBed.inject(LevelMarksService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
