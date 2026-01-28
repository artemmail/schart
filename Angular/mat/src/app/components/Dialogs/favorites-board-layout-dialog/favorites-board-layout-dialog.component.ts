import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MaterialModule } from 'src/app/material.module';

export interface FavoritesBoardLayoutEntry {
  count: number;
  columns: number;
  rows: number;
}

export interface FavoritesBoardLayoutDialogData {
  layoutEntries: FavoritesBoardLayoutEntry[];
}

export interface FavoritesBoardLayoutDialogResult {
  layoutEntries: FavoritesBoardLayoutEntry[];
}

interface LayoutOption {
  columns: number;
  rows: number;
  label: string;
}

@Component({
  standalone: true,
  selector: 'app-favorites-board-layout-dialog',
  imports: [MaterialModule],
  templateUrl: './favorites-board-layout-dialog.component.html',
  styleUrls: ['./favorites-board-layout-dialog.component.css'],
})
export class FavoritesBoardLayoutDialogComponent {
  layoutEntries: FavoritesBoardLayoutEntry[] = [];
  optionsMap = new Map<number, LayoutOption[]>();
  selectedMap: Record<number, LayoutOption> = {};
  displayLabelMap: Record<number, string> = {};
  private readonly maxSide = 4;

  constructor(
    public dialogRef: MatDialogRef<FavoritesBoardLayoutDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: FavoritesBoardLayoutDialogData
  ) {
    this.layoutEntries = (data?.layoutEntries ?? []).map((entry) => ({
      ...entry,
    }));

    const sortedEntries = [...this.layoutEntries].sort(
      (a, b) => a.count - b.count
    );

    let prevCount = 0;
    sortedEntries.forEach((entry) => {
      const diff = entry.count - prevCount;
      let label = `${entry.count}`;
      if (prevCount > 0 && diff > 1) {
        label = `${prevCount + 1}-${entry.count}`;
      }
      this.displayLabelMap[entry.count] = label;
      prevCount = entry.count;
    });

    this.layoutEntries.forEach((entry) => {
      const options = this.buildOptions(entry.count);
      this.optionsMap.set(entry.count, options);
      const current =
        options.find(
          (option) =>
            option.columns === entry.columns && option.rows === entry.rows
        ) ?? options[0];
      if (current) {
        this.selectedMap[entry.count] = current;
      }
    });
  }

  cancel(): void {
    this.dialogRef.close(null);
  }

  save(): void {
    const layoutEntries = this.layoutEntries.map((entry) => {
      const selected = this.selectedMap[entry.count];
      if (selected) {
        return {
          count: entry.count,
          columns: selected.columns,
          rows: selected.rows,
        };
      }
      return entry;
    });

    this.dialogRef.close({
      layoutEntries,
    } as FavoritesBoardLayoutDialogResult);
  }

  getOptions(entry: FavoritesBoardLayoutEntry): LayoutOption[] {
    return this.optionsMap.get(entry.count) ?? [];
  }

  onSelectionChange(entry: FavoritesBoardLayoutEntry, value: LayoutOption) {
    this.selectedMap[entry.count] = value;
  }

  private buildOptions(count: number): LayoutOption[] {
    const options: LayoutOption[] = [];
    if (count <= 0) {
      return [{ columns: 1, rows: 1, label: '1 × 1' }];
    }

    for (let i = 1; i <= count; i += 1) {
      if (count % i === 0) {
        const columns = i;
        const rows = count / i;
        if (columns <= this.maxSide && rows <= this.maxSide) {
          options.push({
            columns,
            rows,
            label: `${columns} × ${rows}`,
          });
        }
      }
    }

    if (count === 16) {
      const preferred: LayoutOption[] = [
        { columns: 5, rows: 3, label: '5 × 3' },
        { columns: 3, rows: 5, label: '3 × 5' },
        { columns: 4, rows: 4, label: '4 × 4' },
      ];
      const existingKeys = new Set(
        options.map((option) => `${option.columns}x${option.rows}`)
      );
      preferred.forEach((option) => {
        const key = `${option.columns}x${option.rows}`;
        if (!existingKeys.has(key)) {
          options.push(option);
        }
      });
    }

    return options;
  }
}
