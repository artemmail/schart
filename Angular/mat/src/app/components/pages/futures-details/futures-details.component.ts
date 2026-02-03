import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { CommonService, FutInfo, FutureSeriesItem, OptionItem } from 'src/app/service/common.service';
import { MoneyToStrPipe } from 'src/app/pipes/money-to-str.pipe';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from 'src/app/environment';
import { OptionCodeService } from 'src/app/service/OptionCodeParserService.service';
import { MaterialModule } from 'src/app/material.module';
import { OptionBoardResponse, OptionBoardRow, OptionBoardService } from 'src/app/service/option-board.service';
import { FuturesSeriesTableComponent } from 'src/app/components/Controls/futures-series-table/futures-series-table.component';

@Component({
  standalone: true,
  selector: 'app-futures-details',
  imports: [CommonModule, MaterialModule, MoneyToStrPipe, FuturesSeriesTableComponent],
  templateUrl: './futures-details.component.html',
  styleUrls: ['./futures-details.component.css']
})
export class FuturesDetailsComponent implements OnInit {
  futInfo: FutInfo | null = null;
  errorMessage: string = '';
  group: string = '';
  name: string = '';
  isLoading: boolean = false;
  currentSeries: FutureSeriesItem | null = null;
  optionGroups: OptionGroup[] = [];
  optionSeriesList: OptionSeriesMeta[] = [];
  seriesBoards: SeriesBoardState[] = [];
  optionAssetCode: string | null = null;
  optionAssetType: string | null = null;
  optionAssetTitle: string | null = null;
  private readonly maxRows = 500;
  private optionsRaw: OptionItem[] = [];
  private readonly seriesMatchMaxDays = 10;

