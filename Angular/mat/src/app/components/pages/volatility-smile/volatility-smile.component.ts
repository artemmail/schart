import { CommonModule } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { MaterialModule } from 'src/app/material.module';

type ViewPresetId =
  | 'smile_only'
  | 'delta_only'
  | 'gamma_only'
  | 'vega_only'
  | 'theta_only'
  | 'smile_delta'
  | 'smile_gamma'
  | 'smile_vega'
  | 'smile_theta'
  | 'trade_core'
  | 'vol_core'
  | 'greeks_core'
  | 'greeks_all'
  | 'smile_price_iv'
  | 'smile_iv_change';

type XAxisMode = 'strike' | 'moneyness' | 'log_moneyness';
type NormalizeMode = 'none' | 'per_contract' | 'money';
type ChartMetric = 'iv' | 'delta' | 'gamma' | 'vega' | 'theta' | 'price' | 'iv_change';

interface OptionSmilePoint {
  securityId: string;
  optionType?: string | null;
  boardId?: string | null;
  strike?: number | null;
  lotSize?: number | null;
  impliedVolatility?: number | null;
  theorPrice?: number | null;
  last?: number | null;
  bid?: number | null;
  offer?: number | null;
  volToday?: number | null;
  openPosition?: number | null;
  delta?: number | null;
  gamma?: number | null;
  vega?: number | null;
  theta?: number | null;
  rho?: number | null;
}

interface OptionSmileResponse {
  assetCode: string;
  expirationDate: string;
  asOf?: string | null;
  underlyingPrice?: number | null;
  points: OptionSmilePoint[];
}

interface SmileSeriesPoint {
  strike: number;
  xValue: number;
  yValue: number;
  raw: OptionSmilePoint;
  x: number;
  y: number;
}

interface SmileSeries {
  type: 'C' | 'P';
  color: string;
  dasharray?: string;
  points: SmileSeriesPoint[];
  path: string;
}

interface AxisTick {
  value: number;
  position: number;
}

interface SmileChart {
  metric: ChartMetric;
  title: string;
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
  series: SmileSeries[];
  hasData: boolean;
}

interface ViewPreset {
  id: ViewPresetId;
  label: string;
  charts: ChartMetric[];
}

interface SmileTableRow {
  type: 'C' | 'P';
  strike: number;
  iv?: number | null;
  delta?: number | null;
  gamma?: number | null;
  vega?: number | null;
  theta?: number | null;
  rho?: number | null;
}

interface SmileTooltipRow {
  label: string;
  value: string;
}

interface SmileTooltip {
  left: number;
  top: number;
  title: string;
  rows: SmileTooltipRow[];
}

@Component({
  standalone: true,
  selector: 'app-volatility-smile',
  imports: [CommonModule, FormsModule, MaterialModule],
  templateUrl: './volatility-smile.component.html',
  styleUrls: ['./volatility-smile.component.scss']
})
export class VolatilitySmileComponent implements OnInit {
  assets: string[] = [];
  expirations: string[] = [];
  selectedAsset = '';
  selectedExpiration = '';
  optionType: 'ALL' | 'C' | 'P' = 'ALL';
  useMoex = false;

  viewPresetId: ViewPresetId = 'smile_only';
  xAxis: XAxisMode = 'moneyness';
  normalizeMode: NormalizeMode = 'per_contract';
  crosshairEnabled = true;
  crosshairXValue?: number | null;
  currentUnderlyingPrice?: number | null;

  loading = false;
  error?: string;

  smile?: OptionSmileResponse;
  charts: SmileChart[] = [];
  tableRows: SmileTableRow[] = [];
  tooltip?: SmileTooltip;

