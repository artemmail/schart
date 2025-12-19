import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfitChartsComponent } from './profit-charts.component';

describe('ProfitChartsComponent', () => {
  let component: ProfitChartsComponent;
  let fixture: ComponentFixture<ProfitChartsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfitChartsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProfitChartsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
