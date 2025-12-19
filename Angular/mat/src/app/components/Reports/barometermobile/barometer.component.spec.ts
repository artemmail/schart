import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BarometerComponent } from './barometer.component';

describe('BarometerComponent', () => {
  let component: BarometerComponent;
  let fixture: ComponentFixture<BarometerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BarometerComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(BarometerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
