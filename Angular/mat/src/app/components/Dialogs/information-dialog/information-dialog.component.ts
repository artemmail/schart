import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MaterialModule } from 'src/app/material.module';

export interface InformationDialogData {
  message: string;
  link?: { url: string; label: string };
}

@Component({
  standalone: true,
  selector: 'app-information-dialog',
  imports: [MaterialModule],
  templateUrl: './information-dialog.component.html',
})
export class InformationDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<InformationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: InformationDialogData
  ) {}

  onOkClick(): void {
    this.dialogRef.close();
  }
}
