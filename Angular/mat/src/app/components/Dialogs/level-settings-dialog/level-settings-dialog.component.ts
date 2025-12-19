import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MarkLineLevel } from 'src/app/service/FootPrint/LevelMarks/level-marks.service';


@Component({
  selector: 'app-level-settings-dialog',
  templateUrl: './level-settings-dialog.component.html',
})
export class LevelSettingsDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<LevelSettingsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: MarkLineLevel
  ) {}

  onSaveClick(): void {
    this.dialogRef.close(this.data);
  }

  onCancelClick(): void {
    this.dialogRef.close();
  }
}
