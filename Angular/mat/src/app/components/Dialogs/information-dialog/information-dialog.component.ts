import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MaterialModule } from 'src/app/material.module';

@Component({
  standalone: true,
  selector: 'app-information-dialog',
  imports: [MaterialModule],
  templateUrl: './information-dialog.component.html',
})
export class InformationDialogComponent {
  safeHtmlMessage: SafeHtml;

  constructor(
    public dialogRef: MatDialogRef<InformationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { message: string },
    private sanitizer: DomSanitizer
  ) {
    this.safeHtmlMessage = this.sanitizer.bypassSecurityTrustHtml(this.data.message);
  }

  onOkClick(): void {
    this.dialogRef.close();
  }
}
