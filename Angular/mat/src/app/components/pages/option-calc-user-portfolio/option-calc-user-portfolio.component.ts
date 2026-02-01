import { CommonModule } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { MaterialModule } from 'src/app/material.module';

type ViewPresetId =
  | 'pnl_only'
  | 'pnl_delta'
  | 'pnl_gamma'
  | 'greeks_core'
  | 'greeks_all'
  | 'risk_view'
  | 'all';

type ChartMetric = 'profit_and_loss' | 'delta' | 'gamma' | 'vega' | 'theta' | 'rho';
type PositionType = 'option' | 'futures' | 'share' | 'currency' | 'commodity';
type SeriesId = 'now' | 'on_expiration' | 'on_what_if';

interface ViewPreset {
  id: ViewPresetId;
  label: string;
  charts: ChartMetric[];
}

interface AssetItem {
  code: string;
  title: string;
  assetType?: string | null;
}

interface PortfolioChoice {
  value: number;
  label: string;
}

interface PortfolioPosition {
  secid: string;
  type: PositionType;
  quantity: number;
  price?: number | null;
  nettedIm?: boolean | null;
}

interface PortfolioRequest {
  assetCode: string;
  assetType?: string | null;
  positions: PortfolioPosition[];
}

interface GraphPoint {
  underlyingPrice: number;
  value: number;
}

interface IndicatorGraph {
  now: GraphPoint[];
  onExpiration: GraphPoint[];
  onWhatIf?: GraphPoint[];
}

interface ChartSeriesPoint {
  xValue: number;
  yValue: number;
  raw: GraphPoint;
  x: number;
  y: number;
}

interface ChartSeries {
  id: SeriesId;
  label: string;
  color: string;
  dasharray?: string;
  points: ChartSeriesPoint[];
  path: string;
}

interface AxisTick {
  value: number;
  position: number;
}

interface PortfolioChart {
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
  series: ChartSeries[];
  hasData: boolean;
}

interface TooltipRow {
  label: string;
  value: string;
}

interface Tooltip {
  left: number;
  top: number;
  title: string;
  rows: TooltipRow[];
}

interface CalcPosition {
  secid: string;
  type: string;
  quantity: number;
  price?: number | null;
  volatility?: number | null;
  strike?: number | null;
  expirationDate?: string | null;
  delta?: number | null;
  gamma?: number | null;
  vega?: number | null;
  theta?: number | null;
  rho?: number | null;
  profitAndLoss?: number | null;
  fee?: number | null;
}

interface CalcTotal {
  delta?: number | null;
  gamma?: number | null;
  vega?: number | null;
  theta?: number | null;
  rho?: number | null;
  profitAndLoss?: number | null;
  fee?: number | null;
}

interface CalcResult {
  positions: CalcPosition[];
  total?: CalcTotal;
  initialMargin?: number | null;
}

@Component({
  standalone: true,
  selector: 'app-option-calc-user-portfolio',
  imports: [CommonModule, FormsModule, MaterialModule],
  templateUrl: './option-calc-user-portfolio.component.html',
  styleUrls: ['./option-calc-user-portfolio.component.scss']
})
export class OptionCalcUserPortfolioComponent implements OnInit {
  assets: AssetItem[] = [];
  assetTypes: string[] = [];
  portfolios: PortfolioChoice[] = [
    { value: 1, label: 'Портфель #1' },
    { value: 2, label: 'Портфель #2' },
    { value: 3, label: 'Портфель #3' },
    { value: 4, label: 'Портфель #4' }
  ];

  selectedPortfolio = 1;
  positions: PortfolioPosition[] = [];

  selectedAsset = '';
  selectedAssetType: string | null = null;

  whatIfDeltaSigma: number | null = null;
  whatIfDate = '';

  viewPresetId: ViewPresetId = 'pnl_only';
  crosshairEnabled = true;
  crosshairXValue?: number | null;

  loading = false;
  loadingPositions = false;
  error?: string;

  calcResult?: CalcResult;
  charts: PortfolioChart[] = [];
  tooltip?: Tooltip;

  private graphs: Partial<Record<ChartMetric, IndicatorGraph>> = {};
  private currentRequest?: PortfolioRequest;

