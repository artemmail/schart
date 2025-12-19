import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VolumeSearchTableComponent } from './volume-search-table.component';

describe('VolumeSearchTableComponent', () => {
  let component: VolumeSearchTableComponent;
  let fixture: ComponentFixture<VolumeSearchTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VolumeSearchTableComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(VolumeSearchTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
