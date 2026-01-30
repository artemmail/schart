import { CommonModule } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

interface OptionSmilePoint {
  securityId: string;
  optionType?: string | null;
  boardId?: string | null;
  strike?: number | null;
  impliedVolatility?: number | null;
  theorPrice?: number | null;
  last?: number | null;
  bid?: number | null;
  offer?: number | null;
  volToday?: number | null;
  openPosition?: number | null;
}

interface OptionSmileResponse {
  assetCode: string;
  expirationDate: string;
  asOf?: string | null;
  points: OptionSmilePoint[];
}

interface SmileSeriesPoint {
  strike: number;
  vol: number;
  raw: OptionSmilePoint;
  x: number;
  y: number;
}

interface SmileSeries {
  type: 'C' | 'P';
  color: string;
  points: SmileSeriesPoint[];
  path: string;
}

interface AxisTick {
  value: number;
  position: number;
}

interface SmileChart {
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
}

@Component({
  selector: 'app-volatility-smile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './volatility-smile.component.html',
  styleUrls: ['./volatility-smile.component.css']
})
export class VolatilitySmileComponent implements OnInit {
  assets: string[] = [];
  expirations: string[] = [];
  selectedAsset = '';
  selectedExpiration = '';
  optionType: 'ALL' | 'C' | 'P' = 'ALL';

  loading = false;
  error?: string;

  smile?: OptionSmileResponse;
  chart?: SmileChart;

  constructor(private readonly http: HttpClient) {}

  async ngOnInit(): Promise<void> {
    await this.loadAssets();
  }

  async loadAssets(): Promise<void> {
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
      this.error = 'Не удалось получить список доступных ассетов.';
      this.assets = [];
    } finally {
      this.loading = false;
    }
  }

  async onAssetChange(): Promise<void> {
    if (!this.selectedAsset) {
      this.expirations = [];
      this.selectedExpiration = '';
      this.smile = undefined;
      this.chart = undefined;
      return;
    }

    await this.loadExpirations();
  }

  async onExpirationChange(): Promise<void> {
    if (!this.selectedExpiration || !this.selectedAsset) {
      this.smile = undefined;
      this.chart = undefined;
      return;
    }

    await this.loadSmile();
  }

  async onOptionTypeChange(): Promise<void> {
    if (this.smile) {
      this.buildChart(this.smile);
    }
  }

  async refresh(): Promise<void> {
    if (!this.selectedAsset || !this.selectedExpiration) {
      return;
    }

    await this.loadSmile();
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
    this.loading = true;
    this.error = undefined;

    try {
      let params = new HttpParams()
        .set('asset', this.selectedAsset)
        .set('expiration', this.selectedExpiration);

      const smile = await firstValueFrom(
        this.http.get<OptionSmileResponse>('/api/options/smile', { params })
      );
      this.smile = smile;
      this.buildChart(smile);
    } catch (err) {
      this.error = 'Нет данных для выбранного ассета/экспирации.';
      this.smile = undefined;
      this.chart = undefined;
    } finally {
      this.loading = false;
    }
  }

  private buildChart(smile: OptionSmileResponse): void {
    const filtered = (smile.points ?? [])
      .map((p) => ({
        ...p,
        optionType: this.normalizeOptionType(p.optionType)
      }))
      .filter((p) => p.strike != null && p.impliedVolatility != null);

    if (filtered.length === 0) {
      this.chart = undefined;
      return;
    }

    const seriesTypes: Array<'C' | 'P'> =
      this.optionType === 'ALL' ? ['C', 'P'] : [this.optionType];

    const series: SmileSeries[] = [];
    const strikes = filtered.map((p) => p.strike!) as number[];
    const vols = filtered.map((p) => p.impliedVolatility!) as number[];

    const xMin = Math.min(...strikes);
    const xMax = Math.max(...strikes);
    const yMinRaw = Math.min(...vols);
    const yMaxRaw = Math.max(...vols);
    const yPadding = Math.max((yMaxRaw - yMinRaw) * 0.1, 1);
    const yMin = yMinRaw - yPadding;
    const yMax = yMaxRaw + yPadding;

    const width = 760;
    const height = 420;
    const plotLeft = 64;
    const plotTop = 24;
    const plotWidth = width - plotLeft - 24;
    const plotHeight = height - plotTop - 56;

    for (const type of seriesTypes) {
      const points = filtered
        .filter((p) => p.optionType === type)
        .sort((a, b) => (a.strike ?? 0) - (b.strike ?? 0))
        .map((p) => ({
          strike: p.strike!,
          vol: p.impliedVolatility!,
          raw: p,
          x: this.scale(p.strike!, xMin, xMax, plotLeft, plotLeft + plotWidth),
          y: this.scale(p.impliedVolatility!, yMin, yMax, plotTop + plotHeight, plotTop)
        }));

      if (points.length === 0) {
        continue;
      }

      const path = points
        .map((p, index) => `${index === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
        .join(' ');

      series.push({
        type,
        color: type === 'C' ? '#2563eb' : '#e11d48',
        points,
        path
      });
    }

    if (series.length === 0) {
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
      xTicks: this.makeTicks(xMin, xMax, 5).map((value) => ({
        value,
        position: this.scale(value, xMin, xMax, plotLeft, plotLeft + plotWidth)
      })),
      yTicks: this.makeTicks(yMin, yMax, 5).map((value) => ({
        value,
        position: this.scale(value, yMin, yMax, plotTop + plotHeight, plotTop)
      })),
      series
    };
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

  get seriesCount(): number {
    return this.chart?.series?.length ?? 0;
  }

  get pointCount(): number {
    if (!this.chart) {
      return 0;
    }

    return this.chart.series.reduce((acc, series) => acc + series.points.length, 0);
  }
}
