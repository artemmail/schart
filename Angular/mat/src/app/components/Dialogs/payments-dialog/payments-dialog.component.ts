import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import {
  NgxMatDatepickerInput,
  NgxMatDatetimepicker,
} from '@ngxmc/datetime-picker';
import { PaymentModel } from 'src/app/service/payments.service';


@Component({
  standalone: true,
  selector: 'app-payment-dialog',
  templateUrl: './payments-dialog.component.html',
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule,
    NgxMatDatetimepicker,
    NgxMatDatepickerInput,
  ],
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