  readonly viewPresets: ViewPreset[] = [
    { id: 'smile_only', label: 'Smile only', charts: ['iv'] },
    { id: 'delta_only', label: 'Delta only', charts: ['delta'] },
    { id: 'gamma_only', label: 'Gamma only', charts: ['gamma'] },
    { id: 'vega_only', label: 'Vega only', charts: ['vega'] },
    { id: 'theta_only', label: 'Theta only', charts: ['theta'] },
    { id: 'smile_delta', label: 'Smile + Delta', charts: ['iv', 'delta'] },
    { id: 'smile_gamma', label: 'Smile + Gamma', charts: ['iv', 'gamma'] },
    { id: 'smile_vega', label: 'Smile + Vega', charts: ['iv', 'vega'] },
    { id: 'smile_theta', label: 'Smile + Theta', charts: ['iv', 'theta'] },
    { id: 'trade_core', label: 'Trade core (Smile + Δ + Γ)', charts: ['iv', 'delta', 'gamma'] },
    { id: 'vol_core', label: 'Vol core (Smile + Vega + Theta)', charts: ['iv', 'vega', 'theta'] },
    { id: 'greeks_core', label: 'Greeks core (Δ + Γ + Vega)', charts: ['delta', 'gamma', 'vega'] },
    { id: 'greeks_all', label: 'Greeks all (Δ + Γ + Vega + Theta)', charts: ['delta', 'gamma', 'vega', 'theta'] },
    { id: 'smile_price_iv', label: 'Price + IV', charts: ['price', 'iv'] },
    { id: 'smile_iv_change', label: 'IV today vs prev', charts: ['iv', 'iv_change'] }
  ];

  constructor(private readonly http: HttpClient) {}

  async ngOnInit(): Promise<void> {
    await this.loadAssets();
  }

  get currentPreset(): ViewPreset {
    return this.viewPresets.find((preset) => preset.id === this.viewPresetId) ?? this.viewPresets[0];
  }

  get seriesCount(): number {
    return this.charts[0]?.series?.length ?? 0;
  }

  get pointCount(): number {
    return this.tableRows.length;
  }

  get isScrollableCharts(): boolean {
    return this.charts.length > 3;
  }

  get greekUnitLabel(): string {
    switch (this.normalizeMode) {
      case 'money':
        return '₽';
      case 'per_contract':
        return 'per contract';
      default:
        return 'raw';
    }
  }

  async onAssetChange(): Promise<void> {
    if (!this.selectedAsset) {
      this.expirations = [];
      this.selectedExpiration = '';
      this.smile = undefined;
      this.charts = [];
      this.tableRows = [];
      this.currentUnderlyingPrice = undefined;
      this.crosshairXValue = undefined;
      this.tooltip = undefined;
      return;
    }

    if (this.useMoex) {
      this.expirations = [];
      this.selectedExpiration = '';
      await this.loadMoexSmile();
      return;
    }

    await this.loadExpirations();
  }

  async onSourceChange(): Promise<void> {
    this.smile = undefined;
    this.charts = [];
    this.tableRows = [];
    this.currentUnderlyingPrice = undefined;
    this.crosshairXValue = undefined;
    this.tooltip = undefined;

    if (!this.selectedAsset) {
      this.expirations = [];
      this.selectedExpiration = '';
      return;
    }

    if (this.useMoex) {
      this.expirations = [];
      this.selectedExpiration = '';
      await this.loadMoexSmile();
      return;
    }

    await this.loadExpirations();
  }

  async onExpirationChange(): Promise<void> {
    if (!this.selectedAsset) {
      this.smile = undefined;
      this.charts = [];
      this.tableRows = [];
      this.currentUnderlyingPrice = undefined;
      this.crosshairXValue = undefined;
      this.tooltip = undefined;
      return;
    }

    if (!this.selectedExpiration && !this.useMoex) {
      this.smile = undefined;
      this.charts = [];
      this.tableRows = [];
      this.currentUnderlyingPrice = undefined;
      this.crosshairXValue = undefined;
      this.tooltip = undefined;
      return;
    }

    await this.loadSmile();
  }

  onOptionTypeChange(): void {
    if (this.smile) {
      this.buildCharts(this.smile);
    }
  }

  onPresetChange(): void {
    if (this.smile) {
      this.buildCharts(this.smile);
    }
  }

