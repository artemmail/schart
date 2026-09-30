import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subject, firstValueFrom, takeUntil } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { FootPrintParameters } from 'src/app/models/Params';
import { ChartSettings } from 'src/app/models/ChartSettings';
import { SelectListItemNumber } from 'src/app/models/preserts';
import { ChartSettingsService } from 'src/app/service/chart-settings.service';
import { LevelMarksService } from 'src/app/service/FootPrint/LevelMarks/level-marks.service';
import { ClusterStreamService } from 'src/app/service/FootPrint/ClusterStream/cluster-stream.service';
import { FootprintUtilitiesService } from './footprint-utilities.service';
import { ClusterData } from '../models/cluster-data';
import { CandlesRangeSetValue } from 'src/app/models/candles-range-set';
import {
  copyFootprintParams, FootprintInitOptions, FootprintLoadRequest, FootprintLoadState,
  FootprintPendingUpdate, FootprintPreparedSession, FootprintSnapshot,
  FootprintUpdateEvent, FootprintUpdateType,
} from '../models/footprint-data.types';
import {
  applyFootprintModeToParams, DEFAULT_ARBITRAGE_PORTFOLIO_1,
  DEFAULT_ARBITRAGE_PORTFOLIO_2, resolveFootprintMode,
} from 'src/app/models/footprint-mode';

@Injectable()
export class FootprintDataLoaderService implements OnDestroy {
  private presetIndex?: number;
  private options: FootprintInitOptions = { minimode: false, deltamode: false };
  private sequence = 0;
  private destroyed = false;
  private activeRequest: FootprintLoadRequest | null = null;
  private cancellation = new Subject<void>();
  private currentSnapshot: FootprintSnapshot | null = null;

  private stateSubject = new BehaviorSubject<FootprintLoadState>({ status: 'idle', sessionId: 0 });
  readonly state$ = this.stateSubject.asObservable();
  private settingsChanges = new Subject<{ sessionId: number; settings: Readonly<ChartSettings> }>();
  readonly settingsChanges$ = this.settingsChanges.asObservable();
  private presetsSubject = new BehaviorSubject<SelectListItemNumber[]>([]);

  constructor(
    private settingsService: ChartSettingsService,
    private levelMarksService: LevelMarksService,
    private clusterStreamService: ClusterStreamService,
    private utilities: FootprintUtilitiesService
  ) {}

  get state(): FootprintLoadState { return this.stateSubject.value; }
  get snapshot(): FootprintSnapshot | null { return this.currentSnapshot; }

  ngOnDestroy(): void { this.destroy(); }

  isCurrentSession(sessionId: number): boolean {
    return !this.destroyed && this.activeRequest?.sessionId === sessionId;
  }

  beginSession(
    params: Readonly<FootPrintParameters>,
    presetIndex = this.presetIndex,
    options: Readonly<FootprintInitOptions> = this.options,
    loadPresets = false,
    settings?: ChartSettings
  ): FootprintLoadRequest | null {
    if (this.destroyed) return null;
    this.cancelPending();
    this.levelMarksService.invalidateLoad();
    this.presetIndex = presetIndex;
    this.options = { ...options };
    const request: FootprintLoadRequest = Object.freeze({
      sessionId: ++this.sequence,
      params: Object.freeze(copyFootprintParams(params)),
      presetIndex,
      options: Object.freeze({ ...options }),
      loadPresets,
      settings: settings ? structuredClone(settings) : undefined,
    });
    this.activeRequest = request;
    this.currentSnapshot = null;
    this.stateSubject.next({ status: 'loading', sessionId: request.sessionId, params: request.params });
    return request;
  }

  async loadSession(
    request: FootprintLoadRequest,
    beforeRange?: (session: FootprintPreparedSession) => Promise<void>
  ): Promise<FootprintSnapshot | null> {
    try {
      this.assertLoading(request.sessionId);
      let presets = this.presetsSubject.value;
      if (request.loadPresets) {
        presets = await this.utilities.loadPresets();
        this.assertLoading(request.sessionId);
      }
      const presetIndex = request.presetIndex ?? presets[0]?.Value;
      const settings = request.settings ?? await this.resolveSettings(request, presetIndex);
      this.assertLoading(request.sessionId);
      const params = Object.freeze(this.normalizeParams(request.params, settings));
      const session: FootprintPreparedSession = Object.freeze({
        sessionId: request.sessionId, params, presetIndex, options: request.options,
        settings: structuredClone(settings), presets: presets.map(item => ({ ...item })),
      });
      // Realtime handlers are registered before requesting the history snapshot.
      await beforeRange?.(session);
      this.assertLoading(request.sessionId);
      await this.levelMarksService.load(copyFootprintParams(params), { skipServer: request.options.minimode });
      this.assertLoading(request.sessionId);
      const data = await this.requestRange(request.sessionId, params);
      this.assertLoading(request.sessionId);
      return Object.freeze({ ...session, data });
    } catch (error) {
      // Cancellation, late errors and destruction never replace the newer state.
      if (this.isCurrentSession(request.sessionId) && this.state.status === 'loading') {
        this.failSession(request.sessionId, error);
      }
      return null;
    }
  }

