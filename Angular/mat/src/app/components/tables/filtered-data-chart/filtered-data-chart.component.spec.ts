import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FilteredDataChartComponent } from './filtered-data-chart.component';

describe('FilteredDataChartComponent', () => {
  let component: FilteredDataChartComponent;
  let fixture: ComponentFixture<FilteredDataChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FilteredDataChartComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FilteredDataChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
