import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FootPrintParameters } from 'src/app/models/Params';
import { SelectListItemNumber } from 'src/app/models/preserts';
import { FootPrintComponent } from '../footprint/footprint.component';
import { FootprintDataLoaderService } from '../../services/footprint-data-loader.service';
import { FootprintRealtimeUpdaterService } from '../../services/footprint-realtime-updater.service';
import { copyFootprintParams, FootprintInitOptions, FootprintLoadState } from '../../models/footprint-data.types';
import { FootprintSessionService } from '../../services/footprint-session.service';
import { LevelMarksService } from 'src/app/service/FootPrint/LevelMarks/level-marks.service';
import { FootprintControllerService } from '../../services/footprint-controller.service';
import { FootprintController } from '../../models/footprint-controller';

@Component({
  standalone: true,
  selector: 'app-footprint-widget',
  imports: [FootPrintComponent],
  templateUrl: './footprint-widget.component.html',
  styleUrls: ['./footprint-widget.component.css'],
  providers: [
    FootprintDataLoaderService,
    FootprintRealtimeUpdaterService,
    FootprintSessionService,
    FootprintControllerService,
    LevelMarksService,
  ],
})
export class FootprintWidgetComponent
  implements AfterViewInit, OnChanges, OnDestroy, OnInit
{
  @ViewChild(FootPrintComponent)
  private renderer?: FootPrintComponent;

  @Input() presetIndex: number;
  @Input() params: FootPrintParameters;
  @Input() minimode: boolean = false;
  @Input() deltamode: boolean = false;
  @Input() caption: string | null = null;

  presetItems: SelectListItemNumber[] = [];
  loadState: FootprintLoadState = { status: 'idle', sessionId: 0 };
  readonly controller: FootprintController;

  constructor(
    private session: FootprintSessionService,
    private footprintRealtimeUpdater: FootprintRealtimeUpdaterService,
    private commands: FootprintControllerService,
    private destroyRef: DestroyRef,
    private host: ElementRef<HTMLElement>
  ) { this.controller = commands; }

  private viewInitialized = false;
  private resizeObserver?: ResizeObserver;

  ngOnInit(): void {
    this.connectDataStreams();
  }

  onRendererSettingsChanged(settings: any): void {
    this.session.captureSettings(settings);
  }

  onRendererSettingsSaveRequested(settings: any): void {
    void this.commands.saveSettings(settings);
  }

  async ngAfterViewInit() {
    if (!this.renderer) return;

    this.renderer.bindRealtime(this.footprintRealtimeUpdater);
    this.commands.bindRenderer(this.renderer);

    this.setupResizeObserver();

    this.viewInitialized = true;
    // Publish loading after the initial view check has completed.
    await Promise.resolve();
    if (!this.viewInitialized) return;
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
    this.viewInitialized = false;
    this.renderer?.dispose();
    this.commands.destroy();
    this.session.destroy();
    this.resizeObserver?.disconnect();
  }

  async reload(params?: FootPrintParameters): Promise<void> {
    const nextParams = params ?? this.params;
    if (!nextParams) {
      return;
    }

    this.params = nextParams;
    await this.commands.reload(nextParams, this.presetIndex, this.buildInitOptions());
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

  setPresetIndex(presetIndex: number) {
    this.presetIndex = presetIndex;
  }

  private buildInitOptions(): FootprintInitOptions {
    return { minimode: this.minimode, deltamode: this.deltamode };
  }

  private connectDataStreams() {
    this.session.state$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((state) => {
        this.loadState = state;
        if (state.status === 'ready' || state.status === 'empty') {
          this.params = copyFootprintParams(state.snapshot.params);
          this.presetIndex = state.snapshot.presetIndex;
          this.presetItems = state.snapshot.presets;
          if (this.renderer?.data === state.snapshot.data && this.renderer?.FPsettings === state.snapshot.settings) {
            this.renderer.presetIndex = state.snapshot.presetIndex;
            this.renderer.presetItems = state.snapshot.presets;
          } else this.renderer?.applySnapshot(state.snapshot);
        } else {
          this.renderer?.clearSession();
        }
      });

    this.session.updates$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((update) => this.renderer?.handleRealtimeUpdate(update));

  }

  private async initializeDataFlow() {
    if (!this.params) {
      this.session.clear();
      return;
    }

    const options = this.buildInitOptions();

    await this.commands.initialize(
      this.params,
      this.presetIndex,
      options
    );
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

