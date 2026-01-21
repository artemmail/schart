import {
  AfterViewInit,
  Component,
  ComponentRef,
  ElementRef,
  Injector,
  Input,
  OnDestroy,
  OnInit,
  ViewChild,
  ViewContainerRef,
} from '@angular/core';

import { DomSanitizer, SafeHtml, Title } from '@angular/platform-browser';
import { TickerAutocompleteComponent } from '../../Controls/ticker-autocomplete/ticker-autocomplete.component';
import { ReportsService } from 'src/app/service/reports.service';
import { MaterialModule } from 'src/app/material.module';
import { ColorSchemeService } from 'src/app/services/theme/color-scheme.service';
import { StockChartPalette, STOCK_CHART_DEFAULT_PALETTE } from 'src/app/services/theme/theme.model';
import { FootprintWidgetComponent } from 'src/app/components/footprint/components/footprint-widget/footprint-widget.component';
import { FootPrintParameters } from 'src/app/models/Params';


@Component({
  selector: 'app-seasonality',
  templateUrl: './seasonality.component.html',
  styleUrls: ['./seasonality.component.css'],
    standalone: true,
  imports: [MaterialModule, TickerAutocompleteComponent]
})
export class SeasonalityComponent implements OnInit, AfterViewInit, OnDestroy {
  

 
  chartHtml: SafeHtml = '';
  @Input() ticker:string = "SBER";
  palette: StockChartPalette = { ...STOCK_CHART_DEFAULT_PALETTE };

  private chartData: any[] | null = null;
  private themePreset: 'Light' | 'Dark' = 'Light';
  private themeObserver?: MutationObserver;
  private tooltipCmp?: ComponentRef<FootprintWidgetComponent>;
  private showTimer: any = null;
  private hideTimer: any = null;
  private tooltipKey: string | null = null;
  private pendingTooltipKey: string | null = null;

  readonly tooltipLargeWidth = 500;
  readonly tooltipLargeHeight = 400;
  readonly tooltipGap = 8;
  tooltipVisible = false;
  tooltipLeft = 0;
  tooltipTop = 0;
  tooltipWidth = this.tooltipLargeWidth;
  tooltipHeight = this.tooltipLargeHeight;

  private readonly monthLabels = [
    'янв',
    'фев',
    'мар',
    'апр',
    'май',
    'июн',
    'июл',
    'авг',
    'сен',
    'окт',
    'ноя',
    'дек',
  ];

  @ViewChild('tooltipHost', { read: ViewContainerRef })
  tooltipHost?: ViewContainerRef;
  @ViewChild('chartHost', { static: true })
  chartHost?: ElementRef<HTMLElement>;
  

  constructor(
    private sanitizer: DomSanitizer,
    private reportsService: ReportsService,
    private titleService: Title,
    private colorSchemeService: ColorSchemeService,
    private hostRef: ElementRef<HTMLElement>,
    private injector: Injector
  ) {
    titleService.setTitle("Таблица сезонной активности рынка акций");
    
   }

  ngOnInit() {
    
  }

  onTickerSelected(ticker: any) {

    this.loadChartData(ticker);
  }

  ngAfterViewInit() {
    this.applyThemePreset();
    this.watchThemePreset();
    // Загружать данные после завершения инициализации представлений
    this.loadChartData(this.ticker);
  }

  ngOnDestroy(): void {
    this.hideTooltip();
    this.themeObserver?.disconnect();
  }


 


  loadChartData(ticker:string) {
    this.applyThemePreset();
    this.reportsService.getSeasonality(ticker)
    .subscribe(data => {
      this.chartData = data ?? [];
      this.chartHtml = this.buildChart(this.chartData);
      this.hideTooltip();
    });
  }

