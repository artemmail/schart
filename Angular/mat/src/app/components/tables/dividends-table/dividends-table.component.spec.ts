import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DividendsTableComponent } from './dividends-table.component';

describe('DividendsTableComponent', () => {
  let component: DividendsTableComponent;
  let fixture: ComponentFixture<DividendsTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DividendsTableComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DividendsTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