  commitSnapshot(snapshot: FootprintSnapshot, pending: FootprintPendingUpdate[] = []): boolean {
    if (!this.isCurrentSession(snapshot.sessionId) || this.state.status !== 'loading') return false;
    try {
      for (const update of pending) {
        if (update.type === 'cluster') {
          // HTTP can already contain these buffered trades. Never regress its
          // candle quantities or truncate a newer snapshot tail during replay.
          const payload = update.payload.filter((bar: any) => {
            const time = new Date(bar.x).getTime();
            const index = snapshot.data.ColumnNumberByDate[new Date(time).toISOString()];
            const existing = index === undefined ? undefined : snapshot.data.clusterData[index];
            return !existing || Number(bar.q) > existing.q;
          });
          if (!snapshot.data.handleCluster(payload, true)) throw new Error('Не удалось применить обновления графика.');
        } else if (update.type === 'ticks') {
          if (snapshot.params.period === 0 && !snapshot.data.handleTicks(update.payload)) {
            throw new Error('Не удалось применить обновления сделок.');
          }
        } else {
          snapshot.data.handleLadder(update.payload);
        }
      }
    } catch (error) {
      this.failSession(snapshot.sessionId, error);
      return false;
    }
    this.currentSnapshot = snapshot;
    this.presetIndex = snapshot.presetIndex;
    this.options = { ...snapshot.options };
    this.presetsSubject.next(snapshot.presets);
    if (!this.isCurrentSession(snapshot.sessionId)) return false;
    this.stateSubject.next({
      status: snapshot.data.clusterLength() ? 'ready' : 'empty', sessionId: snapshot.sessionId, snapshot,
    });
    return this.isCurrentSession(snapshot.sessionId);
  }

