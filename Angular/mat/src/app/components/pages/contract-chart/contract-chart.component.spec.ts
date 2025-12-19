import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ContractChartComponent } from './contract-chart.component';

describe('ContractChartComponent', () => {
  let component: ContractChartComponent;
  let fixture: ComponentFixture<ContractChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContractChartComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ContractChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
