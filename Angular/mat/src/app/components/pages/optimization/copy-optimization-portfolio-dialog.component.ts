import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MaterialModule } from 'src/app/material.module';
import { ConfirmDialogComponent } from 'src/app/components/Dialogs/confirm-dialog/confirm-dialog.component';
import { PortfolioService } from 'src/app/service/portfolio.service';

interface PortfolioOption {
  value: number;
  text: string;
}

@Component({
  standalone: true,
  selector: 'app-copy-optimization-portfolio-dialog',
  imports: [CommonModule, MaterialModule],
  template: `
    <h2 mat-dialog-title>Скопировать портфель</h2>
    <div mat-dialog-content>
      <p>Текущий состав будет скопирован в выбранный портфель.</p>
      <mat-form-field appearance="fill" class="target-field">
        <mat-label>Куда скопировать</mat-label>
        <mat-select [(value)]="selectedPortfolioNumber">
          <mat-option *ngFor="let portfolio of portfolios" [value]="portfolio.value">
            {{ portfolio.text }}
          </mat-option>
        </mat-select>
      </mat-form-field>
      <p class="copy-warning">Содержимое и история выбранного портфеля будут заменены.</p>
    </div>
    <div mat-dialog-actions align="end">
      <button mat-button type="button" (click)="close()">Отмена</button>
      <button mat-flat-button color="primary" type="button" (click)="copy()" [disabled]="isSubmitting || !selectedPortfolioNumber">
        {{ isSubmitting ? 'Копируем…' : 'Скопировать' }}
      </button>
    </div>
  `,
  styles: [`
    .target-field { width: 100%; margin-top: 12px; }
    .copy-warning { color: var(--mat-sys-error, #b3261e); font-size: 13px; }
  `]
})
export class CopyOptimizationPortfolioDialogComponent implements OnInit {
  portfolios: PortfolioOption[] = [1, 2, 3, 4].map(value => ({ value, text: `Портфель №${value}` }));
  selectedPortfolioNumber = 1;
  isSubmitting = false;

  constructor(
    private portfolioService: PortfolioService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private dialogRef: MatDialogRef<CopyOptimizationPortfolioDialogComponent>,
    @Inject(MAT_DIALOG_DATA) private data: { portfolioNumbers?: number[] }
  ) {}

  ngOnInit(): void {
    if (this.data.portfolioNumbers?.length) {
      this.portfolios = this.data.portfolioNumbers.map(value => ({ value, text: `Портфель №${value}` }));
    }
    this.portfolioService.getPortfolios().subscribe({
      next: portfolios => {
        const available = (portfolios ?? [])
          .map(portfolio => ({ value: Number(portfolio.Value), text: portfolio.Text }))
          .filter(portfolio => Number.isInteger(portfolio.value) && portfolio.value >= 1 && portfolio.value <= 4);
        if (available.length) {
          this.portfolios = available;
          this.selectedPortfolioNumber = available[0].value;
        }
      }
    });
  }

  close(): void {
    this.dialogRef.close();
  }

  copy(): void {
    const portfolioNumber = this.selectedPortfolioNumber;
    this.dialog.open(ConfirmDialogComponent, {
      data: { message: `Заменить содержимое и историю портфеля №${portfolioNumber} текущим портфелем?` }
    }).afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.isSubmitting = true;
      this.portfolioService.copyPortfolio(0, portfolioNumber).subscribe({
        next: () => {
          this.snackBar.open(`Портфель скопирован в портфель №${portfolioNumber}`, 'OK', { duration: 3000 });
          this.dialogRef.close(portfolioNumber);
        },
        error: () => {
          this.isSubmitting = false;
          this.snackBar.open('Не удалось скопировать портфель', 'OK', { duration: 3000 });
        }
      });
    });
  }
}