  readonly viewPresets: ViewPreset[] = [
    { id: 'pnl_only', label: 'PnL only', charts: ['profit_and_loss'] },
    { id: 'pnl_delta', label: 'PnL + Delta', charts: ['profit_and_loss', 'delta'] },
    { id: 'pnl_gamma', label: 'PnL + Gamma', charts: ['profit_and_loss', 'gamma'] },
    { id: 'greeks_core', label: 'Greeks core (Δ + Γ + Vega)', charts: ['delta', 'gamma', 'vega'] },
    { id: 'greeks_all', label: 'Greeks all (Δ + Γ + Vega + Theta + Rho)', charts: ['delta', 'gamma', 'vega', 'theta', 'rho'] },
    { id: 'risk_view', label: 'Risk view (Vega + Theta + Rho)', charts: ['vega', 'theta', 'rho'] },
    { id: 'all', label: 'All metrics', charts: ['profit_and_loss', 'delta', 'gamma', 'vega', 'theta', 'rho'] }
  ];

  private readonly allMetrics: ChartMetric[] = ['profit_and_loss', 'delta', 'gamma', 'vega', 'theta', 'rho'];

  constructor(private readonly http: HttpClient) {}

  async ngOnInit(): Promise<void> {
    await this.loadAssets();
    if (this.selectedAsset) {
      await this.refreshPositions();
    }
  }

  get currentPreset(): ViewPreset {
    return this.viewPresets.find((preset) => preset.id === this.viewPresetId) ?? this.viewPresets[0];
  }

  get positionCount(): number {
    return this.positions.length;
  }

  get seriesCount(): number {
    return this.charts[0]?.series?.length ?? 0;
  }

  onPresetChange(): void {
    if (Object.keys(this.graphs).length > 0) {
      this.buildCharts();
    }
  }

  onCrosshairToggle(): void {
    if (!this.crosshairEnabled) {
      this.crosshairXValue = undefined;
    }
  }

  async onAssetChange(): Promise<void> {
    this.updateAssetTypeOptions();
    this.clearPositions();

    if (this.selectedAsset) {
      await this.refreshPositions();
    }
  }

  async onAssetTypeChange(): Promise<void> {
    await this.refreshPositions();
  }

  async onPortfolioChange(): Promise<void> {
    await this.refreshPositions();
  }

  clearPositions(): void {
    this.positions = [];
    this.currentRequest = undefined;
    this.resetCharts();
  }

  async refreshPositions(): Promise<void> {
    if (!this.selectedAsset) {
      this.positions = [];
      this.currentRequest = undefined;
      return;
    }

    this.loadingPositions = true;
    this.error = undefined;
    this.resetCharts();

    try {
      let params = new HttpParams()
        .set('portfolioNumber', this.selectedPortfolio.toString())
        .set('assetCode', this.selectedAsset);

      if (this.selectedAssetType) {
        params = params.set('assetType', this.selectedAssetType);
      }

      const raw = await firstValueFrom(this.http.get<any>('/api/option-calc/portfolio/user', { params }));
      const request = this.normalizePortfolioRequest(raw);

      this.positions = request.positions;
      this.currentRequest = request;

      if (request.assetType) {
        if (!this.assetTypes.includes(request.assetType)) {
          this.assetTypes = [...this.assetTypes, request.assetType];
        }

        if (!this.selectedAssetType || this.selectedAssetType !== request.assetType) {
          this.selectedAssetType = request.assetType;
        }
      }
    } catch (err) {
      this.error = 'Не удалось получить позиции портфеля.';
      this.positions = [];
      this.currentRequest = undefined;
    } finally {
      this.loadingPositions = false;
    }
  }

  async calculate(): Promise<void> {
    const payload = this.buildPortfolioPayload();
    if (!payload) {
      return;
    }

    this.loading = true;
    this.error = undefined;

    try {
      const calcPromise = firstValueFrom(this.http.post<any>('/api/option-calc/portfolio/calc', payload));
      const graphPromises = this.allMetrics.map((metric) => this.fetchGraph(metric, payload));

      const results = await Promise.all([calcPromise, ...graphPromises]);
      const calcRaw = results[0];
      const graphRaw = results.slice(1) as IndicatorGraph[];

      this.calcResult = this.normalizeCalc(calcRaw);
      this.graphs = {};
      this.allMetrics.forEach((metric, index) => {
        this.graphs[metric] = graphRaw[index];
      });

      this.buildCharts();
    } catch (err) {
      this.error = 'Не удалось рассчитать портфель.';
      this.charts = [];
    } finally {
      this.loading = false;
    }
  }

