import { Component, Inject } from '@angular/core';
import { MaterialModule } from 'src/app/material.module';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  standalone: true,
  selector: 'app-confirm-dialog',
  imports: [MaterialModule],
  templateUrl: './confirm-dialog.component.html',
})
export class ConfirmDialogComponent {
  safeHtmlMessage: SafeHtml;

  constructor(
    public dialogRef: MatDialogRef<ConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { message: string },
    private sanitizer: DomSanitizer
  ) {
    this.safeHtmlMessage = this.sanitizer.bypassSecurityTrustHtml(this.data.message);
  }

  onNoClick(): void {
    this.dialogRef.close(false);
  }

  onYesClick(): void {
    this.dialogRef.close(true);
  }
}
