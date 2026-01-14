import {
  Component,
  OnDestroy,
  Input,
  ElementRef,
  AfterViewInit,
  ChangeDetectorRef,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReportsService, MarketMapItem, MarketMapParams, MarketMapSquare } from 'src/app/service/reports.service';
import { Subscription, interval } from 'rxjs';
import { switchMap, startWith } from 'rxjs/operators';
import { Router } from '@angular/router';
import { MoneyToStrPipe } from 'src/app/pipes/money-to-str.pipe';
import { drob } from 'src/app/service/FootPrint/utils';

@Component({
  standalone: true,
  selector: 'app-market-board',
  templateUrl: './market-board.component.html',
  styleUrls: ['./market-board.component.css'],
  imports: [CommonModule, MoneyToStrPipe],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MarketBoardComponent implements OnDestroy, AfterViewInit {
  @Input() startDate?: Date;
  @Input() endDate?: Date;
  @Input() categories?: string;
  @Input() rperiod: string = 'day';
  @Input() top: number = 50;
  @Input() market: number = 0;

  sectors: MarketMapItem[] = [];
  private refreshSubscription?: Subscription;
  private intersectionObserver?: IntersectionObserver;
  private readonly upArrow = '\u25B2';
  private readonly downArrow = '\u25BC';

  constructor(
    private reportsService: ReportsService,
    private router: Router,
    private el: ElementRef<HTMLElement>,
    private cdr: ChangeDetectorRef
  ) {}

  ngAfterViewInit(): void {
    const host = this.el.nativeElement;
    this.intersectionObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          this.startDataSubscription();
        } else {
          this.stopDataSubscription();
        }
      }
    }, { threshold: 0.1 });

    this.intersectionObserver.observe(host);
    this.startDataSubscription();
    this.cdr.detectChanges();
  }

  ngOnDestroy(): void {
    this.stopDataSubscription();
    this.intersectionObserver?.disconnect();
  }

  public updateParams(params: MarketMapParams): void {
    this.startDate = params.startDate ?? this.startDate;
    this.endDate = params.endDate ?? this.endDate;
    this.categories = params.categories ?? this.categories;
    this.rperiod = params.rperiod ?? this.rperiod;
    this.top = params.top ?? this.top;
    this.market = params.market ?? this.market;

    this.stopDataSubscription();
    this.startDataSubscription();
  }

  private startDataSubscription(): void {
    if (this.refreshSubscription && !this.refreshSubscription.closed) {
      return;
    }

    this.refreshSubscription = interval(5000)
      .pipe(
        startWith(0),
        switchMap(() => this.reportsService.callGetMarketMap({
          startDate: this.startDate,
          endDate: this.endDate,
          categories: this.categories,
          rperiod: this.rperiod,
          top: this.top,
          market: this.market
        }))
      )
      .subscribe((data) => {
        this.sectors = data?.[0]?.items ?? [];
        this.cdr.markForCheck();
      });
  }

  private stopDataSubscription(): void {
    this.refreshSubscription?.unsubscribe();
    this.refreshSubscription = undefined;
  }

  navigateToFootPrint(ticker: string): void {
    this.router.navigate(['/FootPrint'], { queryParams: { ticker } });
  }

  onTickerClick(item: MarketMapSquare): void {
    if (item && item.ticker) {
      this.navigateToFootPrint(item.ticker);
    }
  }

  getTickers(sector: MarketMapItem): string {
    if (!sector || !sector.items) return '';
    return sector.items.map((item) => item.ticker).filter(Boolean).join(',');
  }

  getSectorLink(sector: MarketMapItem): string {
    const tickers = this.getTickers(sector);
    if (!tickers) return '';
    const urlTree = this.router.createUrlTree(['/MultiCandles'], {
      queryParams: { tickers, period: 15 }
    });
    return this.router.serializeUrl(urlTree);
  }

  formatPercent(percent: number | null | undefined): string {
    if (percent === null || percent === undefined || Number.isNaN(percent)) return '';
    const base = drob(percent, 2).toString();
    if (percent > 0) return `${this.upArrow}${base}%`;
    if (percent < 0) return `${this.downArrow}${base}%`;
    return `${base}%`;
  }

  trackBySector(index: number, sector: MarketMapItem): string | number {
    return sector?.name ?? index;
  }

  trackByTicker(index: number, item: MarketMapSquare): string | number {
    return item?.ticker ?? index;
  }
}
