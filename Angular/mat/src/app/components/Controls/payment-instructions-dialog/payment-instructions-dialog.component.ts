import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-payment-instructions-dialog',
  templateUrl: './payment-instructions-dialog.component.html',
  styleUrls: ['./payment-instructions-dialog.component.css']
})
export class PaymentInstructionsDialogComponent {
  currentUrl: string;

  constructor(public dialogRef: MatDialogRef<PaymentInstructionsDialogComponent>) {
    this.currentUrl = window.location.origin;
  }

  closeDialog(): void {
    this.dialogRef.close();
  }
}
