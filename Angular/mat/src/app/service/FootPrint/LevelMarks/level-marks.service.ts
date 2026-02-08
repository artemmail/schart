import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { FootPrintParameters } from 'src/app/models/Params';
import { environment } from 'src/app/environment';

export class MarkLineLevel {
  constructor(public comment: string = '', public color: string = 'red') {}
}

export class VolumeFilter {
  constructor(public volume1: number = 0, public volume2: number = 0) {}
}

export class MarkParamsData {
  levels: Record<number, MarkLineLevel> = {};
  dates: Record<string, MarkLineLevel> = {};
  filters: VolumeFilter = new VolumeFilter();

  public toggleDate(date: string): void {
    if (!this.dates[date]) {
      this.dates[date] = new MarkLineLevel('', '#F0E68C');
    } else {
      delete this.dates[date];
    }
  }

  public togglePrice(price: number): void {
    if (!this.levels[price]) {
      this.levels[price] = new MarkLineLevel('', '#F0E68C');
    } else {
      delete this.levels[price];
    }
  }

  public getPriceMark(price: number): MarkLineLevel {
    return this.levels[price];
  }

  public geDateMark(date: string): MarkLineLevel {
    return this.dates[date];
  }

  static fromJSON(jsonString: string): MarkParamsData {
    const jsonObject = JSON.parse(jsonString);
    const markParamsData = new MarkParamsData();

    markParamsData.levels = this.deserializeLevels(jsonObject?.levels);
    markParamsData.dates = this.deserializeDates(jsonObject?.dates);
    markParamsData.filters = jsonObject.filters
      ? new VolumeFilter(jsonObject.filters.volume1, jsonObject.filters.volume2)
      : new VolumeFilter();

    return markParamsData;
  }

  static fromLocalJSON(jsonString: string): MarkParamsData {
    const jsonObject = JSON.parse(jsonString);
    const markParamsData = new MarkParamsData();

    markParamsData.dates = this.deserializeDates(jsonObject?.dates);
    markParamsData.filters = jsonObject?.filters
      ? new VolumeFilter(jsonObject.filters.volume1, jsonObject.filters.volume2)
      : new VolumeFilter();

    return markParamsData;
  }

  private static deserializeLevels(levels: Record<string, any> | undefined | null): Record<number, MarkLineLevel> {
    const deserializedLevels: Record<number, MarkLineLevel> = {};
    if (!levels) {
      return deserializedLevels;
    }
    for (const key in levels) {
      if (levels.hasOwnProperty(key)) {
        deserializedLevels[+key] = new MarkLineLevel(levels[key].comment, levels[key].color);
      }
    }
    return deserializedLevels;
  }

  private static deserializeDates(dates: Record<string, any> | undefined | null): Record<string, MarkLineLevel> {
    const deserializedDates: Record<string, MarkLineLevel> = {};
    if (!dates) {
      return deserializedDates;
    }
    for (const key in dates) {
      if (dates.hasOwnProperty(key)) {
        deserializedDates[key] = new MarkLineLevel(dates[key].comment, dates[key].color);
      }
    }
    return deserializedDates;
  }

  public toJSON(): string {
    
    return JSON.stringify({levels: this.levels, dates: this.dates, filters: this.filters});
  }

  public toLocalJSON(): string {
    return JSON.stringify({ dates: this.dates, filters: this.filters });
  }
}

export interface PriceMarkDto {
  price: number;
  color: string;
  comment: string;
}

