import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { FootPrintParameters } from 'src/app/models/Params';
import { SelectListItemNumber } from 'src/app/models/preserts';
import { SignalRService } from 'src/app/service/FootPrint/signalr.service';
import { FootPrintComponent } from './footprint.component';
import { FootprintDataLoaderService } from './footprint-data-loader.service';
import { FootprintRealtimeUpdaterService } from './footprint-realtime-updater.service';
import { FootprintInitOptions } from './footprint-data.types';

@Component({
  standalone: false,
  selector: 'app-footprint-widget',
  templateUrl: './footprint-widget.component.html',
  styleUrls: ['./footprint-widget.component.css'],
  providers: [
    FootprintDataLoaderService,
    FootprintRealtimeUpdaterService,
    SignalRService,
  ],
})
export class FootprintWidgetComponent
  implements AfterViewInit, OnChanges, OnDestroy
{
  @ViewChild(FootPrintComponent)
  renderer?: FootPrintComponent;

  @Input() presetIndex: number;
  @Input() params: FootPrintParameters;
  @Input() minimode: boolean = false;
  @Input() deltamode: boolean = false;
  @Input() caption: string | null = null;
  @Input() postInit?: (component: FootPrintComponent) => void;

  presetItems: SelectListItemNumber[] = [];

  constructor(
    private footprintDataLoader: FootprintDataLoaderService,
    private footprintRealtimeUpdater: FootprintRealtimeUpdaterService,
    private destroyRef: DestroyRef,
    private host: ElementRef<HTMLElement>
  ) {}

  private viewInitialized = false;
  private resizeObserver?: ResizeObserver;

  get FPsettings() {
    return this.renderer?.FPsettings;
  }

  set FPsettings(value: any) {
    if (this.renderer) {
      this.renderer.FPsettings = value;
    }
  }

  get markupManager() {
    return this.renderer?.markupManager;
  }

  get levelMarksService() {
    return this.renderer?.levelMarksService;
  }

  get viewModel() {
    return this.renderer?.viewModel;
  }

  get canvas() {
    return this.renderer?.canvas;
  }

  async ngAfterViewInit() {
    if (!this.renderer) return;

    this.renderer.bindRealtime(this.footprintRealtimeUpdater);
    this.connectDataStreams();

    this.setupResizeObserver();

    this.viewInitialized = true;
    await this.initializeDataFlow();
    this.triggerResize();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.viewInitialized) {
      return;
    }

    if (changes['params'] || changes['presetIndex'] || changes['minimode'] || changes['deltamode']) {
      void this.initializeDataFlow();
    }
  }

  ngOnDestroy(): void {
    this.renderer?.hintService.destroy();
    this.footprintRealtimeUpdater.destroy();
    this.footprintDataLoader.destroy();
    this.resizeObserver?.disconnect();
  }

  async reload(params?: FootPrintParameters): Promise<void> {
    const nextParams = params ?? this.params;
    if (!nextParams) {
      return;
    }

    this.params = nextParams;
    const loaded = await this.footprintDataLoader.reload(nextParams);
    if (loaded) {
      await this.configureRealtime(nextParams, this.buildInitOptions());
    }
  }

  async configureRealtime(
    params: FootPrintParameters,
    options: FootprintInitOptions
  ): Promise<void> {
    await this.footprintRealtimeUpdater.configure(params, options);
  }

  async serverRequest(params: FootPrintParameters): Promise<void> {
    this.params = params;
    await this.reload(params);
  }

  resize() {
    this.renderer?.resize();
  }

  @HostListener('window:resize')
  onWindowResize() {
    this.triggerResize();
  }

  getCsv() {
    this.renderer?.getCsv();
  }

  reloadPresets() {
    return this.footprintDataLoader.initialize(
      this.params,
      this.presetIndex,
      this.buildInitOptions()
    );
  }

  private buildInitOptions(): FootprintInitOptions {
    return { minimode: this.minimode, deltamode: this.deltamode };
  }

  private connectDataStreams() {
    if (!this.renderer) return;

    this.footprintDataLoader.data$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        filter((clusterData): clusterData is any => clusterData !== null)
      )
      .subscribe((clusterData) => {
        this.renderer?.applyData(clusterData);
      });

    this.footprintRealtimeUpdater.updates$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((update) => this.renderer?.handleRealtimeUpdate(update));

    this.footprintDataLoader.settings$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((settings) => {
        if (settings) {
          this.renderer?.applySettings(settings);
        }
      });

    this.footprintDataLoader.params$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        if (params) {
          this.params = params;
          this.renderer?.applyParams(params);
        }
      });

    this.footprintDataLoader.presets$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((items: SelectListItemNumber[]) => {
        if (this.renderer) {
          this.renderer.presetItems = items;
        }
        this.presetItems = items;
      });
  }

  private async initializeDataFlow() {
    if (!this.params && this.presetIndex == null) {
      return;
    }

    if (!this.params) {
      return;
    }

    const options = this.buildInitOptions();

    const loaded = await this.footprintDataLoader.initialize(
      this.params,
      this.presetIndex,
      options
    );
    if (loaded) {
      await this.footprintRealtimeUpdater.configure(this.params, options);
    }
  }

  private setupResizeObserver() {
    if (this.resizeObserver) {
      return;
    }

    this.resizeObserver = new ResizeObserver(() => {
      this.triggerResize();
    });

    this.resizeObserver.observe(this.host.nativeElement);
  }

  private triggerResize() {
    if (!this.viewInitialized) {
      return;
    }

    this.renderer?.resize();
  }
}
