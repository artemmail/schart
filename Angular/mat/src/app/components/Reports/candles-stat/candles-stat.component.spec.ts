import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CandlesStatComponent } from './candles-stat.component';

describe('CandlesStatComponent', () => {
  let component: CandlesStatComponent;
  let fixture: ComponentFixture<CandlesStatComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CandlesStatComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CandlesStatComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
