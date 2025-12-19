import { Component, OnInit, ViewChild, ElementRef, ChangeDetectorRef, AfterViewInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Chart, ChartConfiguration } from 'chart.js/auto';
import { PortfolioService } from 'src/app/service/portfolio.service';
import { PortfolioSolution } from 'src/app/models/portfolio.model';
import { Title } from '@angular/platform-browser';
import { ReportsService } from 'src/app/service/reports.service';
import { FootPrintRequestModel } from 'src/app/models/tickerpreset';
import { DateRangePickerComponent } from '../../Controls/DateRange/date-range-picker.Component';
import { PortfolioTableComponent } from '../portfolio copy/portfolio-table.component';

@Component({
  standalone: false,
  selector: 'app-portfolio-chart',
  templateUrl: './optimization.component.html',
  styleUrls: ['./optimization.component.css']
})
export class PortfolioOptimizationComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('chartCanvas') chartCanvas: ElementRef<HTMLCanvasElement>;
  @ViewChild(DateRangePickerComponent) dateRangePicker!: DateRangePickerComponent;
  @ViewChild(PortfolioTableComponent) portfolioTableComponent: PortfolioTableComponent;



  
  private chart: Chart<'pie'> | null = null;

  form: FormGroup;
  portfolioSolution: PortfolioSolution | null = null;

  portfolios: any[];

  rperiod: string = 'year'; // Initialize to 'year'
  startDate: Date;
  endDate: Date;
  portfolioDate: Date;
  ticker: string = 'GAZP';

  constructor(
    private portfolioService: PortfolioService,
    private rs: ReportsService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private titleService: Title ) {
    titleService.setTitle("Оптимальный портфель Марковица");

    // Initialize dates to cover the past year
    const today = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(today.getFullYear() - 1);

    this.startDate = oneYearAgo;
    this.endDate = today;

    this.form = this.fb.group({
      tickers: [''],
      rperiod: [this.rperiod],
      startDate: [this.startDate, Validators.required],
      endDate: [this.endDate, Validators.required],
      portfolioDate: ['', Validators.required],
      deposit: [1000000, [Validators.required, Validators.min(1000)]],
      risk: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
      selectedPortfolio: ['']
    });
  }

  ngOnInit(): void {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    this.portfolioDate = new Date(threeMonthsAgo.getFullYear(), threeMonthsAgo.getMonth(), 1);
  
    this.form.patchValue({
      startDate: this.startDate,
      endDate: this.endDate,
      portfolioDate: this.portfolioDate
    });
  
    this.portfolioSolution = this.getTestSolution();

    this.loadPortfolios();
    this.loadLeadersAndCalculatePortfolio(); // Fetch leaders and calculate portfolio
    
  }

  loadLeadersAndCalculatePortfolio(): void {
    const startDate = this.startDate;
    const endDate = this.endDate;
  
    if (startDate && endDate) {
      this.rs.getLeaders(startDate, endDate).subscribe(data => {
        const tickers = data.slice(0, 20).map(item => item.ticker).join(',');
        this.form.patchValue({ tickers: tickers });
  
        // Once tickers are loaded, calculate the portfolio
        this.onSubmit();
      });
    } else {
      alert('Пожалуйста, выберите диапазон дат.');
    }
  }

  

  ngAfterViewInit(): void {
    if (this.dateRangePicker) {
      this.dateRangePicker.setDatesRange(this.startDate, this.endDate);
    }
    if (this.portfolioSolution) {
      this.updateChartData(this.portfolioSolution);
    }
  }

  ngOnDestroy(): void {
    if (this.chart) {
      this.chart.destroy();
    }
  }

  loadPortfolios(): void {
    this.portfolioService.getPortfolios().subscribe(portfolios => {
      this.portfolios = portfolios;
    });
  }

  getTestSolution(): PortfolioSolution {
    return {
      success: true,
      actual: 1.03958640647816,
      stddev: 6.87790799080206,
      chart: [
        { ticker: "SBER", percent: 8.08 },
        { ticker: "LKOH", percent: 11.06 },
        // ... other data
      ]
    };
  }

  onSubmit(): void {
    if (this.form.valid) {
      const formValues = this.form.value;
      this.portfolioService.markovitz(
        formValues.tickers,
        formValues.rperiod,
        formValues.startDate,
        formValues.endDate,
        formValues.portfolioDate,
        formValues.deposit,
        formValues.risk
      ).subscribe(solution => {
        this.portfolioSolution = solution;
        this.updateChartData(solution);
        
        this.portfolioTableComponent.loadPortfolio();
      });
    }
  }

  updateChartData(solution: PortfolioSolution): void {
    if (solution.success) {
      const labels = solution.chart.map(item => item.ticker);
      const data = solution.chart.map(item => item.percent);
      const backgroundColor = [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40',
        '#FFCD56', '#C9CBCF', '#36A2EB', '#4BC0C0', '#FF6384', '#36A2EB',
        '#FFCE56', '#4BC0C0', '#9966FF'
      ];

      const chartConfig: ChartConfiguration<'pie'> = {
        type: 'pie',
        data: {
          labels: labels,
          datasets: [{
            data: data,
            backgroundColor: backgroundColor
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              position: 'top',
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const label = context.label || '';
                  const value = context.raw || 0;
                  return `${label}: ${value}%`;
                }
              }
            }
          }
        }
      };

      if (this.chart) {
        this.chart.destroy();
      }

      if (this.chartCanvas && this.chartCanvas.nativeElement) {
        this.chart = new Chart(this.chartCanvas.nativeElement, chartConfig);
      }
    }
  }

  onDateRangePresetChange(preset: FootPrintRequestModel): void {
    this.rperiod = preset.rperiod;
    this.startDate = preset.startDate;
    this.endDate = preset.endDate;

    // Update the form values
    this.form.patchValue({
      rperiod: this.rperiod,
      startDate: this.startDate,
      endDate: this.endDate
    });

    // Set the date range in the dateRangePicker component
    if (this.dateRangePicker) {
      this.dateRangePicker.setDatesRange(this.startDate, this.endDate);
    }
  }

  onDateRangeChange(range: { start: Date, end: Date }): void {
    this.startDate = range.start;
    this.endDate = range.end;

    // Update the form values
    this.form.patchValue({
      startDate: this.startDate,
      endDate: this.endDate
    });
  }

  tickersFromLeaders(): void {
    const startDate = this.startDate;
    const endDate = this.endDate;

    if (startDate && endDate) {
      this.rs.getLeaders(startDate, endDate).subscribe(data => {
        const tickers = data.slice(0, 20).map(item => item.ticker).join(',');
        this.form.patchValue({ tickers: tickers });
      });
    } else {
      alert('Пожалуйста, выберите диапазон дат.');
    }
  }

  copyPortfolio(): void {
    const portfolioNumber = this.form.get('selectedPortfolio')?.value;
    if (portfolioNumber) {
      if (confirm(`История сделок, баланс и бумаги портфеля #${portfolioNumber} будут удалены`)) {
        this.portfolioService.copyPortfolio(0, portfolioNumber).subscribe(() => {
          alert(`Портфель #${portfolioNumber} заменен`);
        });
      }
    } else {
      alert('Пожалуйста, выберите портфель для перемещения.');
    }
  }
}
