import { ElementRef, Injectable, OnDestroy } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { FootPrintParameters } from 'src/app/models/Params';
import { SignalRService } from 'src/app/service/FootPrint/signalr.service';
import { FootprintDataLoaderService } from './footprint-data-loader.service';
import {
  FootprintInitOptions,
  FootprintUpdateEvent,
  FootprintUpdateType,
} from './footprint-data.types';

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
    if (this.isVisible) {
      await this.subscribeToRealtime(params);
    }
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
    const normalize = (date: Date) => {
      const copy = new Date(date);
      copy.setHours(0, 0, 0, 0);
      return copy.getTime();
    };

    const now = new Date();
    const endDate = params.endDate ? new Date(params.endDate) : null;
    const isEndDateInPast = !!endDate && normalize(endDate) < normalize(now);
    return !isEndDateInPast;
  }

  private async subscribeToRealtime(params: FootPrintParameters) {
    const canSubscribe = this.shouldSubscribe(params);
    if (!canSubscribe) {
      console.log('Подписка пропущена: условия не выполнены.');
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
        this.registerRealtimeHandlers();
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

  private registerRealtimeHandlers() {
    this.realtimeSubscriptions.add(
      this.signalRService.receiveCluster$.subscribe((answ) => {
        this.emitUpdate('cluster', answ);
      })
    );

    this.realtimeSubscriptions.add(
      this.signalRService.receiveTicks$.subscribe((answ) => {
        this.emitUpdate('ticks', answ);
      })
    );

    this.realtimeSubscriptions.add(
      this.signalRService.receiveLadder$.subscribe((ladder) => {
        this.emitUpdate('ladder', ladder);
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