  buildChart(data: any[]): SafeHtml {
    let res = "";
    let max = 0;
    const borderColor = this.palette.gridSoft || this.palette.grid;
    const textColor = this.palette.text;
    const scaleMaxFallback = 1;
    const headerRow = Array.isArray(data?.[0]) ? data[0] : [];
    for (let i = 1; i < data.length; i++) {
      for (let j = 1; j < data[i].length; j++) {
        const value = Number(data[i][j]);
        if (Number.isFinite(value)) {
          max = Math.max(max, Math.abs(value));
        }
      }
    }
    const scaleMax = max > 0 ? max : scaleMaxFallback;
    for (let i = 0; i < data.length; i++) {
      const row = Array.isArray(data[i]) ? data[i] : [];
      const rowYear = i > 0 ? this.parseYear(row[0]) : null;
      res += '<table style="background: transparent; border-collapse: collapse;">';
      res += '<tr>';
      for (let j = 0; j < row.length; j++) {
        let color = "transparent";
        let t = row[j];
        const month = i > 0 && j > 0 ? this.parseMonth(headerRow[j]) : null;
        const cellYear = month && rowYear ? rowYear : null;
        if (i > 0 && j > 0) {
          if (t == null)
            t = '';
          else {
            const numericValue = Number(t);
            if (!Number.isFinite(numericValue)) {
              t = '';
            } else {
              t = numericValue / 100 + "%";
              const intensity = Math.min(Math.abs(numericValue) / scaleMax, 1);
              if (numericValue < 0) {
                color = this.toRgba(this.palette.down, intensity);
              } else {
                color = this.toRgba(this.palette.up, intensity);
              }
            }
          }
        }
        if (t == null) t = '';
        res += this.madediv(t, color, borderColor, textColor, cellYear, month);
      }
      res += '</tr>';
    }
    res += '</table>';
    return this.sanitizer.bypassSecurityTrustHtml( res);
  }

  madediv(
    data: any,
    color: string,
    borderColor: string,
    textColor: string,
    year?: number | null,
    month?: number | null
  ): string {
    // Используйте обратные кавычки для поддержки интерполяции строк
    const hasMeta = Number.isFinite(year) && Number.isFinite(month);
    const meta = hasMeta ? ` data-year="${year}" data-month="${month}"` : '';
    return `<td${meta} style="border: 1px solid ${borderColor}; background:${color}; color:${textColor};"><div style="padding: 0.9em 0; text-align: center; font-size: 13pt; width: 74px;">${data}</div></td>`;
  }

  private applyThemePreset(): void {
    const preset = this.readThemePreset();
    this.themePreset = preset;
    this.palette = this.colorSchemeService.setPreset(this.hostRef.nativeElement, preset);
  }

  private watchThemePreset(): void {
    const docEl = this.hostRef.nativeElement.ownerDocument?.documentElement;
    if (!docEl || typeof MutationObserver === 'undefined') {
      return;
    }
    this.themeObserver = new MutationObserver(() => {
      const preset = this.readThemePreset();
      if (preset === this.themePreset) {
        return;
      }
      this.applyThemePreset();
      if (this.chartData) {
        this.chartHtml = this.buildChart(this.chartData);
        this.hideTooltip();
      }
    });
    this.themeObserver.observe(docEl, { attributes: true, attributeFilter: ['class'] });
  }

  private readThemePreset(): 'Light' | 'Dark' {
    try {
      const stored = window.localStorage.getItem('uiThemePreset');
      if (stored === 'Dark' || stored === 'Light') {
        return stored;
      }
    } catch {
      // ignore storage failures
    }
    const doc = this.hostRef.nativeElement.ownerDocument;
    if (doc?.documentElement?.classList.contains('mat-dark-theme') || doc?.body?.classList.contains('mat-dark-theme')) {
      return 'Dark';
    }
    return 'Light';
  }

