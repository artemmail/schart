import { TestBed } from '@angular/core/testing';

import { ClusterStreamService } from './cluster-stream.service';

describe('ClusterStreamService', () => {
  let service: ClusterStreamService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ClusterStreamService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
