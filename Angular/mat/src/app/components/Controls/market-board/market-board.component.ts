import {
  Component,
  OnInit,
  OnDestroy,
  Input,
  ElementRef,
  AfterViewInit,
  ChangeDetectorRef,
  Injector
} from '@angular/core';
import { ReportsService, MarketMapParams } from 'src/app/service/reports.service';
import { Subscription, interval } from 'rxjs';
import { switchMap, startWith } from 'rxjs/operators';
import { Router } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-market-board',
  templateUrl: './market-board.component.html',
  styleUrls: ['./market-board.component.css']
})
export class MarketBoardComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input() startDate?: Date;
  @Input() endDate?: Date;
  @Input() categories?: string;
  @Input() rperiod: string = 'day';
  @Input() top: number = 50;
  @Input() market: number = 0;

  boardData: any[] = [];
  private refreshSubscription: Subscription;
  private intersectionObserver: IntersectionObserver;

  constructor(
    private reportsService: ReportsService,
    private router: Router,
    private el: ElementRef,
    private cdr: ChangeDetectorRef,
    private injector: Injector
  ) {}

  ngOnInit(): void {
    this.loadBoardData();
  }

  ngAfterViewInit() {
    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.startDataSubscription();
          } else {
            this.stopDataSubscription();
          }
        });
      },
      { threshold: 0.1 }
    );

    this.intersectionObserver.observe(this.el.nativeElement);
    this.cdr.detectChanges();
  }

  ngOnDestroy(): void {
    this.stopDataSubscription();
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }
  }

  // Новый метод для обновления параметров и принудительной перезагрузки данных
  public updateParams(params: MarketMapParams): void {
    // Обновляем входные параметры
    this.startDate = params.startDate ?? this.startDate;
    this.endDate = params.endDate ?? this.endDate;
    this.categories = params.categories ?? this.categories;
    this.rperiod = params.rperiod ?? this.rperiod;
    this.top = params.top ?? this.top;
    this.market = params.market ?? this.market;

    // Останавливаем текущее автообновление
    this.stopDataSubscription();
    // Перезагружаем данные сразу
    this.loadBoardData();
    // Если компонент видим, возобновим автообновление
    if (this.isIntersecting()) {
      this.startDataSubscription();
    }
  }

  // Метод для проверки видимости компонента
  private isIntersecting(): boolean {
    // Так как IntersectionObserver уже используется, можно
    // проверить напрямую, но для простоты вернем true.
    // При необходимости можно хранить состояние visibility
    // в обработчике IntersectionObserver.
    return true;
  }

  private startDataSubscription() {
    if (this.refreshSubscription && !this.refreshSubscription.closed) {
      return;
    }

    this.refreshSubscription = interval(5000).pipe(
      startWith(0),
      switchMap(() => this.reportsService.callGetMarketMap({
        startDate: this.startDate,
        endDate: this.endDate,
        categories: this.categories,
        rperiod: this.rperiod,
        top: this.top,
        market: this.market
      }))
    ).subscribe(data => {
      this.boardData = data || [];
      this.cdr.detectChanges();
    });
  }

  private stopDataSubscription() {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }

  private loadBoardData() {
    if (!this.categories || this.categories.trim() === '') {
      // Если нет категорий, очищаем данные
      this.boardData = [];
      this.cdr.detectChanges();
      return;
    }

    this.reportsService.callGetMarketMap({
      startDate: this.startDate,
      endDate: this.endDate,
      categories: this.categories,
      rperiod: this.rperiod,
      top: this.top,
      market: this.market
    }).subscribe(data => {
      this.boardData = data || [];
      this.cdr.detectChanges();
    }, error => {
      console.error('Ошибка загрузки данных для доски:', error);
      this.boardData = [];
      this.cdr.detectChanges();
    });
  }

  navigateToFootPrint(ticker: string): void {
    this.router.navigate(['/FootPrint'], { queryParams: { ticker } });
  }

  navigateToMultiCandles(tickers: string): void {
    this.router.navigate(['/MultiCandles'], { queryParams: { tickers: tickers, period: 15 } });
  }

  formatPercent(percent: number): string {
    if (percent == null) return '';
    const p = percent.toFixed(2);
    if (percent < 0) return `▼${p}%`;
    if (percent > 0) return `▲${p}%`;
    return `${p}%`;
  }

  moneyToStr(val: number): string {
    return val != null ? val.toLocaleString('ru-RU', { minimumFractionDigits: 0 }) : '';
  }

  onTickerClick(item: any) {
    if (item && item.ticker) {
      this.navigateToFootPrint(item.ticker);
    } else if (item && item.items && item.items.length > 0) {
      const tickers = item.items.map((i: any) => i.ticker).join(',');
      this.navigateToMultiCandles(tickers);
    }
  }

  getTickers(sector: any): string {
    if (!sector || !sector.items) return '';
    return sector.items.map((i: any) => i.ticker).join(',');
  }
}
