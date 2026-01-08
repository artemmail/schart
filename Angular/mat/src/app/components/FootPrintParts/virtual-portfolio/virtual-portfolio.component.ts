import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MaterialModule } from 'src/app/material.module';
import { SelectListItemText } from 'src/app/models/preserts';
import { PortfolioService } from 'src/app/service/portfolio.service';
import { PortfolioTableComponent } from '../../pages/portfolio copy/portfolio-table.component';
import {
  VirtualPortfolioTradeDialogComponent,
  VirtualPortfolioTradeDialogData,
  VirtualPortfolioTradeDialogResult,
} from './virtual-portfolio-trade-dialog.component';

interface VirtualPortfolioOption {
  value: number;
  text: string;
}

@Component({
  standalone: true,
  selector: 'footprint-virtual-portfolio',
  imports: [CommonModule, MaterialModule, PortfolioTableComponent],
  templateUrl: './virtual-portfolio.component.html',
  styleUrls: ['./virtual-portfolio.component.css'],
})
export class FootprintVirtualPortfolioComponent implements OnInit {
  portfolios: VirtualPortfolioOption[] = [];
  selectedPortfolioNumber = 1;
  @Input() ticker: string | null = null;
  @Output() tickerSelected = new EventEmitter<string>();
  @ViewChild(PortfolioTableComponent) portfolioTable?: PortfolioTableComponent;

  constructor(
    private portfolioService: PortfolioService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.portfolioService.getPortfolios().subscribe({
      next: (portfolios) => {
        this.portfolios = (portfolios ?? []).map((portfolio) => ({
          value: Number(portfolio.Value) || 0,
          text: portfolio.Text,
        }));
        if (this.portfolios.length) {
          this.selectedPortfolioNumber = this.portfolios[0].value || 1;
        }
      },
      error: () => {
        this.portfolios = [
          { value: 1, text: 'Portfolio 1' },
          { value: 2, text: 'Portfolio 2' },
          { value: 3, text: 'Portfolio 3' },
          { value: 4, text: 'Portfolio 4' },
        ];
        this.selectedPortfolioNumber = 1;
      },
    });
  }

  onTickerClick(row: any): void {
    const ticker = typeof row?.ticker === 'string' ? row.ticker : '';
    if (ticker) {
      this.tickerSelected.emit(ticker);
    }
  }

  openTradeDialog(action: 'buy' | 'sell'): void {
    const ticker = (this.ticker ?? '').trim();
    if (!ticker) {
      this.snackBar.open('Сначала выберите тикер', 'OK', { duration: 2500 });
      return;
    }

    const data: VirtualPortfolioTradeDialogData = {
      action,
      ticker,
    };

    this.dialog
      .open<
        VirtualPortfolioTradeDialogComponent,
        VirtualPortfolioTradeDialogData,
        VirtualPortfolioTradeDialogResult
      >(VirtualPortfolioTradeDialogComponent, {
        data,
        width: '360px',
        autoFocus: true,
      })
      .afterClosed()
      .subscribe((result) => {
        const quantity = result?.quantity;
        if (!quantity || quantity <= 0) {
          return;
        }

        const signedQuantity = action === 'buy' ? quantity : -quantity;
        this.portfolioService
          .makeOrder(ticker, signedQuantity, this.selectedPortfolioNumber)
          .subscribe(() => this.portfolioTable?.loadPortfolio());
      });
  }
}