  onAxisChange(): void {
    if (this.smile) {
      this.buildCharts(this.smile);
    }
  }

  onNormalizeChange(): void {
    if (this.smile) {
      this.buildCharts(this.smile);
    }
  }

  onCrosshairToggle(): void {
    if (!this.crosshairEnabled) {
      this.crosshairXValue = undefined;
    }
  }

  async refresh(): Promise<void> {
    if (!this.selectedAsset) {
      return;
    }

    if (!this.useMoex && !this.selectedExpiration) {
      return;
    }

    await this.loadSmile();
  }

  private async loadAssets(): Promise<void> {
    this.loading = true;
    this.error = undefined;

    try {
      const assets = await firstValueFrom(this.http.get<string[]>('/api/options/assets'));
      this.assets = assets ?? [];
      this.selectedAsset = this.assets.includes('LKOH') ? 'LKOH' : this.assets[0] ?? '';
      if (this.selectedAsset) {
        await this.loadExpirations();
      }
    } catch (err) {
      this.error = 'Не удалось получить список ассетов.';
      this.assets = [];
    } finally {
      this.loading = false;
    }
  }

  private async loadExpirations(): Promise<void> {
    this.loading = true;
    this.error = undefined;

    try {
      const params = new HttpParams().set('asset', this.selectedAsset);
      const expirations = await firstValueFrom(
        this.http.get<string[]>('/api/options/expirations', { params })
      );
      this.expirations = expirations ?? [];
      this.selectedExpiration = this.pickDefaultExpiration(this.expirations);
      if (this.selectedExpiration) {
        await this.loadSmile();
      }
    } catch (err) {
      this.error = 'Не удалось получить список экспираций.';
      this.expirations = [];
      this.selectedExpiration = '';
    } finally {
      this.loading = false;
    }
  }

  private async loadSmile(): Promise<void> {
    if (this.useMoex) {
      await this.loadMoexSmile();
      return;
    }

    this.loading = true;
    this.error = undefined;

    try {
      const params = new HttpParams()
        .set('asset', this.selectedAsset)
        .set('expiration', this.selectedExpiration);

      const raw = await firstValueFrom(this.http.get<any>('/api/options/smile', { params }));
      const smile = this.normalizeSmile(raw);
      this.smile = smile;
      this.buildCharts(smile);
    } catch (err) {
      this.error = 'Нет данных для выбранного ассета или экспирации.';
      this.smile = undefined;
      this.charts = [];
      this.tableRows = [];
      this.currentUnderlyingPrice = undefined;
      this.crosshairXValue = undefined;
      this.tooltip = undefined;
    } finally {
      this.loading = false;
    }
  }

  private async loadMoexSmile(): Promise<void> {
    if (!this.selectedAsset) {
      return;
    }

    this.loading = true;
    this.error = undefined;

    try {
      let params = new HttpParams().set('asset', this.selectedAsset);
      if (this.selectedExpiration) {
        params = params.set('expiration', this.selectedExpiration);
      }

      const raw = await firstValueFrom(this.http.get<any>('/api/options/smile/moex', { params }));
      const smile = this.normalizeSmile(raw);
      this.smile = smile;

      const normalizedExpiration = this.normalizeExpiration(smile.expirationDate);
      if (normalizedExpiration) {
        this.expirations = [normalizedExpiration];
        this.selectedExpiration = normalizedExpiration;
      } else {
        this.expirations = [];
        this.selectedExpiration = '';
      }

      this.buildCharts(smile);
    } catch (err) {
      this.error = 'Нет данных от Московской биржи для выбранного ассета.';
      this.smile = undefined;
      this.charts = [];
      this.tableRows = [];
      this.currentUnderlyingPrice = undefined;
      this.crosshairXValue = undefined;
      this.tooltip = undefined;
      this.expirations = [];
      this.selectedExpiration = '';
    } finally {
      this.loading = false;
    }
  }

