import {
  ApplicationRef,
  ChangeDetectorRef,
  Component,
  ComponentRef,
  ElementRef,
  Injector,
  Input,
  OnDestroy,
  AfterViewInit,
  ViewChild,
  ViewContainerRef
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { ReportsService, MarketMapParams } from 'src/app/service/reports.service';
import { Subscription, interval } from 'rxjs';
import { switchMap, startWith } from 'rxjs/operators';
import { MoneyToStrPipe } from 'src/app/pipes/money-to-str.pipe';
import { Router } from '@angular/router';

import { TreeMapComponent } from '../tree-map/tree-map.component'; // <-- поправь путь под себя
import { FootprintWidgetComponent } from '../../footprint/footprint-widget.component';
import { TreeMapEvent } from '../tree-map/tree-map.models';


@Component({
  standalone: true,
  selector: 'app-kendo-treemap2',
  templateUrl: './kendo-treemap2.component.html',
  styleUrls: ['./kendo-treemap2.component.css'],
  providers: [MoneyToStrPipe],
  imports: [CommonModule, TreeMapComponent]
})
export class KendoTreemapComponent2 implements AfterViewInit, OnDestroy {
  @Input() startDate?: Date;
  @Input() endDate?: Date;
  @Input() categories?: string;
  @Input() rperiod: string = 'day';
  @Input() top: number = 50;
  @Input() market: number = 0;


  aaa: TreeMapComponent;

  // данные для treemap
  data: any[] = [];

  // опции treemap (под твой JSON уже подходят дефолты, но явно укажем)
  treemapOptions = {
    type: 'squarified' as const,
    textField: 'name',
    valueField: 'value',
    colorField: 'color',
    childrenField: 'items',
    titleSize: 26,
    showTopLevelTitles: true,
  };

  private refreshSubscription?: Subscription;
  private intersectionObserver?: IntersectionObserver;

  // tooltip state
  tooltipVisible = false;
  tooltipLeft = 0;
  tooltipTop = 0;
  tooltipTextHtml = '';
  tooltipWidth = 400;
  tooltipHeight = 300;
  readonly tooltipLargeWidth = 400;
  readonly tooltipLargeHeight = 300;
  readonly tooltipSmallWidth = 220;
  readonly tooltipSmallHeight = 80;
  private readonly tooltipGap = 8;
  private item: any = null;

  private showTimer: any = null;
  private hideTimer: any = null;


  @ViewChild('treemap', { static: true }) treemap!: TreeMapComponent<any>;
  @ViewChild('wrapper', { static: true }) wrapper!: ElementRef<HTMLElement>;

  @ViewChild('tooltipHost', { read: ViewContainerRef }) tooltipHost!: ViewContainerRef;
  private tooltipCmp?: ComponentRef<FootprintWidgetComponent>;

constructor(
  private el: ElementRef<HTMLElement>,
  private reportsService: ReportsService,
  private moneyToStrPipe: MoneyToStrPipe,
  private router: Router,
  private cdr: ChangeDetectorRef,
  private injector: Injector,
  private appRef: ApplicationRef
) {}

  ngAfterViewInit(): void {

  

  const host = this.el.nativeElement; // всегда есть

  this.intersectionObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) this.startDataSubscription();
        else this.stopDataSubscription();
      }
    },
    { threshold: 0.1 }
  );

  this.intersectionObserver.observe(host);
  // Запускаем загрузку сразу, чтобы не зависеть от срабатывания IntersectionObserver в сложных лейаутах
  this.startDataSubscription();
  this.cdr.detectChanges();
}

  ngOnDestroy(): void {
    this.stopDataSubscription();
    this.intersectionObserver?.disconnect();
    this.hideTooltip();
  }

  public updateParams(params: MarketMapParams): void {
    this.startDate = params.startDate ?? this.startDate;
    this.endDate = params.endDate ?? this.endDate;
    this.categories = params.categories ?? this.categories;
    this.rperiod = params.rperiod ?? this.rperiod;
    this.top = params.top ?? this.top;
    this.market = params.market ?? this.market;

    // перезапуск загрузки
    this.stopDataSubscription();
    this.startDataSubscription();
  }

  private startDataSubscription(): void {
    if (this.refreshSubscription && !this.refreshSubscription.closed) return;

    this.refreshSubscription = interval(5000)
      .pipe(
        startWith(0),
        switchMap(() =>
          this.reportsService.callGetMarketMap({
            startDate: this.startDate,
            endDate: this.endDate,
            categories: this.categories,
            rperiod: this.rperiod,
            top: this.top,
            market: this.market,
          })
        )
      )
      .subscribe((data) => {
        this.data = data ?? [];
        // на главной страница root.value приходит 0, поэтому оставляем узлы с value=0 и даем дереву пересчитать их от children
        this.cdr.markForCheck();
      });
  }

  private stopDataSubscription(): void {
    this.refreshSubscription?.unsubscribe();
    this.refreshSubscription = undefined;
  }

  // ====== клики как раньше ======
  onTileClick(e: TreeMapEvent<any>): void {
    const item = e.dataItem;
    if (!item) return;

    if (item.ticker) {
      this.navigateTo('/FootPrint', { candlesOnly: true, rperiod: 'day', period: 5, ticker: item.ticker });
      return;
    }

    // сектор: собрать тикеры
    const arr = Array.isArray(item.items) ? item.items : [];
    const tickers = arr.map((i: any) => i?.ticker).filter(Boolean).join(',');
    if (tickers) {
      this.navigateTo('/MultiCandles', { tickers, period: 15 });
    }
  }

  private navigateTo(route: string, queryParams: any): void {
    this.router.navigate([route], { queryParams });
  }

  // ====== Tooltip (аналог kendoTooltip) ======
  onTileHover(e: TreeMapEvent<any>): void {
    this.item = e.dataItem;
    if (!this.item) return;

    const isTitle = !!e.node.children?.length;
    this.tooltipWidth = isTitle ? this.tooltipSmallWidth : this.tooltipLargeWidth;
    this.tooltipHeight = isTitle ? this.tooltipSmallHeight : this.tooltipLargeHeight;

    // showAfter 200ms
    if (this.showTimer) clearTimeout(this.showTimer);
    this.showTimer = setTimeout(() => {
      this.showTooltipAtUid(e.node.uid);
    }, 200);

    // hideAfter 15000ms (сбрасываем при движении)
    if (this.hideTimer) clearTimeout(this.hideTimer);
    this.hideTimer = setTimeout(() => this.hideTooltip(), 15000);
  }

  onMouseLeaveWrapper(): void {
    this.hideTooltip();
  }

  private showTooltipAtUid(uid: string): void {
    const host = this.wrapper?.nativeElement;
    if (!host) return;

    const tile = host.querySelector<HTMLElement>(`[data-uid="${uid}"]`);
    if (!tile) return;

    // Позиционируем справа от тайла, но удерживаем внутри wrapper
    const hostRect = host.getBoundingClientRect();
    const tileRect = tile.getBoundingClientRect();
    const gap = this.tooltipGap;

    let left = tileRect.right - hostRect.left + gap;
    let top = tileRect.top - hostRect.top;

    left = Math.min(left, hostRect.width - this.tooltipWidth - gap);
    left = Math.max(left, gap);

    top = Math.min(top, hostRect.height - this.tooltipHeight - gap);
    top = Math.max(top, gap);

    this.tooltipLeft = left;
    this.tooltipTop = top;

    this.renderTooltipContent();

    this.tooltipVisible = true;
    this.cdr.markForCheck();
  }

  private renderTooltipContent(): void {
    // очищаем прошлый footprint (если был)
    this.tooltipHost?.clear();
    this.tooltipCmp?.destroy();
    this.tooltipCmp = undefined;

    if (!this.item) {
      this.tooltipTextHtml = '';
      return;
    }

    // логика как в старом коде:
    // если есть cls -> показываем footprint
    if (this.item.cls) {
      // динамически создаём FootprintWidgetComponent внутрь tooltipHost
      const cmp = this.tooltipHost.createComponent(FootprintWidgetComponent, { injector: this.injector });
      this.tooltipCmp = cmp;

      cmp.instance.caption = this.item.name1 ?? this.item.name;
      cmp.instance.minimode = true;
      cmp.instance.presetIndex = 2326;
      cmp.instance.params = {
        ticker: this.item.ticker,
        period: 60,
        priceStep: 0.001,
        candlesOnly: true,
      };

      cmp.changeDetectorRef.detectChanges();
      this.tooltipTextHtml = '';
      return;
    }

    // иначе — простой текстовый тултип
    const vol = this.moneyToStrPipe.transform(this.item.value);
    this.tooltipTextHtml =
      `<p><b>${escapeHtml(this.item.name ?? '')}</b></p>` +
      `<p><b>Объем:</b> ${escapeHtml(vol ?? '')}</p>`;
  }

  private hideTooltip(): void {
    if (this.showTimer) clearTimeout(this.showTimer);
    if (this.hideTimer) clearTimeout(this.hideTimer);
    this.showTimer = null;
    this.hideTimer = null;

    this.tooltipVisible = false;
    this.item = null;

    this.tooltipHost?.clear();
    this.tooltipCmp?.destroy();
    this.tooltipCmp = undefined;

    this.cdr.markForCheck();
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
