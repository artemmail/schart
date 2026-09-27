import { Component, OnInit, ViewChild, ChangeDetectorRef, AfterViewInit, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';
import { finalize } from 'rxjs';
import { PortfolioService } from 'src/app/service/portfolio.service';
import { Portfolio, PortfolioSolution } from 'src/app/models/portfolio.model';
import { TreeMapComponent, TreeMapOptions } from 'stockchart-treemap';
import { Title } from '@angular/platform-browser';
import { ReportsService } from 'src/app/service/reports.service';
import { FootPrintRequestModel } from 'src/app/models/tickerpreset';
import { DateRangePickerComponent } from '../../Controls/DateRange/date-range-picker.component';
import { PortfolioTableComponent } from '../portfolio copy/portfolio-table.component';
import { MaterialModule } from 'src/app/material.module';
import { PresetSelectorComponent1 } from '../../DateRangeSelector/date-range-selector.component';
import { resolveMarketMapColor } from '../../Controls/stockchart-treemap/market-map-colors';
import { MatDialog } from '@angular/material/dialog';
import { CopyOptimizationPortfolioDialogComponent } from './copy-optimization-portfolio-dialog.component';

interface PortfolioAllocationItem {
  ticker: string;
  percent: number;
  yieldPercent: number | null;
  colorRgba: string;
}

@Component({
  standalone: true,
  selector: 'app-portfolio-chart',
  imports: [
    MaterialModule,
    DateRangePickerComponent,
    PresetSelectorComponent1,
    PortfolioTableComponent,
    TreeMapComponent,
  ],
  templateUrl: './optimization.component.html',
  styleUrls: ['./optimization.component.css'],
  providers: [
    { provide: MAT_FORM_FIELD_DEFAULT_OPTIONS, useValue: { appearance: 'fill', subscriptSizing: 'dynamic' } }
  ]
})
export class PortfolioOptimizationComponent implements OnInit, AfterViewInit {
  @ViewChild(DateRangePickerComponent) dateRangePicker!: DateRangePickerComponent;
  @ViewChild(PortfolioTableComponent) portfolioTableComponent: PortfolioTableComponent;
  allocationData: PortfolioAllocationItem[] = [];
  readonly treemapOptions: Partial<TreeMapOptions> = {
    type: 'squarified',
    textField: 'ticker',
    valueField: 'percent',
    colorValueField: 'yieldPercent',
    colors: [],
    colorScale: { min: '#d61800', center: '#000000', max: '#04a344' },
    titleSize: 0,
    showTopLevelTitles: false,
    keepZeroValueNodes: false,
    minTileSize: 2
  };
  readonly colorResolver = resolveMarketMapColor;
  isCalculating = false;
  isLoadingLeaders = false;
  errorMessage = '';

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
    private titleService: Title,
    private dialog: MatDialog,
    private destroyRef: DestroyRef ) {
    titleService.setTitle("Оптимальный портфель Марковица");

    // Initialize dates to cover the past year
    const today = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(today.getFullYear() - 1);

    this.startDate = oneYearAgo;
    this.endDate = today;

    this.form = this.fb.group({
      tickers: ['', [Validators.required, Validators.pattern(/[^\s,;]/)]],
      rperiod: [this.rperiod],
      startDate: [this.startDate, Validators.required],
      endDate: [this.endDate, Validators.required],
      portfolioDate: ['', Validators.required],
      deposit: [1000000, [Validators.required, Validators.min(1000)]],
      risk: [0.2, [Validators.required, Validators.min(0.0001), Validators.max(100)]],
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
  
    this.loadPortfolios();
    this.loadLeadersAndCalculatePortfolio(); // Fetch leaders and calculate portfolio
    
  }

  loadLeadersAndCalculatePortfolio(): void {
    this.loadLeaderTickers(true);
  }

  

  ngAfterViewInit(): void {
    if (this.dateRangePicker) {
      this.dateRangePicker.setDatesRange(this.startDate, this.endDate);
    }
    this.cdr.detectChanges();
  }

  loadPortfolios(): void {
    this.portfolioService.getPortfolios().subscribe(portfolios => {
      this.portfolios = portfolios;
    });
  }

  onSubmit(): void {
    if (this.isCalculating) {
      return;
    }

    if (!this.form.valid) {
      this.form.markAllAsTouched();
      return;
    }

    const formValues = this.form.value;
    const tickers = [...new Set(
      String(formValues.tickers).toUpperCase().split(/[\s,;]+/).filter(Boolean)
    )].join(',');
    this.isCalculating = true;
    this.errorMessage = '';

    this.portfolioService.markovitz(
      tickers,
      formValues.rperiod,
      formValues.startDate,
      formValues.endDate,
      formValues.portfolioDate,
      formValues.deposit,
      formValues.risk
    ).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.isCalculating = false)
    ).subscribe({
      next: solution => {
        if (!solution.success || !solution.chart?.length) {
          this.errorMessage = 'Не удалось подобрать портфель. Попробуйте изменить бумаги, период или риск.';
          return;
        }
        const hasPreviousSolution = !!this.portfolioSolution;
        this.portfolioSolution = solution;
        this.allocationData = [];
        this.cdr.detectChanges();
        if (hasPreviousSolution) {
          this.portfolioTableComponent?.loadPortfolio();
        }
      },
      error: err => {
        this.errorMessage = err?.error?.error ?? 'Ошибка расчёта портфеля. Попробуйте ещё раз.';
      }
    });
  }

  onPortfolioSharesLoaded(shares: Portfolio[]): void {
    if (!this.portfolioSolution) {
      this.allocationData = [];
      return;
    }

    const sharesByTicker = new Map(
      shares.map(share => [share.ticker?.trim().toUpperCase(), share] as const)
    );

    const allocationItems = this.portfolioSolution.chart
      .map(item => {
        const ticker = item.ticker?.trim().toUpperCase();
        const share = sharesByTicker.get(ticker);
        const yieldPercent = share?.buycost
          ? ((share.profit ?? 0) * 100) / share.buycost
          : null;

        return {
          ticker: item.ticker,
          percent: Number.isFinite(item.percent) ? Math.max(0, item.percent) : 0,
          yieldPercent: yieldPercent !== null && Number.isFinite(yieldPercent) ? yieldPercent : null
        };
      })
      .filter(item => item.percent > 0);
    const maxAbsYield = Math.max(0, ...allocationItems.map(item => Math.abs(item.yieldPercent ?? 0)));
    this.allocationData = allocationItems.map(item => {
      const alpha = maxAbsYield > 0 ? Math.min(1, Math.abs(item.yieldPercent ?? 0) / maxAbsYield) : 0;
      const color = (item.yieldPercent ?? 0) > 0 ? '4, 163, 68' : '214, 24, 0';
      return { ...item, colorRgba: `rgba(${color}, ${alpha})` };
    });
  }

  openCopyPortfolioDialog(): void {
    this.dialog.open(CopyOptimizationPortfolioDialogComponent, {
      width: '420px',
      maxWidth: 'calc(100vw - 32px)',
      data: { portfolioNumbers: [1, 2, 3, 4] }
    });
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
    this.loadLeaderTickers(false);
  }

  private loadLeaderTickers(calculate: boolean): void {
    if (this.isLoadingLeaders || this.isCalculating) {
      return;
    }

    const startDate = this.startDate;
    const endDate = this.endDate;

    if (startDate && endDate) {
      this.isLoadingLeaders = true;
      this.errorMessage = '';
      this.rs.getLeaders(startDate, endDate).pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoadingLeaders = false)
      ).subscribe({
        next: data => {
          const tickers = data.slice(0, 20).map(item => item.ticker).join(', ');
          this.form.patchValue({ tickers });
          if (calculate) {
            this.onSubmit();
          }
        },
        error: () => {
          this.errorMessage = 'Не удалось загрузить лидеров. Введите тикеры вручную или попробуйте ещё раз.';
        }
      });
    } else {
      this.errorMessage = 'Пожалуйста, выберите диапазон дат.';
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
