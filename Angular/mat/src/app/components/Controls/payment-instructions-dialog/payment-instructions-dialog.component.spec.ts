import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PaymentInstructionsDialogComponent } from './payment-instructions-dialog.component';

describe('PaymentInstructionsDialogComponent', () => {
  let component: PaymentInstructionsDialogComponent;
  let fixture: ComponentFixture<PaymentInstructionsDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaymentInstructionsDialogComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PaymentInstructionsDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
