import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OpenPositionsTableComponent } from './open-positions-table.component';

describe('OpenPositionsTableComponent', () => {
  let component: OpenPositionsTableComponent;
  let fixture: ComponentFixture<OpenPositionsTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OpenPositionsTableComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OpenPositionsTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
