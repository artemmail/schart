import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TickerAutocompleteComponent } from './ticker-autocomplete.component';

describe('TickerAutocompleteComponent', () => {
  let component: TickerAutocompleteComponent;
  let fixture: ComponentFixture<TickerAutocompleteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TickerAutocompleteComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TickerAutocompleteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