  constructor(
    private route: ActivatedRoute,
    private futInfoService: CommonService,
    private parser: OptionCodeService,
    private titleService: Title,
    private http: HttpClient,
    private boardService: OptionBoardService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const ticker = params.get('ticker')?.trim() ?? '';
      this.futInfo = null;
      this.errorMessage = '';
      this.group = '';
      this.name = '';
      this.isLoading = false;
      this.currentSeries = null;
      this.optionGroups = [];
      this.optionSeriesList = [];
      this.seriesBoards = [];
      this.optionAssetCode = null;
      this.optionAssetType = null;
      this.optionAssetTitle = null;
      this.optionsRaw = [];
      if (!ticker) {
        this.errorMessage = 'Тикер фьючерса не указан в URL.';
        return;
      }

      const baseInfo = this.parser.searchByCodeBase(ticker.substring(0, 2));
      const futuresInfo = this.parser.searchByCodeFutures(ticker);
      const infoToShow = baseInfo.group !== 'не найдено' ? baseInfo : futuresInfo;

      this.group = infoToShow.group;
      this.name = infoToShow.name;
      this.titleService.setTitle(`Фьючерс ${ticker} - информация и график`);
      this.loadFuturesInfo(ticker);
    });
  }

  loadFuturesInfo(ticker: string): void {
    this.isLoading = true;
    this.futInfoService.getFutInfo(ticker).subscribe({
      next: (data) => {
        this.applyFutInfo(data);
        this.isLoading = false;
      },
      error: (error) => {
        const fallbackTicker = this.getFallbackTicker(ticker);
        if (fallbackTicker && fallbackTicker !== ticker) {
          this.futInfoService.getFutInfo(fallbackTicker).subscribe({
            next: (data) => {
              this.applyFutInfo(data);
              this.isLoading = false;
            },
            error: (fallbackError) => {
              this.errorMessage = `Ошибка при загрузке информации о фьючерсе (${ticker}, ${fallbackTicker}).`;
              this.isLoading = false;
              console.error(fallbackError);
            }
          });
        } else {
          this.errorMessage = `Ошибка при загрузке информации о фьючерсе (${ticker}).`;
          this.isLoading = false;
        }
        console.error(error);
      }
    });
  }

  private applyFutInfo(data: FutInfo): void {
    this.futInfo = data;
    this.currentSeries = this.findCurrentSeries(data);
    this.optionsRaw = data.options ?? [];
    this.optionGroups = this.groupOptionsByExpiration(this.optionsRaw);
    const assetCode = this.resolveAssetCode(data);
    if (assetCode) {
      this.initOptionBoard(assetCode, this.optionsRaw);
    }
  }

  private getFallbackTicker(ticker: string): string | null {
    const baseInfo = this.parser.searchByCodeBase(ticker.substring(0, 2));
    if (
      baseInfo.group !== 'не найдено' &&
      ticker.toLowerCase() === baseInfo.code_base.toLowerCase() &&
      baseInfo.code_futures !== 'не найдено'
    ) {
      return baseInfo.code_futures;
    }

    const futuresInfo = this.parser.searchByCodeFutures(ticker);
    if (
      futuresInfo.group !== 'не найдено' &&
      ticker.toLowerCase() === futuresInfo.code_futures.toLowerCase() &&
      futuresInfo.code_base !== 'не найдено'
    ) {
      return futuresInfo.code_base;
    }

    return null;
  }

  private findCurrentSeries(info: FutInfo): FutureSeriesItem | null {
    const key = (info.shortName ?? '').toLowerCase();
    return info.another_futures?.find(x => (x.securityid ?? '').toLowerCase() === key) ?? null;
  }


  private initOptionBoard(assetCode: string, options: OptionItem[]): void {
    const assetsUrl = `${environment.apiUrl}/api/option-calc/assets`;
    const params = new HttpParams().set('query', assetCode);

    this.http.get<any[]>(assetsUrl, { params }).subscribe({
      next: (raw) => {
        const assets = this.normalizeAssets(raw);
        const asset = this.pickOptionAsset(assets, assetCode);
        if (!asset) {
          this.loadAssetsFallback(assetCode, options);
          return;
        }
        this.applyOptionAsset(asset, options);
      },
      error: () => {
        this.loadAssetsFallback(assetCode, options);
      }
    });
  }

  private loadAssetsFallback(assetCode: string, options: OptionItem[]): void {
    const assetsUrl = `${environment.apiUrl}/api/option-calc/assets`;
    this.http.get<any[]>(assetsUrl).subscribe({
      next: (raw) => {
        const assets = this.normalizeAssets(raw);
        const asset = this.pickOptionAsset(assets, assetCode);
        if (asset) {
          this.applyOptionAsset(asset, options);
        } else {
          this.optionSeriesList = [];
          this.optionGroups = this.groupOptionsByExpiration(options);
        }
      },
      error: () => {
        this.optionSeriesList = [];
        this.optionGroups = this.groupOptionsByExpiration(options);
      }
    });
  }

  private applyOptionAsset(asset: OptionAsset, options: OptionItem[]): void {
    this.optionAssetCode = asset.code;
    this.optionAssetType = asset.assetType ?? null;
    this.optionAssetTitle = asset.title ?? null;

    const baseUrl = `${environment.apiUrl}/api/option-calc/optionseries`;
    let params = new HttpParams().set('assetCode', asset.code);
    if (asset.assetType) {
      params = params.set('assetType', asset.assetType);
    }

    this.http.get<any[]>(baseUrl, { params }).subscribe({
      next: (raw) => {
        const list = this.normalizeSeries(raw);
        this.optionSeriesList = list;
        this.optionGroups = list.length > 0
          ? this.groupOptionsBySeries(options, list)
          : this.groupOptionsByExpiration(options);

        if (list.length === 0) {
          this.seriesBoards = [];
          return;
        }
        this.seriesBoards = list.map((series) => ({
          code: series.code,
          expirationDate: series.expirationDate ?? null,
          seriesType: series.seriesType ?? null,
          centralStrike: series.centralStrike ?? null,
          futuresCode: series.futuresCode ?? null,
          loading: false,
          error: '',
          board: undefined,
          lastUpdated: null
        }));
        this.refreshBoards();
      },
      error: () => {
        this.optionSeriesList = [];
        this.optionGroups = this.groupOptionsByExpiration(options);
        this.seriesBoards = [];
      }
    });
  }

  private groupOptionsByExpiration(options: OptionItem[]): OptionGroup[] {
    const map = new Map<string, OptionItem[]>();
    for (const option of options) {
      const key = option.expirationDate ?? 'неизвестно';
      const bucket = map.get(key) ?? [];
      bucket.push(option);
      map.set(key, bucket);
    }

    const entries = Array.from(map.entries()).map(([expirationDate, items]) => ({
      key: expirationDate,
      expirationDate,
      options: this.sortOptions(items)
    }));

    entries.sort((a, b) => this.compareDates(a.expirationDate, b.expirationDate));
    return entries;
  }

  private groupOptionsBySeries(options: OptionItem[], series: OptionSeriesMeta[]): OptionGroup[] {
    if (series.length === 0) {
      return this.groupOptionsByExpiration(options);
    }

    const seriesWithDate = series
      .map((s) => ({ ...s, date: this.parseDate(s.expirationDate) }))
      .filter((s) => s.date);

    if (seriesWithDate.length === 0) {
      return this.groupOptionsByExpiration(options);
    }

    const groups = new Map<string, OptionGroup>();
    const unmatched: OptionItem[] = [];

    for (const option of options) {
      const optionDate = this.parseDate(option.expirationDate);
      if (!optionDate) {
        unmatched.push(option);
        continue;
      }

      const seriesMatch = this.pickSeriesMatch(seriesWithDate, optionDate);
      if (!seriesMatch) {
        unmatched.push(option);
        continue;
      }

      const key = seriesMatch.code || this.normalizeDate(seriesMatch.expirationDate) || 'без кода';
      const existing = groups.get(key);
      if (existing) {
        existing.options.push(option);
      } else {
        groups.set(key, {
          key,
          seriesCode: seriesMatch.code,
          expirationDate: seriesMatch.expirationDate ?? null,
          seriesType: seriesMatch.seriesType ?? null,
          centralStrike: seriesMatch.centralStrike ?? null,
          futuresCode: seriesMatch.futuresCode ?? null,
          options: [option]
        });
      }
    }

    if (unmatched.length > 0) {
      const key = 'прочее';
      groups.set(key, {
        key,
        seriesCode: null,
        expirationDate: null,
        seriesType: null,
        centralStrike: null,
        futuresCode: null,
        options: this.sortOptions(unmatched)
      });
    }

    const result = Array.from(groups.values());
    result.forEach(group => {
      group.options = this.sortOptions(group.options);
    });
    result.sort((a, b) => this.compareDates(a.expirationDate, b.expirationDate));
    return result;
  }

  private pickSeriesMatch(series: Array<OptionSeriesMeta & { date?: Date | null }>, optionDate: Date): OptionSeriesMeta | null {
    const sameMonth = series.filter(s => s.date
      && s.date.getFullYear() === optionDate.getFullYear()
      && s.date.getMonth() === optionDate.getMonth());

    const candidates = sameMonth.length > 0 ? sameMonth : series;
    let best: OptionSeriesMeta | null = null;
    let bestDiff = Number.POSITIVE_INFINITY;

    for (const item of candidates) {
      if (!item.date) {
        continue;
      }
      const diffDays = Math.abs((item.date.getTime() - optionDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays < bestDiff) {
        bestDiff = diffDays;
        best = item;
      }
    }

    if (sameMonth.length > 0) {
      return best;
    }

    if (best && bestDiff <= this.seriesMatchMaxDays) {
      return best;
    }

    return null;
  }

  private sortOptions(items: OptionItem[]): OptionItem[] {
    return [...items].sort((a, b) => {
      const strikeA = a.strike ?? 0;
      const strikeB = b.strike ?? 0;
      if (strikeA !== strikeB) {
        return strikeA - strikeB;
      }
      return (a.optionType ?? '').localeCompare(b.optionType ?? '');
    });
  }

  private compareDates(a?: string | null, b?: string | null): number {
    if (!a || a === 'неизвестно') {
      return 1;
    }
    if (!b || b === 'неизвестно') {
      return -1;
    }
    return new Date(a).getTime() - new Date(b).getTime();
  }

  private normalizeSeries(raw: any[]): OptionSeriesMeta[] {
    if (!Array.isArray(raw)) {
      return [];
    }

    return raw
      .map((item) => ({
        code: String(item?.optionseries_code ?? item?.optionSeriesCode ?? item?.OptionSeriesCode ?? '').trim(),
        expirationDate: this.normalizeDate(item?.expiration_date ?? item?.expirationDate ?? item?.ExpirationDate),
        seriesType: String(item?.series_type ?? item?.seriesType ?? item?.SeriesType ?? '').trim() || null,
        centralStrike: this.toNumber(item?.central_strike ?? item?.centralStrike ?? item?.CentralStrike),
        futuresCode: String(item?.futures_code ?? item?.futuresCode ?? item?.FuturesCode ?? '').trim() || null
      }))
      .filter((item) => !!item.code);
  }

  private normalizeAssets(raw: any[]): OptionAsset[] {
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

  private pickOptionAsset(assets: OptionAsset[], assetCode: string): OptionAsset | null {
    if (assets.length === 0) {
      return null;
    }

    const codeLower = assetCode.toLowerCase();
    const exact = assets.filter((a) => a.code.toLowerCase() === codeLower);
    const matches = exact.length > 0
      ? exact
      : assets.filter((a) => a.code.toLowerCase().startsWith(codeLower));

    if (matches.length === 0) {
      return assets[0];
    }

    const priority = ['futures', 'index', 'share', 'currency', 'commodity'];
    const sorted = [...matches].sort((a, b) => {
      const ai = a.assetType ? priority.indexOf(a.assetType.toLowerCase()) : priority.length;
      const bi = b.assetType ? priority.indexOf(b.assetType.toLowerCase()) : priority.length;
      if (ai !== bi) {
        return ai - bi;
      }
      return a.code.length - b.code.length;
    });

    return sorted[0];
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

  private parseDate(value?: string | null): Date | null {
    const normalized = this.normalizeDate(value);
    if (!normalized || normalized === 'неизвестно') {
      return null;
    }

    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }

    return parsed;
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

  refreshBoards(): void {
    if (!this.optionAssetCode) {
      return;
    }
    for (const series of this.seriesBoards) {
      this.fetchBoardForSeries(series);
    }
  }

  getCallRows(series: SeriesBoardState): OptionBoardRow[] {
    return series.board?.call ?? [];
  }

  getPutRows(series: SeriesBoardState): OptionBoardRow[] {
    return series.board?.put ?? [];
  }

  isCentral(series: SeriesBoardState, row: OptionBoardRow): boolean {
    if (row.strike == null || series.centralStrike == null) {
      return false;
    }
    return Math.abs(row.strike - series.centralStrike) < 1e-9;
  }

  private fetchBoardForSeries(series: SeriesBoardState): void {
    if (!this.optionAssetCode) {
      return;
    }

    series.loading = true;
    series.error = '';

    this.boardService.getOptionBoard({
      assetCode: this.optionAssetCode,
      optionSeriesCode: series.code,
      rows: this.maxRows,
      assetType: this.optionAssetType
    }).subscribe({
      next: (response) => {
        series.board = response;
        series.lastUpdated = new Date();
        series.loading = false;
      },
      error: () => {
        series.error = 'Не удалось получить доску опционов.';
        series.board = { call: [], put: [] };
        series.loading = false;
      }
    });
  }

  private resolveAssetCode(info: FutInfo): string | null {
    if (info.assetCode && info.assetCode.trim()) {
      return info.assetCode.trim();
    }

    const fromShort = this.extractAssetCode(info.shortName);
    if (fromShort) {
      return fromShort;
    }

    return null;
  }

  private extractAssetCode(value?: string | null): string | null {
    if (!value) {
      return null;
    }

    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const dashIndex = trimmed.indexOf('-');
    if (dashIndex > 0) {
      return trimmed.substring(0, dashIndex).trim();
    }

    const match = /^[A-Za-z0-9]+/.exec(trimmed);
    if (match && match[0]) {
      return match[0];
    }

    return trimmed;
  }

  contangoLabel(value?: string | null): string {
    if (value === 'contango') {
      return 'контанго';
    }
    if (value === 'backwardation') {
      return 'бэквордация';
    }
    if (value === 'flat') {
      return 'паритет';
    }
    return '';
  }

  seriesTypeLabel(value?: string | null): string {
    switch ((value ?? '').toUpperCase()) {
      case 'W':
        return 'недельная';
      case 'M':
        return 'месячная';
      case 'Q':
        return 'квартальная';
      default:
        return value ?? '';
    }
  }
}

interface OptionGroup {
  key: string;
  seriesCode?: string | null;
  expirationDate?: string | null;
  seriesType?: string | null;
  centralStrike?: number | null;
  futuresCode?: string | null;
  options: OptionItem[];
}

interface OptionSeriesMeta {
  code: string;
  expirationDate?: string | null;
  seriesType?: string | null;
  centralStrike?: number | null;
  futuresCode?: string | null;
}

interface OptionAsset {
  code: string;
  title?: string | null;
  assetType?: string | null;
}

interface SeriesBoardState {
  code: string;
  expirationDate?: string | null;
  seriesType?: string | null;
  centralStrike?: number | null;
  futuresCode?: string | null;
  loading: boolean;
  error: string;
  board?: OptionBoardResponse;
  lastUpdated?: Date | null;
}