export interface LevelMarksLoadOptions {
  skipServer?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class LevelMarksService {
  private currentParams: FootPrintParameters | null = null;
  public markParamsData: MarkParamsData;
  private apiUrl = `${environment.apiUrl}/api/FootprintLevelMarks`;
  private loadToken = 0;
  private serverMarksAvailable = true;
  private serverMarksWarned = false;
  private unavailableTickers = new Set<string>();
  private unavailableTickerWarned = new Set<string>();
  private loadQueue: Promise<void> = Promise.resolve();

  public getDates(): Record<string, MarkLineLevel>
  {
      return this.markParamsData.dates;
  }

  public getPrices(): Record<number, MarkLineLevel>
  {
      return this.markParamsData.levels;
  }

  constructor(private http: HttpClient) {
    this.markParamsData = new MarkParamsData();
  }

  private getStorageKey(params: FootPrintParameters): string {
    return `levelsMark_${params.ticker}`;
  }

  public getStorageKeyForParams(params: FootPrintParameters): string {
    return this.getStorageKey(params);
  }

  public async load(
    params: FootPrintParameters,
    options: LevelMarksLoadOptions = {}
  ): Promise<void> {
    this.currentParams = { ...params };
    const key = params.ticker ? this.getStorageKey(params) : null;
    const jsonString = key ? window.localStorage.getItem(key) : null;
    this.markParamsData = jsonString
      ? MarkParamsData.fromLocalJSON(jsonString)
      : new MarkParamsData();

    if (options.skipServer) {
      this.markParamsData.levels = {};
      return;
    }

    await this.loadPriceMarks(params.ticker);
  }

  public clear(): void {
    if (!this.currentParams) {
      return;
    }
    const key = this.currentParams.ticker ? this.getStorageKey(this.currentParams) : null;
    this.markParamsData = new MarkParamsData();
    if (key) {
      window.localStorage.removeItem(key);
    }
  }

  public clearStorageForTicker(ticker: string | undefined): void {
    this.clear();
    if (!ticker) {
      return;
    }

    const prefix = `levelsMark_${ticker}_`;
    const exact = `levelsMark_${ticker}`;
    const keysToRemove: string[] = [];

    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key) {
        continue;
      }

      if (key === exact || key.startsWith(prefix)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => window.localStorage.removeItem(key));
    void this.deleteAllPriceMarks(ticker);
  }

  public save(): void {
    if (!this.currentParams) {
      throw new Error('LevelMarksService not initialized with FootPrintParameters.');
    }
    if (!this.currentParams.ticker) {
      return;
    }
    const key = this.getStorageKey(this.currentParams);
    var s = this.markParamsData.toLocalJSON();
    window.localStorage.setItem(key, s);
  }

  public toggleDate(date: string): void {
    this.markParamsData.toggleDate(date);
    this.save();
  }


  public setVolume1(vol: number): void {
    this.markParamsData.filters.volume1 = vol;
    this.save();
  }

  public setVolume2(vol: number): void {
    this.markParamsData.filters.volume2 = vol;
    this.save();
  }

  public togglePrice(price: number): void {
    const priceKey = this.findClosestPriceKey(price);
    if (priceKey !== null) {
      delete this.markParamsData.levels[priceKey];
      void this.deletePriceMark(this.currentParams?.ticker, priceKey);
      this.save();
      return;
    }

    this.markParamsData.levels[price] = new MarkLineLevel('', '#F0E68C');
    void this.upsertPriceMark(this.currentParams?.ticker, price, this.markParamsData.levels[price]);
    this.save();
  }

  public getPriceMark(price: number): MarkLineLevel | undefined {
    const priceKey = this.findClosestPriceKey(price);
    if (priceKey === null) {
      return undefined;
    }
    return this.markParamsData.levels[priceKey];
  }

  public getDateMark(date: string): MarkLineLevel {
    return this.markParamsData.geDateMark(date);
  }

  public getFilters(): VolumeFilter {
    return this.markParamsData.filters;
  }

  public updatePriceMark(price: number, level: MarkLineLevel): void {
    if (!this.currentParams) {
      throw new Error('LevelMarksService not initialized with FootPrintParameters.');
    }

    const priceKey = this.findClosestPriceKey(price) ?? price;
    this.markParamsData.levels[priceKey] = new MarkLineLevel(level.comment, level.color);
    void this.upsertPriceMark(this.currentParams.ticker, priceKey, this.markParamsData.levels[priceKey]);
  }

