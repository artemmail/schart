import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MaterialModule } from 'src/app/material.module';
import { TickerAutocompleteComponent } from '../../Controls/ticker-autocomplete/ticker-autocomplete.component';

export interface VirtualPortfolioTradeDialogData {
  action: 'buy' | 'sell';
  ticker: string;
}

export interface VirtualPortfolioTradeDialogResult {
  quantity: number;
  ticker: string;
}

@Component({
  standalone: true,
  selector: 'footprint-virtual-portfolio-trade-dialog',
  imports: [CommonModule, MaterialModule, TickerAutocompleteComponent],
  templateUrl: './virtual-portfolio-trade-dialog.component.html',
  styleUrls: ['./virtual-portfolio-trade-dialog.component.css'],
})
export class VirtualPortfolioTradeDialogComponent {
  quantity = 1;
  ticker = '';

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: VirtualPortfolioTradeDialogData,
    private dialogRef: MatDialogRef<
      VirtualPortfolioTradeDialogComponent,
      VirtualPortfolioTradeDialogResult
    >
  ) {
    this.ticker = (data?.ticker ?? '').trim();
  }

  submit(): void {
    const quantity = Number(this.quantity);
    const ticker = (this.ticker ?? '').trim();
    if (!Number.isFinite(quantity) || quantity <= 0 || !ticker) {
      return;
    }
    this.dialogRef.close({ quantity, ticker });
  }
}
