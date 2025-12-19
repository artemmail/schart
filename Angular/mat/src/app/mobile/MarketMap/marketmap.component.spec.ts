import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MarketMapComponent } from './marketmap.component';

describe('HomeComponent', () => {
  let component: MarketMapComponent;
  let fixture: ComponentFixture<MarketMapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MarketMapComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(MarketMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
