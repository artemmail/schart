import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NpmStatChartComponent } from './npm-stat-chart.component';

describe('NpmStatChartComponent', () => {
  let component: NpmStatChartComponent;
  let fixture: ComponentFixture<NpmStatChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NpmStatChartComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(NpmStatChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