  onPointHover(event: MouseEvent, point: SmileSeriesPoint, series: SmileSeries, chart: SmileChart): void {
    const target = event.currentTarget as Element | null;
    const panel = target?.closest('.chart-panel') as HTMLElement | null;
    const rect = panel?.getBoundingClientRect();

    const left = rect ? event.clientX - rect.left + 12 : 0;
    const top = rect ? event.clientY - rect.top + 12 : 0;

    if (this.crosshairEnabled) {
      this.crosshairXValue = point.xValue;
    }

    this.tooltip = {
      left,
      top,
      title: `${series.type === 'C' ? 'Call' : 'Put'} · ${chart.title}`,
      rows: this.buildTooltipRows(point.raw, point.xValue)
    };
  }

  onPointLeave(): void {
    this.tooltip = undefined;
    this.crosshairXValue = undefined;
  }

  getCrosshairX(chart: SmileChart): number | null {
    if (!this.crosshairEnabled || this.crosshairXValue == null) {
      return null;
    }

    if (this.crosshairXValue < chart.xMin || this.crosshairXValue > chart.xMax) {
      return null;
    }

    return this.scale(
      this.crosshairXValue,
      chart.xMin,
      chart.xMax,
      chart.plotLeft,
      chart.plotLeft + chart.plotWidth
    );
  }

  private buildCharts(smile: OptionSmileResponse): void {
    this.tooltip = undefined;
    this.crosshairXValue = undefined;

    const underlyingPrice = this.toNumber(smile.underlyingPrice ?? null);
    this.currentUnderlyingPrice = underlyingPrice;

    const normalized = (smile.points ?? [])
      .map((p) => ({
        ...p,
        optionType: this.normalizeOptionType(p.optionType)
      }))
      .filter((p) => p.strike != null);

    if (normalized.length === 0) {
      this.charts = [];
      this.tableRows = [];
      this.currentUnderlyingPrice = undefined;
      this.crosshairXValue = undefined;
      return;
    }

    const seriesTypes: Array<'C' | 'P'> =
      this.optionType === 'ALL' ? ['C', 'P'] : [this.optionType];

    const allowedTypes = new Set(seriesTypes);
    const filteredByType = normalized.filter((p) =>
      p.optionType ? allowedTypes.has(p.optionType as 'C' | 'P') : false
    );

    if (filteredByType.length === 0) {
      this.charts = [];
      this.tableRows = [];
      this.currentUnderlyingPrice = underlyingPrice ?? undefined;
      this.crosshairXValue = undefined;
      return;
    }

    this.tableRows = this.buildTableRows(filteredByType, underlyingPrice);

    const chartHeight = this.resolveChartHeight(this.currentPreset.charts.length);
    this.charts = this.currentPreset.charts.map((metric) =>
      this.buildMetricChart(metric, filteredByType, seriesTypes, chartHeight, underlyingPrice)
    );
  }

