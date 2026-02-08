import { ElementRef, Injectable, OnDestroy } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { FootPrintParameters } from 'src/app/models/Params';
import { SignalRService } from 'src/app/service/FootPrint/signalr.service';
import { FootprintDataLoaderService } from './footprint-data-loader.service';
import {
  FootprintInitOptions,
  FootprintUpdateEvent,
  FootprintUpdateType,
} from '../models/footprint-data.types';

@Injectable()
export class FootprintRealtimeUpdaterService implements OnDestroy {
  private visibilityObserver?: IntersectionObserver;
  private isVisible = false;
  private canvasElement?: ElementRef;
  private params?: FootPrintParameters;
  private options: FootprintInitOptions = { minimode: false, deltamode: false };

  private realtimeSubscriptions = new Subscription();
  private activeSubscriptionKey: string | null = null;
  private activeSubscriptionParams: FootPrintParameters | null = null;

  private updatesSubject = new Subject<FootprintUpdateEvent>();
  readonly updates$ = this.updatesSubject.asObservable();

  constructor(
    private signalRService: SignalRService,
    private dataLoader: FootprintDataLoaderService
  ) {}

  ngOnDestroy(): void {
    this.destroy();
  }

  bindCanvas(canvasRef: ElementRef | null) {
    this.teardownVisibility();
    if (canvasRef) {
      this.canvasElement = canvasRef;
      this.initVisibilityObserver();
    }
  }

  async configure(
    params: FootPrintParameters,
    options: FootprintInitOptions
  ): Promise<void> {
    this.params = params;
    this.options = options;
    await this.teardownRealtime();
    await this.subscribeToRealtime(params);
  }

  destroy() {
    this.teardownVisibility();
    void this.teardownRealtime();
    this.params = undefined;
    this.options = { minimode: false, deltamode: false };
  }

  private initVisibilityObserver() {
    this.visibilityObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (!this.isVisible) {
              this.isVisible = true;
              void this.handleComponentVisible();
            }
          } else if (this.isVisible) {
            this.isVisible = false;
            void this.handleComponentHidden();
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
    if (this.params) {
      await this.subscribeToRealtime(this.params);
    }
  }

  private async handleComponentHidden() {
    await this.teardownRealtime();
  }

  private shouldSubscribe(params: FootPrintParameters): boolean {
    if (params.type === 'arbitrage') {
      return false;
    }

    const now = new Date();
    const startDate = this.parseLocalDate(params.startDate);
    const endDate = this.parseLocalDate(params.endDate);
    if (!endDate) {
      return true;
    }

    const hasExplicitTime = this.hasExplicitTime(startDate, endDate);
    if (hasExplicitTime) {
      // Date params in URL are often ISO-strings with seconds precision.
      // Allow a grace window to keep realtime enabled around "now".
      const periodMs = Math.max(1, Number(params.period || 1)) * 60_000;
      const graceMs = Math.max(5 * 60_000, periodMs);
      return endDate.getTime() + graceMs >= now.getTime();
    }

    return this.normalizeDay(endDate) >= this.normalizeDay(now);
  }

  private parseLocalDate(value: unknown): Date | null {
    if (!value) {
      return null;
    }
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value;
    }
    if (typeof value === 'string') {
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) {
        return null;
      }
      return parsed;
    }
    if (typeof value === 'number') {
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    return null;
  }

  private hasExplicitTime(...dates: Array<Date | null>): boolean {
    return dates.some((date) => {
      if (!date) {
        return false;
      }
      return (
        date.getHours() !== 0 ||
        date.getMinutes() !== 0 ||
        date.getSeconds() !== 0 ||
        date.getMilliseconds() !== 0
      );
    });
  }

  private normalizeDay(date: Date): number {
    const copy = new Date(date);
    copy.setHours(0, 0, 0, 0);
    return copy.getTime();
  }

  private async subscribeToRealtime(params: FootPrintParameters) {
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
      this.isSameSubscription(params, this.activeSubscriptionParams)
    ) {
      return;
    }

    try {
      const subscriptionKey = await this.signalRService.Subscribe({
        ticker: params.ticker,
        period: params.period,
        step: params.priceStep,
      });
      if (subscriptionKey) {
        this.activeSubscriptionKey = subscriptionKey;
        this.activeSubscriptionParams = { ...params };
        this.registerRealtimeHandlers(params);
      }
    } catch (err) {
      console.error('Ошибка при подписке к SignalRService', err);
    }
  }

  private teardownVisibility() {
    if (this.visibilityObserver && this.canvasElement?.nativeElement) {
      this.visibilityObserver.unobserve(this.canvasElement.nativeElement);
      this.visibilityObserver.disconnect();
    }
    this.visibilityObserver = undefined;
    this.canvasElement = undefined;
  }

  private async teardownRealtime() {
    this.realtimeSubscriptions.unsubscribe();
    this.realtimeSubscriptions = new Subscription();
    try {
      if (this.activeSubscriptionKey) {
        await this.signalRService.unsubscr(this.activeSubscriptionKey);
      }
    } catch (err) {
      console.error('Ошибка при отписке или остановке SignalRService', err);
    }
    this.activeSubscriptionKey = null;
    this.activeSubscriptionParams = null;
  }

  private registerRealtimeHandlers(params: FootPrintParameters) {
    const scopedParams = {
      ticker: params.ticker,
      period: params.period,
      step: params.priceStep,
    };

    this.realtimeSubscriptions.add(
      this.signalRService.receiveClusterFor(scopedParams).subscribe({
        next: (answ) => this.emitUpdate('cluster', answ),
        error: (err) => console.error('SignalR cluster stream error', err),
      })
    );

    this.realtimeSubscriptions.add(
      this.signalRService.receiveTicksFor(scopedParams).subscribe({
        next: (answ) => this.emitUpdate('ticks', answ),
        error: (err) => console.error('SignalR ticks stream error', err),
      })
    );

    this.realtimeSubscriptions.add(
      this.signalRService.receiveLadderFor(params.ticker).subscribe({
        next: (ladder) => this.emitUpdate('ladder', ladder),
        error: (err) => console.error('SignalR ladder stream error', err),
      })
    );
  }

  private emitUpdate(type: FootprintUpdateType, payload: any) {
    const update = this.dataLoader.applyRealtimeUpdate(type, payload);
    if (update) {
      this.updatesSubject.next(update);
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
}

