import { AfterViewInit, Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Chart } from 'chart.js/auto';

import { map, Observable } from 'rxjs';
import { StockData } from 'src/app/models/fundamental.model';
import {  DataService } from 'src/app/service/companydata.service';




@Component({
  selector: 'app-dividends-table',
  templateUrl: './dividends-table.component.html',
  styleUrls: ['./dividends-table.component.css']
})
export class DividendsTableComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() ticker: string = '';
  @ViewChild('chartCanvas', { static: true }) chartCanvas: ElementRef<HTMLCanvasElement>;
  private chart: Chart;

  displayedColumns: string[] = ['buyBefore', 'recordDate', 'dividend', 'yield'];
  dataSource$: Observable<StockData | undefined>;
  data: StockData;

  constructor(private DataService: DataService) {}

  async ngOnInit(): Promise<void> {
    if (this.ticker) {
      this.dataSource$ = this.DataService.getDividends(this.ticker);

      this.data = await this.DataService.getDividends(this.ticker).toPromise();
    }
  }

  ngAfterViewInit(): void {
    if (this.ticker) {
      this.setupChart();
    }
  }

  ngOnDestroy(): void {
    if (this.chart) {
      this.chart.destroy();
    }
  }

  private setupChart(): void {
    this.dataSource$.pipe(
      map(stockData => {
        if (!stockData) return { labels: [], data: [] };
        
        const dividendData = stockData.Dividends.reduce((acc, div) => {
          const year = new Date(div.BuyBefore).getFullYear();
          if (!acc[year]) {
            acc[year] = 0;
          }
          acc[year] += div.Dividend;
          return acc;
        }, {} as { [key: number]: number });

        const labels = Object.keys(dividendData);
        const data = Object.values(dividendData);

        return { labels, data };
      })
    ).subscribe(({ labels, data }) => {
      if (this.chart) {
        this.chart.destroy();
      }

      this.chart = new Chart(this.chartCanvas.nativeElement, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Дивиденды по годам',
              data: data,
              backgroundColor: 'rgba(75, 192, 192, 0.2)',
              borderColor: 'rgba(75, 192, 192, 1)',
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: true,
              text: `Изменение дивидендов по годам для ${this.ticker}`,
            },
          },
          scales: {
            x: {
              beginAtZero: true,
            },
            y: {
              beginAtZero: true,
            },
          },
        },
      });
    });
  }
}