  private toRgba(color: string, alpha: number): string {
    const clamped = Math.max(0, Math.min(1, alpha));
    const rgbMatch = /^rgba?\((\d+),\s*(\d+),\s*(\d+)/i.exec(color);
    if (rgbMatch) {
      return `rgba(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}, ${clamped})`;
    }

    let hex = color.trim().replace(/^#/, '');
    if (hex.length === 3) {
      hex = hex.split('').map((c) => c + c).join('');
    }
    if (hex.length < 6) {
      return `rgba(0, 0, 0, ${clamped})`;
    }

    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${clamped})`;
  }

  onChartMouseMove(event: MouseEvent): void {
    const cell = this.findCell(event.target);
    if (!cell) {
      this.queueHideTooltip();
      return;
    }

    const meta = this.getCellMeta(cell);
    if (!meta) {
      this.queueHideTooltip();
      return;
    }

    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }

    if (this.tooltipVisible && this.tooltipKey === meta.key) {
      this.positionTooltip(cell);
      return;
    }

    if (this.pendingTooltipKey === meta.key) {
      return;
    }

    if (this.showTimer) {
      clearTimeout(this.showTimer);
    }

    this.pendingTooltipKey = meta.key;
    this.showTimer = setTimeout(() => {
      this.pendingTooltipKey = null;
      this.showTooltipForCell(cell, meta);
    }, 200);
  }

  onChartMouseLeave(): void {
    this.queueHideTooltip();
  }

  private queueHideTooltip(): void {
    if (this.showTimer) {
      clearTimeout(this.showTimer);
      this.showTimer = null;
    }
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
    }
    this.hideTimer = setTimeout(() => this.hideTooltip(), 120);
  }

  private showTooltipForCell(
    cell: HTMLElement,
    meta: { year: number; month: number; key: string }
  ): void {
    this.tooltipKey = meta.key;
    this.tooltipWidth = this.tooltipLargeWidth;
    this.tooltipHeight = this.tooltipLargeHeight;
    this.positionTooltip(cell);
    this.renderTooltipContent(meta);
    this.tooltipVisible = true;
  }

  private positionTooltip(cell: HTMLElement): void {
    const host = this.chartHost?.nativeElement ?? this.hostRef.nativeElement;
    const hostRect = host.getBoundingClientRect();
    const cellRect = cell.getBoundingClientRect();
    const gap = this.tooltipGap;

    const spaceRight = hostRect.right - cellRect.right;
    const spaceLeft = cellRect.left - hostRect.left;
    const rightLeft = cellRect.right - hostRect.left + gap;
    const leftLeft = cellRect.left - hostRect.left - this.tooltipWidth - gap;

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

    let top = cellRect.top - hostRect.top;
    top = Math.min(top, hostRect.height - this.tooltipHeight - gap);
    top = Math.max(top, gap);

    this.tooltipLeft = left;
    this.tooltipTop = top;
  }

  private renderTooltipContent(meta: { year: number; month: number }): void {
    this.tooltipHost?.clear();
    this.tooltipCmp?.destroy();
    this.tooltipCmp = undefined;

    const params = this.buildFootprintParams(meta.year, meta.month);
    if (!params || !this.tooltipHost) {
      return;
    }

    const cmp = this.tooltipHost.createComponent(FootprintWidgetComponent, { injector: this.injector });
    cmp.instance.caption = this.buildTooltipCaption(meta.year, meta.month);
    cmp.instance.minimode = true;
    cmp.instance.presetIndex = 2326;
    cmp.instance.params = params;
    cmp.changeDetectorRef.detectChanges();
    this.tooltipCmp = cmp;
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
    this.tooltipKey = null;
    this.pendingTooltipKey = null;

    this.tooltipHost?.clear();
    this.tooltipCmp?.destroy();
    this.tooltipCmp = undefined;
  }

  private findCell(target: EventTarget | null): HTMLElement | null {
    if (!target) return null;
    let el: HTMLElement | null = null;
    if (target instanceof HTMLElement) {
      el = target;
    } else if ((target as Node)?.parentElement instanceof HTMLElement) {
      el = (target as Node).parentElement;
    }
    if (!el?.closest) return null;
    return el.closest('td[data-year][data-month]') as HTMLElement | null;
  }

  private getCellMeta(cell: HTMLElement): { year: number; month: number; key: string } | null {
    const yearRaw = cell.dataset['year'];
    const monthRaw = cell.dataset['month'];
    if (!yearRaw || !monthRaw) return null;
    const year = Number(yearRaw);
    const month = Number(monthRaw);
    if (!Number.isFinite(year) || !Number.isFinite(month)) return null;
    if (month < 1 || month > 12) return null;
    return { year, month, key: `${year}-${month}` };
  }

  private buildFootprintParams(year: number, month: number): FootPrintParameters | null {
    if (!this.ticker) return null;
    const range = this.getMonthRange(year, month);
    if (!range) return null;
    return {
      ticker: this.ticker,
      period: 1440,
      priceStep: 0.001,
      candlesOnly: true,
      startDate: range.start,
      endDate: range.end,
    };
  }

  private buildTooltipCaption(year: number, month: number): string {
    const monthLabel = this.monthLabels[month - 1] ?? String(month).padStart(2, '0');
    const parts = [this.ticker, monthLabel, String(year)].filter(Boolean);
    return parts.join(' ');
  }

  private getMonthRange(year: number, month: number): { start: Date; end: Date } | null {
    if (!Number.isFinite(year) || !Number.isFinite(month)) return null;
    const monthIndex = month - 1;
    if (monthIndex < 0 || monthIndex > 11) return null;
    const start = new Date(year, monthIndex, 1, 0, 0, 0, 0);
    const end = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);
    return { start, end };
  }

  private parseYear(value: unknown): number | null {
    if (value == null) return null;
    const str = String(value).trim();
    const match = str.match(/\d{4}/);
    const year = match ? Number(match[0]) : Number(str);
    if (!Number.isFinite(year)) return null;
    if (year < 1900 || year > 2100) return null;
    return Math.floor(year);
  }

  private parseMonth(value: unknown): number | null {
    if (value == null) return null;
    if (typeof value === 'number' && Number.isFinite(value)) {
      const month = Math.round(value);
      return month >= 1 && month <= 12 ? month : null;
    }

    const raw = String(value).trim().toLowerCase();
    if (!raw) return null;
    const compact = raw.replace(/\s+/g, '').replace(/[^0-9a-zа-яё]/gi, '');
    const numeric = parseInt(compact, 10);
    if (!Number.isNaN(numeric) && numeric >= 1 && numeric <= 12) {
      return numeric;
    }

    const monthMap: Array<{ value: number; keys: string[] }> = [
      { value: 1, keys: ['jan', 'january', 'янв', 'январ', 'январь'] },
      { value: 2, keys: ['feb', 'february', 'фев', 'феврал', 'февраль'] },
      { value: 3, keys: ['mar', 'march', 'мар', 'март'] },
      { value: 4, keys: ['apr', 'april', 'апр', 'апрель'] },
      { value: 5, keys: ['may', 'май'] },
      { value: 6, keys: ['jun', 'june', 'июн', 'июнь'] },
      { value: 7, keys: ['jul', 'july', 'июл', 'июль'] },
      { value: 8, keys: ['aug', 'august', 'авг', 'август'] },
      { value: 9, keys: ['sep', 'sept', 'september', 'сен', 'сент', 'сентябрь'] },
      { value: 10, keys: ['oct', 'october', 'окт', 'октябрь'] },
      { value: 11, keys: ['nov', 'november', 'ноя', 'ноябр', 'ноябрь'] },
      { value: 12, keys: ['dec', 'december', 'дек', 'декабр', 'декабрь'] },
    ];

    for (const entry of monthMap) {
      if (entry.keys.some((key) => compact.startsWith(key))) {
        return entry.value;
      }
    }

    return null;
  }

}
