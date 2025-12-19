import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ServiceNewsDetailsComponent } from './service-news-details.component';

describe('ServiceNewsDetailsComponent', () => {
  let component: ServiceNewsDetailsComponent;
  let fixture: ComponentFixture<ServiceNewsDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ServiceNewsDetailsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ServiceNewsDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
