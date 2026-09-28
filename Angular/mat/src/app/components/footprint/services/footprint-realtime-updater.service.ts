import { FootprintClock, systemFootprintClock, shouldSubscribeRealtime, nextRealtimeCheckDelay } from './footprint-realtime-policy';
import { ElementRef, Injectable, OnDestroy } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { FootPrintParameters } from 'src/app/models/Params';
import { SignalRService } from 'src/app/service/FootPrint/signalr.service';
import { FootprintDataLoaderService } from './footprint-data-loader.service';
import {
  copyFootprintParams,
  FootprintPendingUpdate,
  FootprintPreparedSession,
  FootprintSnapshot,
  FootprintUpdateEvent,
  FootprintUpdateType,
} from '../models/footprint-data.types';

@Injectable()
export class FootprintRealtimeUpdaterService implements OnDestroy {
  private visibilityObserver?: IntersectionObserver;
  private isVisible = false;
  private canvasElement?: ElementRef;
  private params?: FootPrintParameters;
  private sessionId: number | null = null;
  private subscriptionEpoch = 0;
  private buffering = true;
  private pendingUpdates: FootprintPendingUpdate[] = [];
  private bufferOverflow = false;
  private recoveryRequired = false;
  private readonly maxBufferedUpdates = 2000;
  private reconnectSubscription: Subscription;
  private isDestroyed = false;
  private operationQueue: Promise<void> = Promise.resolve();
  private hiddenTeardownTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly hiddenTeardownDelayMs = 10000;
  private consecutiveMergeFailures = 0;
  private lastRecoveryReloadAt = 0;
  private readonly mergeFailureThreshold = 3;
  private readonly recoveryReloadMinIntervalMs = 30000;
  private clock: FootprintClock = systemFootprintClock;
  private eligibilityTimer: ReturnType<typeof setTimeout> | null = null;

  private realtimeSubscriptions = new Subscription();
  private activeSubscriptionKey: string | null = null;
  private activeSubscriptionParams: FootPrintParameters | null = null;

  private updatesSubject = new Subject<FootprintUpdateEvent>();
  readonly updates$ = this.updatesSubject.asObservable();
  private recoverySubject = new Subject<{ sessionId: number; reason: string }>();
  readonly recovery$ = this.recoverySubject.asObservable();

  constructor(
    private signalRService: SignalRService,
    private dataLoader: FootprintDataLoaderService
  ) {
    this.reconnectSubscription = this.signalRService.connectionRestored$.subscribe(() => {
      if (this.buffering && this.params) this.recoveryRequired = true;
      else this.scheduleRecoveryReload('reconnected', true);
    });
  }

  ngOnDestroy(): void {
    this.destroy();
  }

  bindCanvas(canvasRef: ElementRef | null) {
    if (this.isDestroyed) return;
    this.teardownVisibility();
    if (canvasRef) {
      this.canvasElement = canvasRef;
      this.initVisibilityObserver();
    }
  }

  beginSession(sessionId: number): void {
    if (this.isDestroyed || !this.dataLoader.isCurrentSession(sessionId)) return;
    this.sessionId = sessionId;
    this.params = undefined;
    this.buffering = true;
    this.pendingUpdates = [];
    this.bufferOverflow = false;
    this.recoveryRequired = false;
    this.consecutiveMergeFailures = 0;
    this.clearEligibilityTimer();
    this.clearHiddenTeardownTimer();
    const key = this.detachRealtime();
    void this.runSerialized(() => this.releaseSubscription(key));
  }

  async configure(session: FootprintPreparedSession): Promise<void> {
    if (!this.isCurrentSession(session.sessionId)) return;
    const params = copyFootprintParams(session.params);
    this.params = params;
    await this.runSerialized(async () => {
      if (!this.isCurrentSession(session.sessionId)) return;
      this.clearHiddenTeardownTimer();
      await this.subscribeToRealtime(params, session.sessionId);
    });
  }

  commitSession(snapshot: FootprintSnapshot): boolean {
    if (!this.isCurrentSession(snapshot.sessionId)) return false;
    if (this.bufferOverflow) {
      this.dataLoader.failSession(snapshot.sessionId, new Error('Загрузка графика заняла слишком много времени. Повторите попытку.'));
      return false;
    }
    const pending = this.pendingUpdates;
    this.pendingUpdates = [];
    if (!this.dataLoader.commitSnapshot(snapshot, pending) || !this.isCurrentSession(snapshot.sessionId)) return false;
    this.buffering = false;
    this.scheduleEligibilityCheck();
    const duringCommit = this.pendingUpdates;
    this.pendingUpdates = [];
    for (const update of duringCommit) this.emitUpdate(snapshot.sessionId, update.type, update.payload);
    if (this.recoveryRequired) {
      this.recoveryRequired = false;
      void Promise.resolve().then(() => {
        if (this.isCurrentSession(snapshot.sessionId)) this.scheduleRecoveryReload('loading_gap', true);
      });
    }
    return true;
  }

