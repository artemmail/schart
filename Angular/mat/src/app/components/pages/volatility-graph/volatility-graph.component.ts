import { CommonModule } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription, debounceTime, finalize, of, switchMap, takeUntil, catchError, tap } from 'rxjs';
import { MaterialModule } from 'src/app/material.module';
import { VolatilityGraphPoint, VolatilityGraphService } from 'src/app/service/volatility-graph.service';

interface AssetItem {
  code: string;
  title: string;
  assetType?: string | null;
}

interface OptionSeriesItem {
  code: string;
  expirationDate?: string | null;
  centralStrike?: number | null;
}

interface AxisTick {
  value: number;
  position: number;
}

interface ChartPoint extends VolatilityGraphPoint {
  x: number;
  y: number;
}

interface VolatilityChart {
  width: number;
  height: number;
  plotLeft: number;
  plotTop: number;
  plotWidth: number;
  plotHeight: number;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  xTicks: AxisTick[];
  yTicks: AxisTick[];
  points: ChartPoint[];
  path: string;
}

interface Tooltip {
  left: number;
  top: number;
  strike: string;
  iv: string;
}

interface Metrics {
  atmIv?: number | null;
  skew?: number | null;
  minIv?: number | null;
  maxIv?: number | null;
  pointCount: number;
  centerLabel: string;
}

interface CachedGraph {
  points: VolatilityGraphPoint[];
  centralStrike?: number | null;
  expirationDate?: string | null;
  fetchedAt: Date;
}

@Component({
  standalone: true,
  selector: 'app-volatility-graph',
  imports: [CommonModule, FormsModule, MaterialModule],
  templateUrl: './volatility-graph.component.html',
  styleUrls: ['./volatility-graph.component.scss']
})
export class VolatilityGraphComponent implements OnInit, OnDestroy {
  assets: AssetItem[] = [];
  assetTypes: string[] = [];
  series: OptionSeriesItem[] = [];

  selectedAsset = '';
  selectedAssetType: string | null = null;
  selectedSeries = '';

  showPoints = true;
  showCentralStrikeLine = true;
  autoRefresh = false;

  loading = false;
  error?: string;
  lastUpdated?: Date | null;

  points: VolatilityGraphPoint[] = [];
  chart?: VolatilityChart;
  tooltip?: Tooltip;
  metrics: Metrics = { pointCount: 0, centerLabel: '' };

  centralStrike?: number | null;
  expirationDate?: string | null;

  private readonly reload$ = new Subject<boolean>();
  private readonly destroy$ = new Subject<void>();
  private reloadSub?: Subscription;
  private autoRefreshId?: number;
  private readonly cache = new Map<string, CachedGraph>();

  constructor(
    private readonly http: HttpClient,
    private readonly graphService: VolatilityGraphService
  ) {}

  ngOnInit(): void {
    this.reloadSub = this.reload$
      .pipe(
        debounceTime(300),
        switchMap((force) => this.fetchGraph(force)),
        takeUntil(this.destroy$)
      )
      .subscribe();

    this.loadAssets();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.reloadSub?.unsubscribe();
    this.stopAutoRefresh();
  }

  onAssetChange(): void {
    this.updateAssetTypeOptions();
    this.series = [];
    this.selectedSeries = '';
    this.clearChart();
    this.loadSeries();
  }

  onAssetTypeChange(): void {
    this.loadSeries();
  }

  onSeriesChange(): void {
    this.applySeriesMeta();
    this.triggerReload(false);
  }

  toggleAutoRefresh(): void {
    if (this.autoRefresh) {
      this.startAutoRefresh();
    } else {
      this.stopAutoRefresh();
    }
  }

  refresh(): void {
    this.triggerReload(true);
  }

  onPointHover(event: MouseEvent, point: ChartPoint): void {
    const target = event.currentTarget as Element | null;
    const panel = target?.closest('.chart-panel') as HTMLElement | null;
    const rect = panel?.getBoundingClientRect();

    const left = rect ? event.clientX - rect.left + 12 : 0;
    const top = rect ? event.clientY - rect.top + 12 : 0;

    this.tooltip = {
      left,
      top,
      strike: point.strike.toFixed(2),
      iv: `${point.volatility.toFixed(2)}%`
    };
  }

