import {
  Component,
  OnDestroy,
  Input,
  ElementRef,
  AfterViewInit,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
  ViewChild,
  ViewContainerRef,
  ComponentRef,
  Injector
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReportsService, MarketMapItem, MarketMapParams, MarketMapSquare } from 'src/app/service/reports.service';
import { Subscription, interval } from 'rxjs';
import { switchMap, startWith } from 'rxjs/operators';
import { Router } from '@angular/router';
import { MoneyToStrPipe } from 'src/app/pipes/money-to-str.pipe';
import { drob, MoneyToStr } from 'src/app/service/FootPrint/utils';
import { FootprintWidgetComponent } from 'src/app/components/footprint/components/footprint-widget/footprint-widget.component';
import { ColorSchemeService } from 'src/app/services/theme/color-scheme.service';
import { blendOverlayWithBase, resolvePanelBackgroundColor } from 'src/app/utils/color-utils';
import { DEFAULT_THEME_PRESET, ThemePreset } from 'src/app/services/theme/theme.model';

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
  private readonly tooltipGap = 6;
  private readonly tooltipLargeWidth = 500;
  private readonly tooltipLargeHeight = 400;
  private readonly tooltipSmallWidth = 220;
  private readonly tooltipSmallHeight = 80;
  private tooltipItem: MarketMapSquare | null = null;
  private tooltipCmp?: ComponentRef<FootprintWidgetComponent>;
  private showTimer: any = null;
  private hideTimer: any = null;
  private themePreset: ThemePreset = DEFAULT_THEME_PRESET;
  private themeObserver?: MutationObserver;
  private basePanelColor = '#ffffff';

  tooltipVisible = false;
  tooltipLeft = 0;
  tooltipTop = 0;
  tooltipWidth = this.tooltipLargeWidth;
  tooltipHeight = this.tooltipLargeHeight;
  tooltipTextHtml = '';

  @ViewChild('tooltipHost', { read: ViewContainerRef })
  tooltipHost?: ViewContainerRef;

  @ViewChild('board', { static: true })
  boardRef!: ElementRef<HTMLElement>;

  constructor(
    private reportsService: ReportsService,
    private router: Router,
    private el: ElementRef<HTMLElement>,
    private cdr: ChangeDetectorRef,
    private injector: Injector,
    private colorSchemeService: ColorSchemeService
  ) {}

  ngAfterViewInit(): void {
    this.applyThemePreset();
    this.watchThemePreset();
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
    this.hideTooltip();
    this.themeObserver?.disconnect();
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

  onTickerEnter(event: MouseEvent, item: MarketMapSquare): void {
    this.tooltipItem = item;
    this.tooltipWidth = this.hasFootprint(item) ? this.tooltipLargeWidth : this.tooltipSmallWidth;
    this.tooltipHeight = this.hasFootprint(item) ? this.tooltipLargeHeight : this.tooltipSmallHeight;

    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }

    if (this.showTimer) {
      clearTimeout(this.showTimer);
    }

    const target = event.currentTarget as HTMLElement | null;
    if (!target) return;

    this.showTimer = setTimeout(() => {
      this.showTooltipAt(target);
    }, 200);
  }

  onTickerLeave(): void {
    if (this.showTimer) {
      clearTimeout(this.showTimer);
      this.showTimer = null;
    }
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
    }
    this.hideTimer = setTimeout(() => this.hideTooltip(), 100);
  }

  onBoardLeave(): void {
    this.hideTooltip();
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

  private showTooltipAt(target: HTMLElement): void {
    const host = this.boardRef?.nativeElement ?? this.el.nativeElement;
    const hostRect = host.getBoundingClientRect();
    const tileRect = target.getBoundingClientRect();
    const gap = this.tooltipGap;

    const spaceRight = hostRect.right - tileRect.right;
    const spaceLeft = tileRect.left - hostRect.left;
    const rightLeft = tileRect.right - hostRect.left + gap;
    const leftLeft = tileRect.left - hostRect.left - this.tooltipWidth - gap;

    let left: number;
    if (spaceRight >= this.tooltipWidth + gap) {
      left = rightLeft;
    } else if (spaceLeft >= this.tooltipWidth + gap) {
      left = leftLeft;
    } else {
      left = spaceRight >= spaceLeft ? rightLeft : leftLeft;
      left = Math.min(left, hostRect.width - this.tooltipWidth - gap);
      left = Math.max(left, gap);
    }

    let top = tileRect.top - hostRect.top;
    top = Math.min(top, hostRect.height - this.tooltipHeight - gap);
    top = Math.max(top, gap);

    this.tooltipLeft = left;
    this.tooltipTop = top;

    this.renderTooltipContent();
    this.tooltipVisible = true;
    this.cdr.markForCheck();
  }

  private renderTooltipContent(): void {
    this.tooltipHost?.clear();
    this.tooltipCmp?.destroy();
    this.tooltipCmp = undefined;

    const item = this.tooltipItem;
    if (!item) {
      this.tooltipTextHtml = '';
      return;
    }

    if (this.hasFootprint(item)) {
      const cmp = this.tooltipHost?.createComponent(FootprintWidgetComponent, {
        injector: this.injector
      });
      if (cmp) {
        cmp.instance.caption = item.name1 ?? item.name ?? item.ticker;
        cmp.instance.minimode = true;
        cmp.instance.presetIndex = 2326;
        cmp.instance.params = {
          ticker: item.ticker,
          period: 60,
          priceStep: 0.001,
          candlesOnly: true
        };
        cmp.changeDetectorRef.detectChanges();
        this.tooltipCmp = cmp;
      }
      this.tooltipTextHtml = '';
      return;
    }

    const vol = MoneyToStr(item.value);
    this.tooltipTextHtml =
      `<p><b>${escapeHtml(item.name ?? item.ticker ?? '')}</b></p>` +
      `<p><b>Объем:</b> ${escapeHtml(vol ?? '')}</p>`;
  }

  private hideTooltip(): void {
    if (this.showTimer) {
      clearTimeout(this.showTimer);
      this.showTimer = null;
    }
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }

    this.tooltipVisible = false;
    this.tooltipItem = null;
    this.tooltipTextHtml = '';
    this.tooltipHost?.clear();
    this.tooltipCmp?.destroy();
    this.tooltipCmp = undefined;
    this.cdr.markForCheck();
  }

  private hasFootprint(item: MarketMapSquare | null): boolean {
    if (!item) return false;
    return item.cls !== null && item.cls !== undefined;
  }

  resolveTickerColor(item: MarketMapSquare | null): string {
    if (!item) {
      return this.basePanelColor;
    }
    const overlay =
      typeof item.colorRgba === 'string' && item.colorRgba.trim()
        ? item.colorRgba
        : item.color;
    return blendOverlayWithBase(this.basePanelColor, overlay);
  }

  private applyThemePreset(): void {
    const preset = this.readThemePreset();
    this.themePreset = preset;
    this.colorSchemeService.setPreset(this.el.nativeElement, preset);
    this.basePanelColor = resolvePanelBackgroundColor(this.el.nativeElement);
    this.cdr.markForCheck();
  }

  private watchThemePreset(): void {
    const docEl = this.el.nativeElement.ownerDocument?.documentElement;
    if (!docEl || typeof MutationObserver === 'undefined') {
      return;
    }
    this.themeObserver = new MutationObserver(() => {
      const preset = this.readThemePreset();
      if (preset === this.themePreset) {
        return;
      }
      this.applyThemePreset();
    });
    this.themeObserver.observe(docEl, { attributes: true, attributeFilter: ['class'] });
  }

  private readThemePreset(): ThemePreset {
    try {
      const stored = window.localStorage.getItem('uiThemePreset');
      if (stored === 'Dark' || stored === 'Light') {
        return stored;
      }
    } catch {
      // ignore storage failures
    }
    const doc = this.el.nativeElement.ownerDocument;
    if (doc?.documentElement?.classList.contains('mat-dark-theme') || doc?.body?.classList.contains('mat-dark-theme')) {
      return 'Dark';
    }
    return DEFAULT_THEME_PRESET;
  }
}

function escapeHtml(s: string): string {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
