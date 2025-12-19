import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TickerIconComponent } from './ticker-icon.component';

describe('TickerIconComponent', () => {
  let component: TickerIconComponent;
  let fixture: ComponentFixture<TickerIconComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TickerIconComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TickerIconComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
