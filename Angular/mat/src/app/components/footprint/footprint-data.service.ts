import { ElementRef, Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject, Subscription, firstValueFrom } from 'rxjs';
import { FootPrintComponent } from './footprint.component';
import { FootPrintParameters } from 'src/app/models/Params';
import { ChartSettings } from 'src/app/models/ChartSettings';
import { SelectListItemNumber } from 'src/app/models/preserts';
import { ChartSettingsService } from 'src/app/service/chart-settings.service';
import { LevelMarksService } from 'src/app/service/FootPrint/LevelMarks/level-marks.service';
import { ClusterStreamService } from 'src/app/service/FootPrint/ClusterStream/cluster-stream.service';
import { SignalRService } from 'src/app/service/FootPrint/signalr.service';
import { DialogService } from 'src/app/service/DialogService.service';
import { FootprintUtilitiesService } from './footprint-utilities.service';
import { ClusterData } from './clusterData';
import { HttpErrorResponse } from '@angular/common/http';

interface FootprintInitOptions {
  minimode: boolean;
  deltamode: boolean;
}

@Injectable({ providedIn: 'root' })
export class FootprintDataService implements OnDestroy {
  private visibilityObserver?: IntersectionObserver;
  private isVisible = false;
  private component?: FootPrintComponent;
  private canvasElement?: ElementRef;
  private presetIndex?: number;
  private options: FootprintInitOptions = { minimode: false, deltamode: false };

  private dataSubject = new Subject<ClusterData>();
  data$ = this.dataSubject.asObservable();

  private settingsSubject = new BehaviorSubject<ChartSettings | null>(null);
  settings$ = this.settingsSubject.asObservable();

  private paramsSubject = new BehaviorSubject<FootPrintParameters | null>(null);
  params$ = this.paramsSubject.asObservable();

  private presetsSubject = new BehaviorSubject<SelectListItemNumber[]>([]);
  presets$ = this.presetsSubject.asObservable();

  private realtimeSubscriptions = new Subscription();
  private activeSubscriptionKey: string | null = null;
  private activeSubscriptionParams: FootPrintParameters | null = null;

  constructor(
    private settingsService: ChartSettingsService,
    private levelMarksService: LevelMarksService,
    private clusterStreamService: ClusterStreamService,
    private signalRService: SignalRService,
    private dialogService: DialogService,
    private utilities: FootprintUtilitiesService
  ) {}

  bindComponent(component: FootPrintComponent, canvasRef: ElementRef | null) {
    this.teardownVisibility();
    this.component = component;
    if (canvasRef) {
      this.canvasElement = canvasRef;
      this.initVisibilityObserver();
    }
  }

  async initialize(
    params: FootPrintParameters,
    presetIndex: number,
    options: FootprintInitOptions
  ): Promise<void> {
    this.options = options;
    this.presetIndex = presetIndex;
    this.paramsSubject.next(params);

    await this.teardownRealtime();
    await this.loadPresets();
    await this.applySettingsAndLoadData(params);

    if (this.isVisible) {
      await this.subscribeToRealtime(params);
    }
  }

  async reload(params: FootPrintParameters): Promise<void> {
    await this.teardownRealtime();
    await this.applySettingsAndLoadData(params);
    if (this.isVisible) {
      await this.subscribeToRealtime(params);
    }
  }

  ngOnDestroy(): void {
    this.destroy();
  }

  destroy() {
    this.teardownVisibility();
    void this.teardownRealtime();
    this.component = undefined;
    this.paramsSubject.next(null);
    this.settingsSubject.next(null);
    this.presetsSubject.next([]);
    this.options = { minimode: false, deltamode: false };
    this.presetIndex = undefined;
  }

  private async applySettingsAndLoadData(params: FootPrintParameters) {
    const settings = await this.resolveSettings();
    params.candlesOnly = settings.CandlesOnly;
    this.paramsSubject.next(params);
    this.settingsSubject.next(settings);
    this.levelMarksService.load(params);
    await this.requestRange(params);
  }

  private async resolveSettings(): Promise<ChartSettings> {
    let settings = ChartSettingsService.miniSettings();
    if (!this.options.minimode && this.presetIndex !== undefined) {
      settings = await firstValueFrom(
        this.settingsService.getChartSettings(this.presetIndex)
      );
    } else if (this.options.minimode) {
      settings.DeltaGraph = this.options.deltamode;
    }
    return settings;
  }

  private async loadPresets() {
    const presets = await this.utilities.loadPresets();
    this.presetsSubject.next(presets);
    if ((this.presetIndex === undefined || this.presetIndex === null) && presets.length) {
      this.presetIndex = presets[0].Value;
    }
  }

  private async requestRange(params: FootPrintParameters) {
    try {
      const rangeData = await firstValueFrom(
        this.clusterStreamService.GetRange(params)
      );
      this.dataSubject.next(new ClusterData(rangeData));
    } catch (err) {
      console.error('Ошибка при выполнении запроса к серверу', err);
      if (err instanceof HttpErrorResponse) {
        await this.dialogService.info_async(err.error);
      } else {
        await this.dialogService.info_async(err);
      }
    }
  }

  private initVisibilityObserver() {
    this.visibilityObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (!this.isVisible) {
              this.isVisible = true;
              this.handleComponentVisible();
            }
          } else {
            if (this.isVisible) {
              this.isVisible = false;
              this.handleComponentHidden();
            }
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
    if (this.paramsSubject.value) {
      await this.subscribeToRealtime(this.paramsSubject.value);
    }
  }

  private async handleComponentHidden() {
    await this.teardownRealtime();
  }

  private shouldSubscribe(params: FootPrintParameters): boolean {
    const compareDatesIgnoringTime = (date1: Date, date2: Date): boolean => {
      const d1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
      const d2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
      return d1 < d2;
    };

    const now = new Date();
    const isEndDateInPast =
      !!params.endDate && compareDatesIgnoringTime(new Date(params.endDate), now);
    const isInvalidTime = (date: any) =>
      date && (new Date(date).getHours() !== 0 || new Date(date).getMinutes() !== 0);

    return !isEndDateInPast && !isInvalidTime(params.startDate) && !isInvalidTime(params.endDate);
  }

  private async subscribeToRealtime(params: FootPrintParameters) {
    const canSubscribe = this.shouldSubscribe(params);
    if (!this.component || !canSubscribe) {
      if (!canSubscribe) {
        console.log('Подписка пропущена: условия не выполнены.');
      }
      return;
    }

    if (this.activeSubscriptionParams && this.isSameSubscription(params, this.activeSubscriptionParams)) {
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
        this.component?.handleCluster(answ);
      })
    );

    this.realtimeSubscriptions.add(
      this.signalRService.receiveTicks$.subscribe((answ) => {
        this.component?.handleTicks(answ);
      })
    );

    this.realtimeSubscriptions.add(
      this.signalRService.receiveLadder$.subscribe((ladder) => {
        this.component?.handleLadder(ladder);
      })
    );
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