  onPointLeave(): void {
    this.tooltip = undefined;
  }

  getCentralLineX(chart: VolatilityChart): number | null {
    if (!this.showCentralStrikeLine || this.centralStrike == null) {
      return null;
    }

    if (this.centralStrike < chart.xMin || this.centralStrike > chart.xMax) {
      return null;
    }

    return this.scale(this.centralStrike, chart.xMin, chart.xMax, chart.plotLeft, chart.plotLeft + chart.plotWidth);
  }

  private triggerReload(force: boolean): void {
    this.reload$.next(force);
  }

  private startAutoRefresh(): void {
    this.stopAutoRefresh();
    this.autoRefreshId = window.setInterval(() => {
      this.triggerReload(true);
    }, 15000);
  }

  private stopAutoRefresh(): void {
    if (this.autoRefreshId) {
      window.clearInterval(this.autoRefreshId);
      this.autoRefreshId = undefined;
    }
  }

  private loadAssets(): void {
    this.loading = true;
    this.error = undefined;

    this.http.get<any[]>('/api/option-calc/assets')
      .pipe(
        tap((raw) => {
          this.assets = this.normalizeAssets(raw);
          this.selectedAsset = this.assets[0]?.code ?? '';
          this.updateAssetTypeOptions();
        }),
        switchMap(() => this.selectedAsset ? this.loadSeriesObservable() : of(null)),
        finalize(() => {
          this.loading = false;
        }),
        catchError((err) => {
          this.error = this.extractError(err, 'Не удалось получить список базовых активов.');
          this.assets = [];
          return of(null);
        })
      )
      .subscribe();
  }

  private loadSeries(): void {
    this.loadSeriesObservable().subscribe();
  }

  private loadSeriesObservable() {
    if (!this.selectedAsset) {
      return of(null);
    }

    this.loading = true;
    this.error = undefined;

    let params = new HttpParams().set('assetCode', this.selectedAsset);
    if (this.selectedAssetType) {
      params = params.set('assetType', this.selectedAssetType);
    }

    return this.http.get<any[]>('/api/option-calc/optionseries', { params })
      .pipe(
        tap((raw) => {
          this.series = this.normalizeSeries(raw);
          this.selectedSeries = this.series[0]?.code ?? '';
          this.applySeriesMeta();
          if (this.selectedSeries) {
            this.triggerReload(false);
          }
        }),
        finalize(() => {
          this.loading = false;
        }),
        catchError((err) => {
          this.error = this.extractError(err, 'Не удалось получить серии опционов.');
          this.series = [];
          this.selectedSeries = '';
          return of(null);
        })
      );
  }

  private fetchGraph(force: boolean) {
    if (!this.selectedAsset || !this.selectedSeries) {
      return of(null);
    }

    const cacheKey = `${this.selectedAsset}|${this.selectedSeries}|${this.selectedAssetType ?? ''}`;
    if (!force && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      this.applyGraphData(cached.points, cached.centralStrike, cached.expirationDate, cached.fetchedAt);
      return of(null);
    }

    this.loading = true;
    this.error = undefined;

    return this.graphService.getVolatilityGraph({
      assetCode: this.selectedAsset,
      optionSeriesCode: this.selectedSeries,
      assetType: this.selectedAssetType
    }).pipe(
      tap((points) => {
        const fetchedAt = new Date();
        this.cache.set(cacheKey, {
          points,
          centralStrike: this.centralStrike ?? null,
          expirationDate: this.expirationDate ?? null,
          fetchedAt
        });
        this.applyGraphData(points, this.centralStrike, this.expirationDate, fetchedAt);
      }),
      catchError((err) => {
        this.error = this.extractError(err, 'Нет данных для выбранной серии.');
        this.clearChart();
        return of(null);
      }),
      finalize(() => {
        this.loading = false;
      })
    );
  }

