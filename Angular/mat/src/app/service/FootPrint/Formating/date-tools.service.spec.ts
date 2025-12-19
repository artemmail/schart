import { TestBed } from '@angular/core/testing';

import { DateToolsService } from './date-tools.service';

describe('DateToolsService', () => {
  let service: DateToolsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DateToolsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