  public saveParamsHistory(params: FootPrintParameters): void {
    let hisDic: Record<string, any> = {};
    try {
      const storedHistory = window.localStorage.getItem('footPrintHistory');
      if (storedHistory) {
        hisDic = JSON.parse(storedHistory);
      }
    } catch (e) {
      console.error('Error parsing history from localStorage', e);
    }

    const key = JSON.stringify(params);
    const count = hisDic[key] ? hisDic[key].count + 1 : 1;

    hisDic[key] = { count, params, date: new Date() };
    window.localStorage.setItem('footPrintHistory', JSON.stringify(hisDic));
    this.updateHistory();
  }

  public paramToStr(param: FootPrintParameters): string {
    return `${param.ticker},${param.startDate}-${param.endDate},таймфрейм:${param.period} мин,шаг:${param.priceStep}`;
  }

  public updateHistory(): void {
    try {
      const storedHistory = window.localStorage.getItem('footPrintHistory');
      if (!storedHistory) return;

      const hisDic = JSON.parse(storedHistory);
      if (!hisDic) return;

      // Logic for updating history view can be placed here
    } catch (e) {
      console.error('Error updating history', e);
    }
  }

  private async loadPriceMarks(ticker?: string): Promise<void> {
    const token = ++this.loadToken;
    this.markParamsData.levels = {};
    const normalizedTicker = this.normalizeTicker(ticker);
    if (!normalizedTicker) {
      return;
    }
    if (!this.serverMarksAvailable) {
      return;
    }
    if (this.unavailableTickers.has(normalizedTicker)) {
      return;
    }

    await this.enqueueLoad(async () => {
      if (token !== this.loadToken) {
        return;
      }
      if (!this.serverMarksAvailable || this.unavailableTickers.has(normalizedTicker)) {
        return;
      }

      try {
        const marks = await firstValueFrom(
          this.http.get<PriceMarkDto[]>(this.apiUrl, {
            params: { ticker: normalizedTicker },
            withCredentials: true,
          })
        );
        if (token !== this.loadToken) {
          return;
        }

        const levels: Record<number, MarkLineLevel> = {};
        (marks ?? []).forEach((mark) => {
          if (mark && Number.isFinite(mark.price)) {
            levels[mark.price] = new MarkLineLevel(mark.comment ?? '', mark.color ?? '#F0E68C');
          }
        });
        this.markParamsData.levels = levels;
      } catch (err) {
        if (token !== this.loadToken) {
          return;
        }
        if (this.markTickerUnavailable(err, normalizedTicker, 'load')) {
          return;
        }
        if (this.markApiMissing(err, 'load')) {
          return;
        }
        console.error('Failed to load footprint level marks', err);
        this.markParamsData.levels = {};
      }
    });
  }

  private async upsertPriceMark(
    ticker: string | undefined,
    price: number,
    level: MarkLineLevel
  ): Promise<void> {
    const normalizedTicker = this.normalizeTicker(ticker);
    if (!normalizedTicker) {
      return;
    }
    if (!this.serverMarksAvailable) {
      return;
    }
    if (this.unavailableTickers.has(normalizedTicker)) {
      return;
    }

    try {
      await firstValueFrom(
        this.http.post<PriceMarkDto>(
          this.apiUrl,
          {
            ticker: normalizedTicker,
            price,
            color: level.color,
            comment: level.comment,
          },
          { withCredentials: true }
        )
      );
    } catch (err) {
      if (this.markTickerUnavailable(err, normalizedTicker, 'save')) {
        return;
      }
      if (this.isNotFound(err)) {
        return;
      }
      console.error('Failed to save footprint level mark', err);
    }
  }

  private async deletePriceMark(ticker: string | undefined, price: number): Promise<void> {
    const normalizedTicker = this.normalizeTicker(ticker);
    if (!normalizedTicker) {
      return;
    }
    if (!this.serverMarksAvailable) {
      return;
    }
    if (this.unavailableTickers.has(normalizedTicker)) {
      return;
    }

    try {
      await firstValueFrom(
        this.http.delete<void>(this.apiUrl, {
          params: {
            ticker: normalizedTicker,
            price: price.toString(),
          },
          withCredentials: true,
        })
      );
    } catch (err) {
      if (this.markTickerUnavailable(err, normalizedTicker, 'delete')) {
        return;
      }
      if (this.isNotFound(err)) {
        return;
      }
      console.error('Failed to delete footprint level mark', err);
    }
  }

