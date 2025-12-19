import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ArrowDisplayComponent } from './arrow-display.component';

describe('ArrowDisplayComponent', () => {
  let component: ArrowDisplayComponent;
  let fixture: ComponentFixture<ArrowDisplayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ArrowDisplayComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ArrowDisplayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