  private applyGraphData(
    points: VolatilityGraphPoint[],
    centralStrike: number | null | undefined,
    expirationDate: string | null | undefined,
    fetchedAt: Date
  ): void {
    this.points = (points ?? [])
      .map((p) => ({
        strike: this.toNumber((p as any)?.strike),
        volatility: this.toNumber((p as any)?.volatility)
      }))
      .filter((p): p is VolatilityGraphPoint => p.strike != null && p.volatility != null);
    this.centralStrike = centralStrike ?? this.centralStrike ?? null;
    this.expirationDate = expirationDate ?? this.expirationDate ?? null;
    this.lastUpdated = fetchedAt;
    this.buildChart();
  }

  private buildChart(): void {
    this.tooltip = undefined;
    if (!this.points || this.points.length === 0) {
      this.chart = undefined;
      this.metrics = {
        pointCount: 0,
        centerLabel: this.centralStrike ? 'central' : 'median'
      };
      return;
    }

    const sorted = [...this.points].sort((a, b) => a.strike - b.strike);
    const strikes = sorted.map((p) => p.strike);
    const vols = sorted.map((p) => p.volatility);

    const width = 840;
    const height = 360;
    const plotLeft = 64;
    const plotTop = 24;
    const plotWidth = width - plotLeft - 24;
    const plotHeight = height - plotTop - 40;

    const xMin = Math.min(...strikes);
    const xMax = Math.max(...strikes);
    const yMinRaw = Math.min(...vols);
    const yMaxRaw = Math.max(...vols);
    const yRange = yMaxRaw - yMinRaw;
    const yPadding = yRange === 0 ? Math.max(Math.abs(yMaxRaw) * 0.1, 0.01) : yRange * 0.1;
    const yMin = yMinRaw - yPadding;
    const yMax = yMaxRaw + yPadding;

    const points = sorted.map((p) => ({
      ...p,
      x: this.scale(p.strike, xMin, xMax, plotLeft, plotLeft + plotWidth),
      y: this.scale(p.volatility, yMin, yMax, plotTop + plotHeight, plotTop)
    }));

    const path = points
      .map((p, index) => `${index === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
      .join(' ');

    this.metrics = this.calculateMetrics(sorted);
    if (sorted.length < 3) {
      this.chart = undefined;
      return;
    }

    this.chart = {
      width,
      height,
      plotLeft,
      plotTop,
      plotWidth,
      plotHeight,
      xMin,
      xMax,
      yMin,
      yMax,
      xTicks: this.makeTicks(xMin, xMax, 6).map((value) => ({
        value,
        position: this.scale(value, xMin, xMax, plotLeft, plotLeft + plotWidth)
      })),
      yTicks: this.makeTicks(yMin, yMax, 5).map((value) => ({
        value,
        position: this.scale(value, yMin, yMax, plotTop + plotHeight, plotTop)
      })),
      points,
      path
    };
  }

  private calculateMetrics(points: VolatilityGraphPoint[]): Metrics {
    const sorted = [...points].sort((a, b) => a.strike - b.strike);
    const minIv = Math.min(...sorted.map((p) => p.volatility));
    const maxIv = Math.max(...sorted.map((p) => p.volatility));

    let centerStrike = this.centralStrike;
    let centerLabel = 'central';
    if (centerStrike == null) {
      centerStrike = sorted[Math.floor(sorted.length / 2)].strike;
      centerLabel = 'median';
    }

    const atm = this.findNearest(sorted, centerStrike);
    const left = this.findNearest(sorted, centerStrike * 0.95, 'below');
    const right = this.findNearest(sorted, centerStrike * 1.05, 'above');

    const skew = left && right ? left.volatility - right.volatility : null;

    return {
      atmIv: atm?.volatility ?? null,
      skew,
      minIv,
      maxIv,
      pointCount: sorted.length,
      centerLabel
    };
  }

  private findNearest(
    points: VolatilityGraphPoint[],
    target: number,
    direction?: 'below' | 'above'
  ): VolatilityGraphPoint | null {
    let candidates = points;
    if (direction === 'below') {
      candidates = points.filter((p) => p.strike <= target);
    } else if (direction === 'above') {
      candidates = points.filter((p) => p.strike >= target);
    }

    if (candidates.length === 0) {
      return null;
    }

    return candidates.reduce((prev, next) =>
      Math.abs(next.strike - target) < Math.abs(prev.strike - target) ? next : prev
    );
  }

  private scale(value: number, min: number, max: number, outMin: number, outMax: number): number {
    if (max === min) {
      return (outMin + outMax) / 2;
    }

    return outMin + ((value - min) / (max - min)) * (outMax - outMin);
  }

  private makeTicks(min: number, max: number, count: number): number[] {
    if (count <= 1 || max === min) {
      return [min];
    }

    const step = (max - min) / (count - 1);
    return Array.from({ length: count }, (_, i) => min + step * i);
  }

  private normalizeAssets(raw: any[]): AssetItem[] {
    if (!Array.isArray(raw)) {
      return [];
    }

    return raw
      .map((item) => ({
        code: String(item?.asset_code ?? item?.assetCode ?? item?.AssetCode ?? '').trim(),
        title: String(item?.title ?? item?.Title ?? '').trim(),
        assetType: String(item?.asset_type ?? item?.assetType ?? item?.AssetType ?? '').trim() || null
      }))
      .filter((item) => !!item.code);
  }

  private normalizeSeries(raw: any[]): OptionSeriesItem[] {
    if (!Array.isArray(raw)) {
      return [];
    }

    return raw
      .map((item) => ({
        code: String(item?.optionseries_code ?? item?.optionSeriesCode ?? item?.OptionSeriesCode ?? '').trim(),
        expirationDate: this.normalizeDate(item?.expiration_date ?? item?.expirationDate ?? item?.ExpirationDate),
        centralStrike: this.toNumber(item?.central_strike ?? item?.centralStrike ?? item?.CentralStrike)
      }))
      .filter((item) => !!item.code);
  }

  private normalizeDate(value?: string | null): string | null {
    if (!value) {
      return null;
    }

    const trimmed = String(value).trim();
    const match = /^(\\d{4}-\\d{2}-\\d{2})/.exec(trimmed);
    if (match) {
      return match[1];
    }

    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) {
      return trimmed;
    }

    const yyyy = parsed.getFullYear();
    const mm = String(parsed.getMonth() + 1).padStart(2, '0');
    const dd = String(parsed.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  private updateAssetTypeOptions(): void {
    if (!this.selectedAsset) {
      this.assetTypes = [];
      this.selectedAssetType = null;
      return;
    }

    const types = this.assets
      .filter((item) => item.code === this.selectedAsset && item.assetType)
      .map((item) => item.assetType as string);

    this.assetTypes = Array.from(new Set(types));

    if (this.assetTypes.length === 0) {
      this.selectedAssetType = null;
      return;
    }

    if (!this.selectedAssetType || !this.assetTypes.includes(this.selectedAssetType)) {
      this.selectedAssetType = this.assetTypes[0];
    }
  }

  private applySeriesMeta(): void {
    const current = this.series.find((s) => s.code === this.selectedSeries);
    this.centralStrike = current?.centralStrike ?? null;
    this.expirationDate = current?.expirationDate ?? null;
  }

  private clearChart(): void {
    this.points = [];
    this.chart = undefined;
    this.tooltip = undefined;
    this.metrics = { pointCount: 0, centerLabel: '' };
    this.lastUpdated = null;
    this.centralStrike = null;
    this.expirationDate = null;
  }

  private toNumber(value: any): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private extractError(err: any, fallback: string): string {
    if (typeof err?.error === 'string' && err.error.trim()) {
      return err.error;
    }
    if (typeof err?.message === 'string' && err.message.trim()) {
      return err.message;
    }
    return fallback;
  }
}