  onPointHover(event: MouseEvent, point: ChartSeriesPoint, series: ChartSeries, chart: PortfolioChart): void {
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
      title: `${series.label} · ${this.getMetricTitle(chart.metric)}`,
      rows: this.buildTooltipRows(point, chart.metric)
    };
  }

  onPointLeave(): void {
    this.tooltip = undefined;
    this.crosshairXValue = undefined;
  }

  getCrosshairX(chart: PortfolioChart): number | null {
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

  private async loadAssets(): Promise<void> {
    this.loadingPositions = true;
    this.error = undefined;

    try {
      const raw = await firstValueFrom(this.http.get<any[]>('/api/option-calc/assets'));
      this.assets = this.normalizeAssets(raw);
      this.selectedAsset = this.assets[0]?.code ?? '';
      this.updateAssetTypeOptions();
    } catch (err) {
      this.error = 'Не удалось получить список базовых активов.';
      this.assets = [];
    } finally {
      this.loadingPositions = false;
    }
  }

  private async fetchGraph(metric: ChartMetric, payload: any): Promise<IndicatorGraph> {
    const raw = await firstValueFrom(
      this.http.post<any>(`/api/option-calc/portfolio/graph/${metric}`, payload)
    );
    return this.normalizeGraph(raw);
  }

  private buildPortfolioPayload(): any | null {
    const assetCode = this.selectedAsset?.trim();
    if (!assetCode) {
      this.error = 'Выберите базовый актив.';
      return null;
    }

    const positions = this.positions
      .map((p) => ({
        secid: p.secid?.trim(),
        type: p.type,
        quantity: this.toInteger(p.quantity),
        price: this.toNumber(p.price),
        netted_im: p.nettedIm ?? true
      }))
      .filter((p) => !!p.secid && Number.isFinite(p.quantity) && p.quantity !== 0);

    if (positions.length === 0) {
      this.error = 'В портфеле нет подходящих позиций.';
      return null;
    }

    const payload: any = {
      asset_code: assetCode,
      positions
    };

    const resolvedAssetType = this.selectedAssetType ?? this.currentRequest?.assetType;
    if (resolvedAssetType) {
      payload.asset_type = resolvedAssetType;
    }

    if (this.whatIfDeltaSigma != null || this.whatIfDate) {
      payload.what_if = {
        delta_sigma: this.toNumber(this.whatIfDeltaSigma),
        date_of_calculation: this.whatIfDate || undefined
      };
    }

    return payload;
  }

  private buildCharts(): void {
    this.tooltip = undefined;
    this.crosshairXValue = undefined;

    const metrics = this.currentPreset.charts;
    this.charts = metrics.map((metric) => this.buildMetricChart(metric, this.graphs[metric]));
  }

  private buildMetricChart(metric: ChartMetric, graph?: IndicatorGraph): PortfolioChart {
    const width = 820;
    const plotLeft = 68;
    const plotTop = 24;
    const height = this.resolveChartHeight(this.currentPreset.charts.length);
    const plotWidth = width - plotLeft - 24;
    const plotHeight = height - plotTop - 40;

    const collectedX: number[] = [];
    const collectedY: number[] = [];

    const seriesInput: Array<{ id: SeriesId; label: string; color: string; dasharray?: string; points?: GraphPoint[] }> = [
      { id: 'now', label: 'Now', color: 'var(--portfolio-now)', points: graph?.now },
      { id: 'on_expiration', label: 'On expiration', color: 'var(--portfolio-expiration)', dasharray: '6 4', points: graph?.onExpiration },
      { id: 'on_what_if', label: 'What-if', color: 'var(--portfolio-whatif)', dasharray: '2 3', points: graph?.onWhatIf }
    ];

    const series: ChartSeries[] = [];

    for (const serie of seriesInput) {
      const points = (serie.points ?? [])
        .map((p) => {
          const xValue = this.toNumber(p?.underlyingPrice);
          const yValue = this.toNumber(p?.value);
          if (xValue == null || yValue == null) {
            return null;
          }

          collectedX.push(xValue);
          collectedY.push(yValue);

          return {
            xValue,
            yValue,
            raw: p,
            x: 0,
            y: 0
          } as ChartSeriesPoint;
        })
        .filter((p): p is ChartSeriesPoint => p !== null)
        .sort((a, b) => a.xValue - b.xValue);

      if (points.length > 0) {
        series.push({
          id: serie.id,
          label: serie.label,
          color: serie.color,
          dasharray: serie.dasharray,
          points,
          path: ''
        });
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
    const yRange = yMaxRaw - yMinRaw;
    const yPadding = yRange === 0 ? Math.max(Math.abs(yMaxRaw) * 0.1, 0.01) : yRange * 0.1;
    const yMin = yMinRaw - yPadding;
    const yMax = yMaxRaw + yPadding;

    const scaledSeries = series.map((serie) => {
      const points = serie.points.map((p) => ({
        ...p,
        x: this.scale(p.xValue, xMin, xMax, plotLeft, plotLeft + plotWidth),
        y: this.scale(p.yValue, yMin, yMax, plotTop + plotHeight, plotTop)
      }));

      const path = points
        .map((p, index) => `${index === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
        .join(' ');

      return {
        ...serie,
        points,
        path
      } as ChartSeries;
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
      series: scaledSeries,
      hasData: scaledSeries.length > 0
    };
  }

  private buildTooltipRows(point: ChartSeriesPoint, metric: ChartMetric): TooltipRow[] {
    return [
      {
        label: 'Underlying',
        value: this.formatValue(point.xValue, 'axis')
      },
      {
        label: this.getMetricTitle(metric),
        value: this.formatValue(point.yValue, metric === 'profit_and_loss' ? 'price' : 'greek')
      }
    ];
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

  private getMetricTitle(metric: ChartMetric): string {
    switch (metric) {
      case 'profit_and_loss':
        return 'PnL';
      case 'delta':
        return 'Delta';
      case 'gamma':
        return 'Gamma';
      case 'vega':
        return 'Vega';
      case 'theta':
        return 'Theta';
      case 'rho':
        return 'Rho';
      default:
        return 'Metric';
    }
  }

  private formatValue(value: number | null, kind: 'axis' | 'price' | 'greek'): string {
    if (value == null || !Number.isFinite(value)) {
      return '—';
    }

    switch (kind) {
      case 'axis':
        return value.toFixed(2);
      case 'greek':
        return value.toFixed(4);
      default:
        return value.toFixed(2);
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

  private normalizePortfolioRequest(raw: any): PortfolioRequest {
    const assetCode = String(raw?.asset_code ?? raw?.assetCode ?? raw?.AssetCode ?? this.selectedAsset ?? '').trim();
    const assetTypeRaw = raw?.asset_type ?? raw?.assetType ?? raw?.AssetType;
    const assetType = assetTypeRaw != null && assetTypeRaw !== '' ? String(assetTypeRaw).trim() : null;

    const positionsRaw = raw?.positions ?? raw?.Positions ?? [];
    const positions = Array.isArray(positionsRaw)
      ? (positionsRaw
          .map((p: any) => {
            const type = this.normalizePositionType(p?.type ?? p?.Type);
            return {
              secid: String(p?.secid ?? p?.SecId ?? '').trim(),
              type,
              quantity: this.toInteger(p?.quantity ?? p?.Quantity),
              price: this.toNumber(p?.price ?? p?.Price),
              nettedIm: this.toBoolean(p?.netted_im ?? p?.nettedIm ?? p?.NettedIm)
            };
          })
          .filter((p: any) => !!p.secid && !!p.type && p.quantity !== 0) as PortfolioPosition[])
      : [];

    return {
      assetCode,
      assetType,
      positions
    };
  }

  private normalizePositionType(value: any): PositionType | null {
    if (!value) {
      return null;
    }

    const normalized = String(value).trim().toLowerCase();
    switch (normalized) {
      case 'option':
        return 'option';
      case 'futures':
        return 'futures';
      case 'share':
        return 'share';
      case 'currency':
        return 'currency';
      case 'commodity':
        return 'commodity';
      default:
        return null;
    }
  }

  private normalizeGraph(raw: any): IndicatorGraph {
    const normalizePoints = (pointsRaw: any): GraphPoint[] => {
      if (!Array.isArray(pointsRaw)) {
        return [];
      }

      return pointsRaw
        .map((p) => ({
          underlyingPrice: this.toNumber(p?.underlying_price ?? p?.underlyingPrice ?? p?.UnderlyingPrice),
          value: this.toNumber(p?.value ?? p?.Value)
        }))
        .filter((p) => p.underlyingPrice != null && p.value != null) as GraphPoint[];
    };

    return {
      now: normalizePoints(raw?.now ?? raw?.Now ?? raw?.['now']),
      onExpiration: normalizePoints(raw?.on_expiration ?? raw?.onExpiration ?? raw?.OnExpiration),
      onWhatIf: normalizePoints(raw?.on_what_if ?? raw?.onWhatIf ?? raw?.OnWhatIf)
    };
  }

  private normalizeCalc(raw: any): CalcResult {
    const positionsRaw = raw?.positions ?? raw?.Positions ?? [];
    const positions: CalcPosition[] = Array.isArray(positionsRaw)
      ? positionsRaw.map((p: any) => ({
          secid: String(p?.secid ?? p?.SecId ?? '').trim(),
          type: String(p?.type ?? p?.Type ?? ''),
          quantity: this.toInteger(p?.quantity ?? p?.Quantity),
          price: this.toNumber(p?.price ?? p?.Price),
          volatility: this.toNumber(p?.volatility ?? p?.Volatility),
          strike: this.toNumber(p?.strike ?? p?.Strike),
          expirationDate: this.normalizeDate(p?.expiration_date ?? p?.expirationDate ?? p?.ExpirationDate),
          delta: this.toNumber(p?.delta ?? p?.Delta),
          gamma: this.toNumber(p?.gamma ?? p?.Gamma),
          vega: this.toNumber(p?.vega ?? p?.Vega),
          theta: this.toNumber(p?.theta ?? p?.Theta),
          rho: this.toNumber(p?.rho ?? p?.Rho),
          profitAndLoss: this.toNumber(p?.profit_and_loss ?? p?.profitAndLoss ?? p?.ProfitAndLoss),
          fee: this.toNumber(p?.fee ?? p?.Fee)
        }))
      : [];

    const totalRaw = raw?.total ?? raw?.Total;
    const total: CalcTotal | undefined = totalRaw
      ? {
          delta: this.toNumber(totalRaw?.delta ?? totalRaw?.Delta),
          gamma: this.toNumber(totalRaw?.gamma ?? totalRaw?.Gamma),
          vega: this.toNumber(totalRaw?.vega ?? totalRaw?.Vega),
          theta: this.toNumber(totalRaw?.theta ?? totalRaw?.Theta),
          rho: this.toNumber(totalRaw?.rho ?? totalRaw?.Rho),
          profitAndLoss: this.toNumber(totalRaw?.profit_and_loss ?? totalRaw?.profitAndLoss ?? totalRaw?.ProfitAndLoss),
          fee: this.toNumber(totalRaw?.fee ?? totalRaw?.Fee)
        }
      : undefined;

    return {
      positions,
      total,
      initialMargin: this.toNumber(raw?.initial_margin ?? raw?.initialMargin ?? raw?.InitialMargin)
    };
  }

  private normalizeDate(value?: string | null): string {
    if (!value) {
      return '';
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

  private resetCharts(): void {
    this.calcResult = undefined;
    this.graphs = {};
    this.charts = [];
    this.tooltip = undefined;
    this.crosshairXValue = undefined;
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

  private toInteger(value: any): number {
    const num = this.toNumber(value);
    if (num == null) {
      return 0;
    }

    return Math.trunc(num);
  }

  private toBoolean(value: any): boolean | null {
    if (value === null || value === undefined) {
      return null;
    }

    if (typeof value === 'boolean') {
      return value;
    }

    const normalized = String(value).trim().toLowerCase();
    if (normalized === 'true') {
      return true;
    }

    if (normalized === 'false') {
      return false;
    }

    return null;
  }
}
