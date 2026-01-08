import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MaterialModule } from 'src/app/material.module';
import { SelectListItemText } from 'src/app/models/preserts';
import { PortfolioService } from 'src/app/service/portfolio.service';

export interface PortfolioCompareDialogData {}

export interface PortfolioCompareDialogResult {
  portfolio1: number;
  portfolio2: number;
}

interface PortfolioOption {
  value: number;
  text: string;
}

@Component({
  standalone: true,
  selector: 'footprint-portfolio-compare-dialog',
  imports: [CommonModule, MaterialModule],
  templateUrl: './portfolio-compare-dialog.component.html',
  styleUrls: ['./portfolio-compare-dialog.component.css'],
})
export class PortfolioCompareDialogComponent implements OnInit {
  portfolios: PortfolioOption[] = [];
  portfolio1 = 1;
  portfolio2 = 2;
  isLoading = true;

  constructor(
    private portfolioService: PortfolioService,
    private dialogRef: MatDialogRef<
      PortfolioCompareDialogComponent,
      PortfolioCompareDialogResult
    >,
    @Inject(MAT_DIALOG_DATA) public data: PortfolioCompareDialogData
  ) {}

  ngOnInit(): void {
    this.portfolioService.getPortfolios().subscribe({
      next: (portfolios) => {
        this.portfolios = (portfolios ?? []).map((portfolio) => ({
          value: Number(portfolio.Value) || 0,
          text: portfolio.Text,
        }));
        if (this.portfolios.length >= 1) {
          this.portfolio1 = this.portfolios[0].value || 1;
        }
        if (this.portfolios.length >= 2) {
          this.portfolio2 = this.portfolios[1].value || 2;
        } else {
          this.portfolio2 = this.portfolio1;
        }
        this.isLoading = false;
      },
      error: () => {
        this.portfolios = [
          { value: 1, text: 'Portfolio 1' },
          { value: 2, text: 'Portfolio 2' },
          { value: 3, text: 'Portfolio 3' },
          { value: 4, text: 'Portfolio 4' },
        ];
        this.portfolio1 = 1;
        this.portfolio2 = 2;
        this.isLoading = false;
      },
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }

  submit(): void {
    if (!this.portfolio1 || !this.portfolio2 || this.portfolio1 === this.portfolio2) {
      return;
    }
    this.dialogRef.close({ portfolio1: this.portfolio1, portfolio2: this.portfolio2 });
  }
}