  failSession(sessionId: number, error: unknown): void {
    if (!this.isCurrentSession(sessionId)) return;
    this.cancelPending();
    this.levelMarksService.invalidateLoad();
    this.currentSnapshot = null;
    const paymentRequired = error instanceof HttpErrorResponse && error.status === 403 &&
      typeof error.error === 'string' && /<a\b[^>]*href=["']\/Payment["'][^>]*>/i.test(error.error);
    this.stateSubject.next({ status: 'error', sessionId,
      params: this.activeRequest!.params, message: this.errorMessage(error), paymentRequired });
  }

  updateSettings(settings: ChartSettings, presetIndex?: number): void {
    const snapshot = this.currentSnapshot;
    if (!snapshot || !this.isCurrentSession(snapshot.sessionId)) return;
    const next = Object.freeze({ ...snapshot, presetIndex: presetIndex ?? snapshot.presetIndex,
      settings: structuredClone(settings) });
    this.presetIndex = next.presetIndex;
    this.currentSnapshot = next;
    this.stateSubject.next({ status: next.data.clusterLength() ? 'ready' : 'empty', sessionId: next.sessionId, snapshot: next });
  }

  captureSettings(settings: ChartSettings): void {
    const snapshot = this.currentSnapshot;
    if (!snapshot || !this.isCurrentSession(snapshot.sessionId)) return;
    const copy = structuredClone(settings);
    // Renderer edits already draw locally. Keep the session settings current
    // without applying the whole snapshot again and resetting its viewport.
    for (const key of Object.keys(snapshot.settings)) delete (snapshot.settings as any)[key];
    Object.assign(snapshot.settings, copy);
    this.settingsChanges.next({ sessionId: snapshot.sessionId, settings: structuredClone(copy) });
  }

  updatePresets(presets: SelectListItemNumber[], presetIndex?: number): void {
    if (this.destroyed) return;
    const items = presets.map(item => ({ ...item }));
    this.presetsSubject.next(items);
    const snapshot = this.currentSnapshot;
    if (!snapshot || !this.isCurrentSession(snapshot.sessionId)) return;
    const next = Object.freeze({ ...snapshot, presets: items, presetIndex });
    this.presetIndex = presetIndex;
    this.currentSnapshot = next;
    this.stateSubject.next({ status: next.data.clusterLength() ? 'ready' : 'empty', sessionId: next.sessionId, snapshot: next });
  }

  clear(): void {
    if (this.destroyed) return;
    this.cancelPending();
    this.levelMarksService.invalidateLoad();
    this.activeRequest = null;
    this.currentSnapshot = null;
    this.stateSubject.next({ status: 'idle', sessionId: ++this.sequence });
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.cancelPending();
    this.levelMarksService.invalidateLoad();
    this.activeRequest = null;
    this.currentSnapshot = null;
    this.stateSubject.next({ status: 'idle', sessionId: ++this.sequence });
    this.stateSubject.complete();
    this.presetsSubject.complete();
    this.settingsChanges.complete();
  }

  applyRealtimeUpdate(sessionId: number, type: FootprintUpdateType, payload: any): FootprintUpdateEvent | null {
    const snapshot = this.currentSnapshot;
    if (!snapshot || !this.isCurrentSession(sessionId) || snapshot.sessionId !== sessionId) return null;
    let merged: boolean | undefined;
    try {
      if (type === 'cluster') merged = snapshot.data.handleCluster(payload);
      else if (type === 'ticks') merged = snapshot.params.period === 0 ? snapshot.data.handleTicks(payload) : true;
      else snapshot.data.handleLadder(payload);
    } catch {
      merged = false;
    }
    if (this.state.status === 'empty' && snapshot.data.clusterLength()) {
      this.stateSubject.next({ status: 'ready', sessionId, snapshot });
    }
    return { sessionId, type, merged };
  }

  private cancelPending(): void {
    this.cancellation.next();
    this.cancellation.complete();
    this.cancellation = new Subject<void>();
  }

  private assertLoading(sessionId: number): void {
    if (!this.isCurrentSession(sessionId) || this.state.status !== 'loading') throw new Error('Session superseded');
  }

  private read<T>(sessionId: number, source: Observable<T>): Promise<T> {
    this.assertLoading(sessionId);
    return firstValueFrom(source.pipe(takeUntil(this.cancellation)));
  }

  private async resolveSettings(request: FootprintLoadRequest, presetIndex?: number): Promise<ChartSettings> {
    if (!request.options.minimode && presetIndex !== undefined) {
      return this.read(request.sessionId, this.settingsService.getChartSettings(presetIndex));
    }
    const settings = ChartSettingsService.miniSettings();
    if (request.options.minimode) settings.DeltaGraph = request.options.deltamode;
    return settings;
  }

  private normalizeParams(input: Readonly<FootPrintParameters>, settings: ChartSettings): FootPrintParameters {
    const params = { ...copyFootprintParams(input), candlesOnly: input.candlesOnly ?? settings.CandlesOnly ?? false };
    const mode = resolveFootprintMode(params);
    const normalized = applyFootprintModeToParams(params, mode, {
      defaultPeriod: Number.isFinite(params.period) && params.period > 0 ? params.period : 1,
      keepArbitrageTickers: mode === 'arbitrage',
      arbitrageDefaults: { ticker1: DEFAULT_ARBITRAGE_PORTFOLIO_1, ticker2: DEFAULT_ARBITRAGE_PORTFOLIO_2 },
    });
    if (!Number.isFinite(normalized.priceStep) || normalized.priceStep <= 0) normalized.priceStep = 1;
    return normalized;
  }

  private async requestRange(sessionId: number, params: Readonly<FootPrintParameters>): Promise<ClusterData> {
    if (resolveFootprintMode(params) === 'arbitrage' && params.ticker1 && params.ticker2) {
      const rangeSet = await this.read(sessionId, this.clusterStreamService.getRangeSetArray({
        ticker: params.ticker, ticker1: params.ticker1, ticker2: params.ticker2, rperiod: params.rperiod,
        startDate: params.startDate, endDate: params.endDate, period: params.period, timeEnable: params.postmarket ?? false,
      }));
      const data = this.buildClusterDataFromRangeSet(rangeSet, params.priceStep);
      data.rangeSetLines = rangeSet;
      return data;
    }
    return this.read(sessionId, this.clusterStreamService.GetRange(copyFootprintParams(params)));
  }

  private errorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (typeof error.error === 'string' && error.error.trim()) return error.error;
      return error.error?.title || error.error?.message || 'Не удалось загрузить график. Повторите попытку.';
    }
    return error instanceof Error && error.message ? error.message : 'Не удалось загрузить график. Повторите попытку.';
  }

  private buildClusterDataFromRangeSet(rangeSet: CandlesRangeSetValue[], priceScale: number): ClusterData {
    const prepared = rangeSet.filter(value => value.Date !== undefined).map(value => {
      const date = new Date(value.Date);
      const price1 = Number(value.Price1normalized);
      const price2 = Number(value.Price2normalized);
      if (!Number.isFinite(date.getTime()) || !Number.isFinite(price1) || !Number.isFinite(price2)) return null;
      let high = Math.max(price1, price2);
      let low = Math.min(price1, price2);
      if (high === low) {
        const pad = Math.max(Math.max(Math.abs(price1), Math.abs(price2)) * 0.001, 1e-6);
        high += pad;
        low -= pad;
      }
      return { Number: 0, x: date, o: price1, c: price2, l: low, h: high, q: 0, bq: 0, v: 0, bv: 0, oi: 0, cl: [] };
    }).filter((value): value is NonNullable<typeof value> => value !== null)
      .sort((a, b) => a.x.getTime() - b.x.getTime()).map((value, index) => ({ ...value, Number: index + 1 }));
    return new ClusterData({ priceScale: priceScale || 1, clusterData: prepared });
  }
}
