import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LeadersReportComponent } from './leaders-report.component';

describe('LeadersReportComponent', () => {
  let component: LeadersReportComponent;
  let fixture: ComponentFixture<LeadersReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LeadersReportComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(LeadersReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
