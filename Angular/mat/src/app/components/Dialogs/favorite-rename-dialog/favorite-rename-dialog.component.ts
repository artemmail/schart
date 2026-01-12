import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MaterialModule } from 'src/app/material.module';

export interface FavoriteRenameDialogData {
  name: string;
  title?: string;
}

@Component({
  standalone: true,
  selector: 'app-favorite-rename-dialog',
  imports: [MaterialModule],
  templateUrl: './favorite-rename-dialog.component.html',
  styleUrls: ['./favorite-rename-dialog.component.css'],
})
export class FavoriteRenameDialogComponent {
  name: string;

  constructor(
    public dialogRef: MatDialogRef<FavoriteRenameDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: FavoriteRenameDialogData
  ) {
    this.name = data?.name ?? '';
  }

  cancel(): void {
    this.dialogRef.close(null);
  }

  save(): void {
    const trimmed = this.name.trim();
    if (!trimmed) {
      return;
    }
    this.dialogRef.close(trimmed);
  }
}