  private async deleteAllPriceMarks(ticker: string): Promise<void> {
    const normalizedTicker = this.normalizeTicker(ticker);
    if (!normalizedTicker) {
      return;
    }
    if (!this.serverMarksAvailable) {
      return;
    }
    if (this.unavailableTickers.has(normalizedTicker)) {
      return;
    }

    try {
      await firstValueFrom(
        this.http.delete<void>(`${this.apiUrl}/ticker`, {
          params: { ticker: normalizedTicker },
          withCredentials: true,
        })
      );
    } catch (err) {
      if (this.markTickerUnavailable(err, normalizedTicker, 'clear')) {
        return;
      }
      if (this.isNotFound(err)) {
        return;
      }
      console.error('Failed to clear footprint level marks', err);
    }
  }

  private enqueueLoad(task: () => Promise<void>): Promise<void> {
    const run = this.loadQueue.then(task, task);
    this.loadQueue = run.catch(() => undefined);
    return run;
  }

  private normalizeTicker(ticker: string | undefined | null): string | null {
    if (typeof ticker !== 'string') {
      return null;
    }

    const normalized = ticker.trim();
    return normalized.length ? normalized : null;
  }

  private markTickerUnavailable(
    err: unknown,
    ticker: string,
    action: string
  ): boolean {
    if (!(err instanceof HttpErrorResponse) || err.status !== 404) {
      return false;
    }

    const message = this.extractErrorMessage(err).toLowerCase();
    if (!message.includes('ticker not found')) {
      return false;
    }

    this.unavailableTickers.add(ticker);
    if (!this.unavailableTickerWarned.has(ticker)) {
      this.unavailableTickerWarned.add(ticker);
      console.warn(
        `FootprintLevelMarks ticker unavailable: "${ticker}". Skip server marks (action: ${action}).`
      );
    }

    return true;
  }

  private isNotFound(err: unknown): boolean {
    return err instanceof HttpErrorResponse && err.status === 404;
  }

  private extractErrorMessage(err: HttpErrorResponse): string {
    if (typeof err.error === 'string') {
      return err.error;
    }

    if (err.error && typeof err.error === 'object') {
      const data = err.error as { message?: unknown; title?: unknown };
      if (typeof data.message === 'string') {
        return data.message;
      }
      if (typeof data.title === 'string') {
        return data.title;
      }
    }

    return '';
  }

  private markApiMissing(err: unknown, action: string): boolean {
    if (!(err instanceof HttpErrorResponse)) {
      return false;
    }

    if (err.status !== 404) {
      return false;
    }
    if (action !== 'load') {
      return false;
    }

    this.serverMarksAvailable = false;
    if (!this.serverMarksWarned) {
      this.serverMarksWarned = true;
      console.warn(
        `FootprintLevelMarks API unavailable (404). Disable server marks calls (action: ${action}).`
      );
    }
    return true;
  }

  private findClosestPriceKey(price: number): number | null {
    const tolerance = this.getPriceTolerance();
    let closestKey: number | null = null;
    let closestDiff = Number.POSITIVE_INFINITY;

    for (const key in this.markParamsData.levels) {
      const keyValue = Number(key);
      if (!Number.isFinite(keyValue)) {
        continue;
      }
      const diff = Math.abs(keyValue - price);
      if (diff <= tolerance && diff < closestDiff) {
        closestDiff = diff;
        closestKey = keyValue;
      }
    }

    return closestKey;
  }

  private getPriceTolerance(): number {
    const step = Math.abs(this.currentParams?.priceStep ?? 0);
    if (!step) {
      return 0;
    }
    return step / 2;
  }
}
