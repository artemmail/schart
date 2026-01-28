import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MaterialModule } from 'src/app/material.module';
import { FootprintFavorite } from 'src/app/service/FootPrint/Favorites/footprint-favorites.service';

export interface FavoritesBoardSettingsDialogData {
  favorites: FootprintFavorite[];
  selectedIds: string[];
}

export interface FavoritesBoardSettingsDialogResult {
  selectedIds: string[];
}

@Component({
  standalone: true,
  selector: 'app-favorites-board-settings-dialog',
  imports: [MaterialModule],
  templateUrl: './favorites-board-settings-dialog.component.html',
  styleUrls: ['./favorites-board-settings-dialog.component.css'],
})
export class FavoritesBoardSettingsDialogComponent {
  favorites: FootprintFavorite[] = [];
  selectedMap: Record<string, boolean> = {};

  constructor(
    public dialogRef: MatDialogRef<FavoritesBoardSettingsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: FavoritesBoardSettingsDialogData
  ) {
    this.favorites = data?.favorites ?? [];
    const selected = new Set<string>(data?.selectedIds ?? []);
    this.favorites.forEach((favorite) => {
      this.selectedMap[favorite.id] = selected.has(favorite.id);
    });
  }

  cancel(): void {
    this.dialogRef.close(null);
  }

  save(): void {
    const selectedIds = this.favorites
      .filter((favorite) => this.selectedMap[favorite.id])
      .map((favorite) => favorite.id);

    this.dialogRef.close({
      selectedIds,
    } as FavoritesBoardSettingsDialogResult);
  }
}
