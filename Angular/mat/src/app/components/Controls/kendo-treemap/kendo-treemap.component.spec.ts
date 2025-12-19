import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KendoTreemapComponent } from './kendo-treemap.component';

describe('KendoTreemapComponent', () => {
  let component: KendoTreemapComponent;
  let fixture: ComponentFixture<KendoTreemapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KendoTreemapComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(KendoTreemapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
