import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TotalVolumeComponent } from './total-volume.component';

describe('TotalVolumeComponent', () => {
  let component: TotalVolumeComponent;
  let fixture: ComponentFixture<TotalVolumeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TotalVolumeComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TotalVolumeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
