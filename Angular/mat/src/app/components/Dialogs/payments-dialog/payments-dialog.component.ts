import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { PaymentModel } from 'src/app/service/payments.service';


@Component({
  standalone: false,
  selector: 'app-payment-dialog',
  templateUrl: './payments-dialog.component.html',
})
export class PaymentDialogComponent {
  payment: PaymentModel;

  constructor(
    public dialogRef: MatDialogRef<PaymentDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PaymentModel
  ) {
    this.payment = { ...data };
  
    // Ensure PayDate and ExpireDate are Date objects
    if (this.payment.PayDate && !(this.payment.PayDate instanceof Date)) {
      this.payment.PayDate = new Date(this.payment.PayDate);
    }
    if (this.payment.ExpireDate && !(this.payment.ExpireDate instanceof Date)) {
      this.payment.ExpireDate = new Date(this.payment.ExpireDate);
    }
  }

  onSave(): void {
    this.dialogRef.close(this.payment);
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
