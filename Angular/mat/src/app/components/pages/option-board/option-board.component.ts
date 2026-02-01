import { CommonModule } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription, debounceTime, finalize, of, switchMap, takeUntil, catchError, tap } from 'rxjs';
import { MaterialModule } from 'src/app/material.module';
import { OptionBoardResponse, OptionBoardRow, OptionBoardService } from 'src/app/service/option-board.service';

type SortKey = 'strike' | 'volatility' | 'numtrades';
type SortDir = 'asc' | 'desc';

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

@Component({
  standalone: true,
  selector: 'app-option-board',
  imports: [CommonModule, FormsModule, MaterialModule],
  templateUrl: './option-board.component.html',
  styleUrls: ['./option-board.component.scss']
})
export class OptionBoardComponent implements OnInit, OnDestroy {
  assets: AssetItem[] = [];
  assetTypes: string[] = [];
  series: OptionSeriesItem[] = [];

  selectedAsset = '';
  selectedAssetType: string | null = null;
  selectedSeries = '';
  rows = 12;

  onlyTradable = false;
  onlyWithTrades = false;
  onlyNearAtm = false;

  sortKey: SortKey = 'strike';
  sortDir: SortDir = 'asc';

  autoRefresh = false;
  lastUpdated?: Date | null;

  board?: OptionBoardResponse;
  centralStrike?: number | null;
  expirationDate?: string | null;
  highlightStrike?: number | null;

  loading = false;
  error?: string;

  private readonly reload$ = new Subject<void>();
  private readonly destroy$ = new Subject<void>();
  private reloadSub?: Subscription;
  private autoRefreshId?: number;

  constructor(
    private readonly http: HttpClient,
    private readonly boardService: OptionBoardService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.reloadSub = this.reload$
      .pipe(
        debounceTime(300),
        switchMap(() => this.fetchBoard()),
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

  get callRows(): OptionBoardRow[] {
    return this.applyFilters(this.board?.call ?? []);
  }

  get putRows(): OptionBoardRow[] {
    return this.applyFilters(this.board?.put ?? []);
  }

  onAssetChange(): void {
    this.updateAssetTypeOptions();
    this.series = [];
    this.selectedSeries = '';
    this.board = undefined;
    this.centralStrike = null;
    this.expirationDate = null;
    this.highlightStrike = null;
    this.lastUpdated = null;
    this.loadSeries();
  }

  onAssetTypeChange(): void {
    this.loadSeries();
  }

  onSeriesChange(): void {
    this.applySeriesMeta();
    this.triggerReload();
  }

  onRowsChange(): void {
    this.triggerReload();
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

  openOption(row: OptionBoardRow): void {
    if (!row.secid) {
      return;
    }
    this.router.navigate(['/option', row.secid]);
  }

  async copySecid(row: OptionBoardRow, event: MouseEvent): Promise<void> {
    event.stopPropagation();
    if (!row.secid) {
      return;
    }
    try {
      await navigator.clipboard.writeText(row.secid);
    } catch {
      // Ignore clipboard errors (e.g. permission denied).
    }
  }

  isCentral(row: OptionBoardRow): boolean {
    if (this.highlightStrike == null || row.strike == null) {
      return false;
    }
    return Math.abs(row.strike - this.highlightStrike) < 1e-9;
  }

  private triggerReload(skipDebounce = false): void {
    if (skipDebounce) {
      this.fetchBoard().subscribe();
      return;
    }
    this.reload$.next();
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
            this.triggerReload(true);
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

  private fetchBoard() {
    if (!this.selectedAsset || !this.selectedSeries) {
      return of(null);
    }

    this.loading = true;
    this.error = undefined;

    return this.boardService.getOptionBoard({
      assetCode: this.selectedAsset,
      optionSeriesCode: this.selectedSeries,
      rows: this.rows,
      assetType: this.selectedAssetType
    }).pipe(
      tap((response) => {
        this.board = response;
        this.lastUpdated = new Date();
        this.updateHighlightStrike();
      }),
      catchError((err) => {
        this.error = this.extractError(err, 'Нет данных для выбранной серии.');
        this.board = { call: [], put: [] };
        return of(null);
      }),
      finalize(() => {
        this.loading = false;
      })
    );
  }

  private applySeriesMeta(): void {
    const current = this.series.find((s) => s.code === this.selectedSeries);
    this.centralStrike = current?.centralStrike ?? null;
    this.expirationDate = current?.expirationDate ?? null;
  }

  private updateHighlightStrike(): void {
    if (!this.board) {
      this.highlightStrike = null;
      return;
    }

    const strikes = [...this.board.call, ...this.board.put]
      .map((row) => row.strike)
      .filter((value): value is number => value != null);

    if (strikes.length === 0) {
      this.highlightStrike = null;
      return;
    }

    const center = this.centralStrike ?? strikes[Math.floor(strikes.length / 2)];
    let nearest = strikes[0];
    let minDiff = Math.abs(nearest - center);
    for (const strike of strikes) {
      const diff = Math.abs(strike - center);
      if (diff < minDiff) {
        minDiff = diff;
        nearest = strike;
      }
    }
    this.highlightStrike = nearest;
  }

  private applyFilters(rows: OptionBoardRow[]): OptionBoardRow[] {
    let result = [...rows];

    if (this.onlyTradable) {
      result = result.filter((row) => this.isTradable(row));
    }

    if (this.onlyWithTrades) {
      result = result.filter((row) => (row.numtrades ?? 0) > 0);
    }

    if (this.onlyNearAtm) {
      result = this.sliceNearAtm(result);
    }

    result.sort((a, b) => this.compareRows(a, b));
    return result;
  }

  private isTradable(row: OptionBoardRow): boolean {
    return (row.bid ?? 0) > 0 || (row.offer ?? 0) > 0 || (row.last ?? 0) > 0;
  }

  private sliceNearAtm(rows: OptionBoardRow[]): OptionBoardRow[] {
    const sorted = rows
      .filter((row) => row.strike != null)
      .sort((a, b) => (a.strike ?? 0) - (b.strike ?? 0));

    if (sorted.length === 0) {
      return rows;
    }

    const center = this.highlightStrike ?? sorted[Math.floor(sorted.length / 2)].strike ?? 0;
    let nearestIndex = 0;
    let minDiff = Math.abs((sorted[0].strike ?? 0) - center);
    sorted.forEach((row, index) => {
      const diff = Math.abs((row.strike ?? 0) - center);
      if (diff < minDiff) {
        minDiff = diff;
        nearestIndex = index;
      }
    });

    const span = 6;
    const start = Math.max(0, nearestIndex - span);
    const end = Math.min(sorted.length, nearestIndex + span + 1);
    return sorted.slice(start, end);
  }

  private compareRows(a: OptionBoardRow, b: OptionBoardRow): number {
    const dir = this.sortDir === 'asc' ? 1 : -1;
    switch (this.sortKey) {
      case 'volatility':
        return dir * ((a.volatility ?? 0) - (b.volatility ?? 0));
      case 'numtrades':
        return dir * ((a.numtrades ?? 0) - (b.numtrades ?? 0));
      default:
        return dir * ((a.strike ?? 0) - (b.strike ?? 0));
    }
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