  stopSession(sessionId: number): Promise<void> {
    if (this.sessionId !== sessionId) return Promise.resolve();
    this.clearEligibilityTimer();
    this.params = undefined;
    this.pendingUpdates = [];
    this.buffering = true;
    const key = this.detachRealtime();
    return this.runSerialized(() => this.releaseSubscription(key));
  }

  destroy() {
    if (this.isDestroyed) return;
    this.teardownVisibility();
    this.isDestroyed = true;
    this.clearEligibilityTimer();
    this.sessionId = null;
    this.pendingUpdates = [];
    this.reconnectSubscription.unsubscribe();
    this.clearHiddenTeardownTimer();
    const key = this.detachRealtime();
    void this.runSerialized(() => this.releaseSubscription(key));
    this.params = undefined;
    this.updatesSubject.complete();
    this.recoverySubject.complete();
  }

  private initVisibilityObserver() {
    this.visibilityObserver = new IntersectionObserver(
      (entries) => {
        if (this.isDestroyed) return;
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (!this.isVisible) {
              this.isVisible = true;
              void this.runSerialized(async () => {
                await this.handleComponentVisible();
              });
            }
          } else if (this.isVisible) {
            this.isVisible = false;
            void this.runSerialized(async () => {
              await this.handleComponentHidden();
            });
          }
        });
      },
      {
        root: null,
        threshold: 0,
      }
    );

    if (this.canvasElement?.nativeElement) {
      this.visibilityObserver.observe(this.canvasElement.nativeElement);
    }
  }

  private async handleComponentVisible() {
    if (this.isDestroyed) return;
    this.clearHiddenTeardownTimer();
    if (this.params && !this.activeSubscriptionKey) {
      if (this.buffering) this.recoveryRequired = true;
      else if (this.shouldSubscribe(this.params)) this.scheduleRecoveryReload('visible', true);
      else this.scheduleEligibilityCheck();
    }
  }

  private async handleComponentHidden() {
    if (this.isDestroyed) return;
    this.clearEligibilityTimer();
    this.scheduleHiddenTeardown();
  }

  private shouldSubscribe(params: FootPrintParameters): boolean {
    return shouldSubscribeRealtime(params, this.clock.now());
  }

  private clearEligibilityTimer(): void {
    if (this.eligibilityTimer !== null) this.clock.cancel(this.eligibilityTimer);
    this.eligibilityTimer = null;
  }

  private scheduleEligibilityCheck(): void {
    this.clearEligibilityTimer();
    const id = this.sessionId;
    if (id === null || !this.isCurrentSession(id) || !this.params || !this.isVisible || this.buffering || this.activeSubscriptionKey) return;
    const delay = nextRealtimeCheckDelay(this.params, this.clock.now());
    if (delay === null) return;
    this.eligibilityTimer = this.clock.schedule(() => {
      this.eligibilityTimer = null;
      if (!this.isCurrentSession(id) || !this.params || !this.isVisible || this.activeSubscriptionKey) return;
      if (this.shouldSubscribe(this.params)) this.scheduleRecoveryReload('window_opened', true);
      else this.scheduleEligibilityCheck();
    }, delay);
  }

  private async subscribeToRealtime(params: FootPrintParameters, sessionId: number) {
    if (!this.isCurrentSession(sessionId)) return;
    if (!params.ticker) {
      console.warn('Подписка пропущена: ticker не задан.');
      return;
    }

    const canSubscribe = this.shouldSubscribe(params);
    if (!canSubscribe) {
      console.debug('Подписка пропущена: условия не выполнены.');
      return;
    }

    if (
      this.activeSubscriptionParams &&
      this.activeSubscriptionKey &&
      this.isSameSubscription(params, this.activeSubscriptionParams)
    ) {
      return;
    }

    const epoch = ++this.subscriptionEpoch;
    // Listen before Subscribe resolves: the hub may send data before its ACK.
    this.registerRealtimeHandlers(params, sessionId, epoch);
    try {
      const subscriptionKey = await this.signalRService.Subscribe({
        ticker: params.ticker,
        period: params.period,
        step: params.priceStep,
      });
      if (!this.isCurrentSession(sessionId) || epoch !== this.subscriptionEpoch) {
        await this.releaseSubscription(subscriptionKey);
        return;
      }
      if (subscriptionKey) {
        this.activeSubscriptionKey = subscriptionKey;
        this.activeSubscriptionParams = { ...params };
      } else {
        this.detachRealtime();
        throw new Error('Не удалось подключить обновления графика. Повторите попытку.');
      }
    } catch (err) {
      if (this.isCurrentSession(sessionId) && epoch === this.subscriptionEpoch) this.detachRealtime();
      console.error('Ошибка при подписке к SignalRService', err);
      throw err;
    }
  }

  private teardownVisibility() {
    this.clearHiddenTeardownTimer();
    if (this.visibilityObserver && this.canvasElement?.nativeElement) {
      this.visibilityObserver.unobserve(this.canvasElement.nativeElement);
      this.visibilityObserver.disconnect();
    }
    this.visibilityObserver = undefined;
    this.canvasElement = undefined;
    this.isVisible = false;
  }

  private detachRealtime(): string | null {
    this.subscriptionEpoch += 1;
    this.realtimeSubscriptions.unsubscribe();
    this.realtimeSubscriptions = new Subscription();
    const subscriptionKey = this.activeSubscriptionKey;
    this.activeSubscriptionKey = null;
    this.activeSubscriptionParams = null;
    return subscriptionKey;
  }

  private async releaseSubscription(subscriptionKey: string | null): Promise<void> {
    try {
      if (subscriptionKey) {
        await this.signalRService.unsubscr(subscriptionKey);
      }
    } catch (err) {
      console.error('Ошибка при отписке или остановке SignalRService', err);
    }
  }

  private registerRealtimeHandlers(params: FootPrintParameters, sessionId: number, epoch: number) {
    const scopedParams = {
      ticker: params.ticker,
      period: params.period,
      step: params.priceStep,
    };

    this.realtimeSubscriptions.add(
      this.signalRService.receiveClusterFor(scopedParams).subscribe({
        next: (answ) => this.receiveUpdate(sessionId, epoch, 'cluster', answ),
        error: (err) => console.error('SignalR cluster stream error', err),
      })
    );

    this.realtimeSubscriptions.add(
      this.signalRService.receiveTicksFor(scopedParams).subscribe({
        next: (answ) => this.receiveUpdate(sessionId, epoch, 'ticks', answ),
        error: (err) => console.error('SignalR ticks stream error', err),
      })
    );

    this.realtimeSubscriptions.add(
      this.signalRService.receiveLadderFor(params.ticker).subscribe({
        next: (ladder) => this.receiveUpdate(sessionId, epoch, 'ladder', ladder),
        error: (err) => console.error('SignalR ladder stream error', err),
      })
    );
  }

  private isCurrentSession(sessionId: number): boolean {
    return !this.isDestroyed && this.sessionId === sessionId && this.dataLoader.isCurrentSession(sessionId);
  }

  private receiveUpdate(sessionId: number, epoch: number, type: FootprintUpdateType, payload: any): void {
    if (!this.isCurrentSession(sessionId) || epoch !== this.subscriptionEpoch) return;
    if (this.buffering) {
      if (this.bufferOverflow) return;
      if (this.pendingUpdates.length >= this.maxBufferedUpdates) {
        this.pendingUpdates = [];
        this.bufferOverflow = true;
        return;
      }
      this.pendingUpdates.push({ type, payload: structuredClone(payload) });
      return;
    }
    this.emitUpdate(sessionId, type, payload);
  }

  private emitUpdate(sessionId: number, type: FootprintUpdateType, payload: any) {
    if (!this.isCurrentSession(sessionId)) return;
    const update = this.dataLoader.applyRealtimeUpdate(sessionId, type, payload);
    if (update) {
      this.updatesSubject.next(update);
    }

    if (type === 'ladder') {
      return;
    }

    if (update?.merged === true) {
      this.consecutiveMergeFailures = 0;
      return;
    }

    if (update?.merged === false) {
      this.consecutiveMergeFailures += 1;
      if (this.consecutiveMergeFailures >= this.mergeFailureThreshold) {
        this.consecutiveMergeFailures = 0;
        this.scheduleRecoveryReload(`${type}_merge_failed`);
      }
    }
  }

  private isSameSubscription(
    current: FootPrintParameters,
    previous: FootPrintParameters
  ): boolean {
    return (
      current.ticker === previous.ticker &&
      current.period === previous.period &&
      current.priceStep === previous.priceStep
    );
  }

  private scheduleHiddenTeardown(): void {
    if (this.isDestroyed) return;
    this.clearHiddenTeardownTimer();
    const sessionId = this.sessionId;
    this.hiddenTeardownTimer = setTimeout(() => {
      this.hiddenTeardownTimer = null;
      void this.runSerialized(async () => {
        if (sessionId === null || !this.isCurrentSession(sessionId) || this.isVisible) {
          return;
        }

        const key = this.detachRealtime();
        await this.releaseSubscription(key);
      });
    }, this.hiddenTeardownDelayMs);
  }

  private clearHiddenTeardownTimer(): void {
    if (this.hiddenTeardownTimer !== null) {
      clearTimeout(this.hiddenTeardownTimer);
      this.hiddenTeardownTimer = null;
    }
  }

  private runSerialized(task: () => Promise<void>): Promise<void> {
    const nextTask = this.operationQueue.then(task, task);
    this.operationQueue = nextTask.catch((err) => {
      console.error('Footprint realtime operation failed', err);
    });
    return nextTask;
  }

  private scheduleRecoveryReload(reason: string, force = false): void {
    const sessionId = this.sessionId;
    if (sessionId === null || !this.isCurrentSession(sessionId) || !this.params ||
        this.buffering || this.dataLoader.snapshot?.sessionId !== sessionId) {
      return;
    }

    const now = Date.now();
    if (!force && now - this.lastRecoveryReloadAt < this.recoveryReloadMinIntervalMs) {
      return;
    }

    this.lastRecoveryReloadAt = now;
    this.recoverySubject.next({ sessionId, reason });
  }
}

