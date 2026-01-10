import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MaterialModule } from 'src/app/material.module';
import { ConfirmDialogComponent } from 'src/app/components/Dialogs/confirm-dialog/confirm-dialog.component';
import { PortfolioService } from 'src/app/service/portfolio.service';

interface PortfolioOption {
  value: number;
  text: string;
}

export interface PortfolioManipulationDialogResult {
  action: 'deposit' | 'reset';
  portfolioNumber: number;
  amount?: number;
}

@Component({
  standalone: true,
  selector: 'footprint-portfolio-manipulation-dialog',
  imports: [CommonModule, MaterialModule],
  templateUrl: './portfolio-manipulation-dialog.component.html',
  styleUrls: ['./portfolio-manipulation-dialog.component.css'],
})
export class PortfolioManipulationDialogComponent implements OnInit {
  portfolios: PortfolioOption[] = [];
  selectedPortfolioNumber = 1;
  amount = 0;
  isSubmitting = false;

  constructor(
    private portfolioService: PortfolioService,
    private dialogRef: MatDialogRef<
      PortfolioManipulationDialogComponent,
      PortfolioManipulationDialogResult
    >,
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

  close(): void {
    this.dialogRef.close();
  }

  deposit(): void {
    const amount = Number(this.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      this.snackBar.open('Введите сумму', 'OK', { duration: 2500 });
      return;
    }

    const portfolioNumber = this.selectedPortfolioNumber;
    this.confirm(
      `Занести <b>${amount}</b> в портфель №${portfolioNumber}?`,
      () => {
        this.isSubmitting = true;
        this.portfolioService
          .depositPortfolio(amount, portfolioNumber)
          .subscribe({
            next: () => {
              this.dialogRef.close({
                action: 'deposit',
                portfolioNumber,
                amount,
              });
            },
            error: () => {
              this.isSubmitting = false;
              this.snackBar.open('Не удалось занести сумму', 'OK', {
                duration: 2500,
              });
            },
          });
      }
    );
  }

  reset(): void {
    const portfolioNumber = this.selectedPortfolioNumber;
    this.confirm(
      `Сбросить портфель №${portfolioNumber}? Все позиции и баланс будут очищены.`,
      () => {
        this.isSubmitting = true;
        this.portfolioService.cleanUpPortfolio(portfolioNumber).subscribe({
          next: () => {
            this.dialogRef.close({
              action: 'reset',
              portfolioNumber,
            });
          },
          error: () => {
            this.isSubmitting = false;
            this.snackBar.open('Не удалось сбросить портфель', 'OK', {
              duration: 2500,
            });
          },
        });
      }
    );
  }

  private confirm(message: string, onConfirm: () => void): void {
    this.dialog
      .open(ConfirmDialogComponent, { data: { message } })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) {
          onConfirm();
        }
      });
  }
}
