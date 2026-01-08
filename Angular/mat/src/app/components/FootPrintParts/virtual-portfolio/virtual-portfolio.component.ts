import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MaterialModule } from 'src/app/material.module';
import { SelectListItemText } from 'src/app/models/preserts';
import { PortfolioService } from 'src/app/service/portfolio.service';
import { PortfolioTableComponent } from '../../pages/portfolio copy/portfolio-table.component';

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

  constructor(private portfolioService: PortfolioService) {}

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
}
