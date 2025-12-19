import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VolumeSplashComponent } from './volume-splash.component';

describe('VolumeSplashComponent', () => {
  let component: VolumeSplashComponent;
  let fixture: ComponentFixture<VolumeSplashComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VolumeSplashComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(VolumeSplashComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
