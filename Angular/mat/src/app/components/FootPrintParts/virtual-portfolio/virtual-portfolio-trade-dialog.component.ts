import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MaterialModule } from 'src/app/material.module';

export interface VirtualPortfolioTradeDialogData {
  action: 'buy' | 'sell';
  ticker: string;
}

export interface VirtualPortfolioTradeDialogResult {
  quantity: number;
}

@Component({
  standalone: true,
  selector: 'footprint-virtual-portfolio-trade-dialog',
  imports: [CommonModule, MaterialModule],
  templateUrl: './virtual-portfolio-trade-dialog.component.html',
  styleUrls: ['./virtual-portfolio-trade-dialog.component.css'],
})
export class VirtualPortfolioTradeDialogComponent {
  quantity = 1;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: VirtualPortfolioTradeDialogData,
    private dialogRef: MatDialogRef<
      VirtualPortfolioTradeDialogComponent,
      VirtualPortfolioTradeDialogResult
    >
  ) {}

  submit(): void {
    const quantity = Number(this.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return;
    }
    this.dialogRef.close({ quantity });
  }
}

