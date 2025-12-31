import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { PalettePickerModule } from 'src/lib/palette-picker.module';
import { MarkLineLevel } from 'src/app/service/FootPrint/LevelMarks/level-marks.service';


@Component({
  standalone: true,
  selector: 'app-level-settings-dialog',
  templateUrl: './level-settings-dialog.component.html',
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    PalettePickerModule,
  ],
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