  private buildMetricChart(
    metric: ChartMetric,
    points: OptionSmilePoint[],
    seriesTypes: Array<'C' | 'P'>,
    height: number,
    underlyingPrice: number | null
  ): SmileChart {
    const width = 820;
    const plotLeft = 68;
    const plotTop = 24;
    const plotWidth = width - plotLeft - 24;
    const plotHeight = height - plotTop - 40;

    const collectedX: number[] = [];
    const collectedY: number[] = [];
    const rawSeries: Array<{ type: 'C' | 'P'; points: SmileSeriesPoint[] }> = [];

    for (const type of seriesTypes) {
      const seriesPoints = points
        .filter((p) => p.optionType === type)
        .map((p) => {
          const xValue = this.computeXValue(p.strike!, underlyingPrice);
          const yValue = this.resolveMetricValue(metric, p, underlyingPrice);
          if (xValue == null || yValue == null) {
            return null;
          }

          collectedX.push(xValue);
          collectedY.push(yValue);

          return {
            strike: p.strike!,
            xValue,
            yValue,
            raw: p,
            x: 0,
            y: 0
          } as SmileSeriesPoint;
        })
        .filter((p): p is SmileSeriesPoint => p !== null)
        .sort((a, b) => a.xValue - b.xValue);

      if (seriesPoints.length > 0) {
        rawSeries.push({ type, points: seriesPoints });
      }
    }

    if (collectedX.length === 0 || collectedY.length === 0) {
      return {
        metric,
        title: this.getMetricTitle(metric),
        width,
        height,
        plotLeft,
        plotTop,
        plotWidth,
        plotHeight,
        xMin: 0,
        xMax: 1,
        yMin: 0,
        yMax: 1,
        xTicks: [],
        yTicks: [],
        series: [],
        hasData: false
      };
    }

    const xMin = Math.min(...collectedX);
    const xMax = Math.max(...collectedX);
    const yMinRaw = Math.min(...collectedY);
    const yMaxRaw = Math.max(...collectedY);
    const range = yMaxRaw - yMinRaw;
    const yPadding = range === 0 ? Math.max(Math.abs(yMaxRaw) * 0.1, 0.01) : range * 0.1;
    const yMin = yMinRaw - yPadding;
    const yMax = yMaxRaw + yPadding;

    const series: SmileSeries[] = rawSeries.map((serie) => {
      const pointsScaled = serie.points.map((p) => ({
        ...p,
        x: this.scale(p.xValue, xMin, xMax, plotLeft, plotLeft + plotWidth),
        y: this.scale(p.yValue, yMin, yMax, plotTop + plotHeight, plotTop)
      }));

      const path = pointsScaled
        .map((p, index) => `${index === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
        .join(' ');

      return {
        type: serie.type,
        color: serie.type === 'C' ? 'var(--smile-call)' : 'var(--smile-put)',
        dasharray: serie.type === 'P' ? '6 4' : undefined,
        points: pointsScaled,
        path
      };
    });

    return {
      metric,
      title: this.getMetricTitle(metric),
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
      xTicks: this.makeTicks(xMin, xMax, 5).map((value) => ({
        value,
        position: this.scale(value, xMin, xMax, plotLeft, plotLeft + plotWidth)
      })),
      yTicks: this.makeTicks(yMin, yMax, 5).map((value) => ({
        value,
        position: this.scale(value, yMin, yMax, plotTop + plotHeight, plotTop)
      })),
      series,
      hasData: series.length > 0
    };
  }

  private buildTableRows(points: OptionSmilePoint[], underlyingPrice: number | null): SmileTableRow[] {
    const rows: SmileTableRow[] = [];
    for (const point of points) {
      const normalizedType = this.normalizeOptionType(point.optionType);
      if (!normalizedType || point.strike == null) {
        continue;
      }

      rows.push({
        type: normalizedType,
        strike: point.strike,
        iv: point.impliedVolatility ?? null,
        delta: this.normalizeGreek(point.delta, point.lotSize, underlyingPrice),
        gamma: this.normalizeGreek(point.gamma, point.lotSize, underlyingPrice),
        vega: this.normalizeGreek(point.vega, point.lotSize, underlyingPrice),
        theta: this.normalizeGreek(point.theta, point.lotSize, underlyingPrice),
        rho: this.normalizeGreek(point.rho, point.lotSize, underlyingPrice)
      });
    }

    rows.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type.localeCompare(b.type);
      }
      return a.strike - b.strike;
    });

    return rows;
  }

  private resolveChartHeight(count: number): number {
    if (count <= 1) {
      return 420;
    }
    if (count === 2) {
      return 300;
    }
    if (count === 3) {
      return 240;
    }
    if (count === 4) {
      return 210;
    }
    return 190;
  }

  private computeXValue(strike: number, underlyingPrice: number | null): number | null {
    if (this.xAxis === 'strike' || !underlyingPrice || !Number.isFinite(underlyingPrice) || underlyingPrice <= 0) {
      return strike;
    }

    const ratio = strike / underlyingPrice;
    if (this.xAxis === 'moneyness') {
      return ratio;
    }

    return Math.log(ratio);
  }

  private resolveMetricValue(
    metric: ChartMetric,
    point: OptionSmilePoint,
    underlyingPrice: number | null
  ): number | null {
    switch (metric) {
      case 'iv':
        return point.impliedVolatility ?? null;
      case 'delta':
        return this.normalizeGreek(point.delta, point.lotSize, underlyingPrice);
      case 'gamma':
        return this.normalizeGreek(point.gamma, point.lotSize, underlyingPrice);
      case 'vega':
        return this.normalizeGreek(point.vega, point.lotSize, underlyingPrice);
      case 'theta':
        return this.normalizeGreek(point.theta, point.lotSize, underlyingPrice);
      case 'price':
        return this.resolveOptionPrice(point);
      case 'iv_change':
        return null;
      default:
        return null;
    }
  }

  private normalizeGreek(
    value?: number | null,
    lotSize?: number | null,
    underlyingPrice?: number | null
  ): number | null {
    if (value == null || !Number.isFinite(value)) {
      return null;
    }

    let result = value;

    if (this.normalizeMode === 'per_contract') {
      if (lotSize && Number.isFinite(lotSize)) {
        result *= lotSize;
      }
    } else if (this.normalizeMode === 'money') {
      const multiplier = (lotSize && Number.isFinite(lotSize) ? lotSize : 1) *
        (underlyingPrice && Number.isFinite(underlyingPrice) ? underlyingPrice : 1);
      result *= multiplier;
    }

    return result;
  }

  private resolveOptionPrice(point: OptionSmilePoint): number | null {
    if (point.theorPrice != null) {
      return point.theorPrice;
    }

    if (point.last != null) {
      return point.last;
    }

    if (point.bid != null && point.offer != null) {
      return (point.bid + point.offer) / 2;
    }

    return null;
  }

  private buildTooltipRows(point: OptionSmilePoint, xValue: number): SmileTooltipRow[] {
    const rows: SmileTooltipRow[] = [];

    rows.push({
      label: this.getAxisLabel(),
      value: this.formatValue(xValue, 'axis')
    });

    if (point.strike != null) {
      rows.push({
        label: 'Strike',
        value: this.formatValue(point.strike, 'axis')
      });
    }

    rows.push({
      label: 'IV',
      value: this.formatValue(point.impliedVolatility ?? null, 'iv')
    });

    const price = this.resolveOptionPrice(point);
    if (price != null) {
      rows.push({
        label: 'Price',
        value: this.formatValue(price, 'price')
      });
    }

    const metrics = new Set(this.currentPreset.charts);
    const unitLabel = this.greekUnitLabel;

    if (metrics.has('delta')) {
      rows.push({
        label: `Δ (${unitLabel})`,
        value: this.formatValue(
          this.normalizeGreek(point.delta, point.lotSize, this.currentUnderlyingPrice ?? null),
          'greek'
        )
      });
    }

    if (metrics.has('gamma')) {
      rows.push({
        label: `Γ (${unitLabel})`,
        value: this.formatValue(
          this.normalizeGreek(point.gamma, point.lotSize, this.currentUnderlyingPrice ?? null),
          'greek'
        )
      });
    }

    if (metrics.has('vega')) {
      rows.push({
        label: `Vega (${unitLabel})`,
        value: this.formatValue(
          this.normalizeGreek(point.vega, point.lotSize, this.currentUnderlyingPrice ?? null),
          'greek'
        )
      });
    }

    if (metrics.has('theta')) {
      rows.push({
        label: `Theta (${unitLabel})`,
        value: this.formatValue(
          this.normalizeGreek(point.theta, point.lotSize, this.currentUnderlyingPrice ?? null),
          'greek'
        )
      });
    }

    if (metrics.has('iv_change')) {
      rows.push({
        label: 'ΔIV',
        value: '—'
      });
    }

    return rows;
  }

  private formatValue(value: number | null, kind: 'axis' | 'iv' | 'price' | 'greek'): string {
    if (value == null || !Number.isFinite(value)) {
      return '—';
    }

    switch (kind) {
      case 'axis':
        return value.toFixed(4);
      case 'greek':
        return value.toFixed(4);
      default:
        return value.toFixed(2);
    }
  }

  private getMetricTitle(metric: ChartMetric): string {
    switch (metric) {
      case 'iv':
        return 'IV vs X';
      case 'delta':
        return 'Delta vs X';
      case 'gamma':
        return 'Gamma vs X';
      case 'vega':
        return 'Vega vs X';
      case 'theta':
        return 'Theta vs X';
      case 'price':
        return 'Option price vs X';
      case 'iv_change':
        return 'ΔIV vs X';
      default:
        return 'Metric';
    }
  }
  private getAxisLabel(): string {
    const fallbackToStrike = this.xAxis !== 'strike' && (!this.currentUnderlyingPrice || this.currentUnderlyingPrice <= 0);

    if (fallbackToStrike) {
      return 'Strike (fallback)';
    }

    switch (this.xAxis) {
      case 'strike':
        return 'Strike';
      case 'moneyness':
        return 'Moneyness';
      case 'log_moneyness':
        return 'Log moneyness';
      default:
        return 'X';
    }
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

  private pickDefaultExpiration(expirations: string[]): string {
    if (expirations.length === 0) {
      return '';
    }

    const today = new Date();
    const upcoming = expirations.find((e) => new Date(e) >= today);
    return upcoming ?? expirations[expirations.length - 1];
  }

  private normalizeOptionType(value?: string | null): 'C' | 'P' | null {
    if (!value) {
      return null;
    }

    const normalized = value.trim().toUpperCase();
    if (normalized.startsWith('C')) {
      return 'C';
    }
    if (normalized.startsWith('P')) {
      return 'P';
    }
    return null;
  }

  private normalizeExpiration(value?: string | null): string {
    if (!value) {
      return '';
    }

    const trimmed = String(value).trim();
    const match = /^(\d{4}-\d{2}-\d{2})/.exec(trimmed);
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

  private normalizeSmile(raw: any): OptionSmileResponse {
    const pointsRaw = raw?.points ?? raw?.Points ?? [];
    const points: OptionSmilePoint[] = Array.isArray(pointsRaw)
      ? pointsRaw.map((p: any) => ({
          securityId: p?.securityId ?? p?.SecurityId ?? '',
          optionType: p?.optionType ?? p?.OptionType ?? null,
          boardId: p?.boardId ?? p?.BoardId ?? null,
          strike: this.toNumber(p?.strike ?? p?.Strike),
          lotSize: this.toNumber(p?.lotSize ?? p?.LotSize),
          impliedVolatility: this.toNumber(p?.impliedVolatility ?? p?.ImpliedVolatility),
          theorPrice: this.toNumber(p?.theorPrice ?? p?.TheorPrice),
          last: this.toNumber(p?.last ?? p?.Last),
          bid: this.toNumber(p?.bid ?? p?.Bid),
          offer: this.toNumber(p?.offer ?? p?.Offer),
          volToday: this.toNumber(p?.volToday ?? p?.VolToday),
          openPosition: this.toNumber(p?.openPosition ?? p?.OpenPosition),
          delta: this.toNumber(p?.delta ?? p?.Delta),
          gamma: this.toNumber(p?.gamma ?? p?.Gamma),
          vega: this.toNumber(p?.vega ?? p?.Vega),
          theta: this.toNumber(p?.theta ?? p?.Theta),
          rho: this.toNumber(p?.rho ?? p?.Rho)
        }))
      : [];

    return {
      assetCode: raw?.assetCode ?? raw?.AssetCode ?? '',
      expirationDate: raw?.expirationDate ?? raw?.ExpirationDate ?? '',
      asOf: raw?.asOf ?? raw?.AsOf ?? null,
      underlyingPrice: this.toNumber(raw?.underlyingPrice ?? raw?.UnderlyingPrice),
      points
    };
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
}
