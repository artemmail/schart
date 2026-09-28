import { FootprintFrameRenderer } from '../../rendering/footprint-frame-renderer';
import { barRectangle, clusterRectangle, clusterFontSize } from '../../rendering/chart-geometry';
import { createChartViewContext, createViewsHostContext, createInputHostContext, createFrameContext } from './footprint-context.adapter';
import type { FootprintCanvasContext } from '../../rendering/footprint-canvas';
import { installFootprintCanvas } from '../../rendering/canvas-helpers';
import { getVisibleBars } from '../../rendering/visible-bars';
import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  HostListener,
  Input,
  OnDestroy,
  Output,
  EventEmitter,
} from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Matrix, Rectangle } from '../../models/matrix';
import { Subscription } from 'rxjs';
import { FootprintRenderFlags, FootprintRenderScheduler } from '../../services/footprint-render-scheduler';
import { createRenderContext, InteractionContext } from '../../models/footprint-context';

import { ChartSettings } from 'src/app/models/ChartSettings';
import { ColorsService } from 'src/app/service/FootPrint/Colors/color.service';
import { FormattingService } from 'src/app/service/FootPrint/Formatting/formatting.service';
import { ClusterData } from '../../models/cluster-data';
import { canvasPart } from '../../views/canvas-part';
import { FootPrintParameters } from 'src/app/models/Params';
import { ColumnEx } from 'src/app/models/Column';
import { MarkUpManager } from '../../markup/markup-manager';
import { MarkupRegistry } from '../../markup/markup-registry';
import { registerFootprintBuiltInMarkups } from '../../markup/builtins/register-builtins';
import { MouseAndTouchManager } from '../../managers/mouse-touch-manager';
import { ViewsManager } from '../../managers/views-manager';
import { SelectListItemNumber } from 'src/app/models/preserts';
import { FootprintUtilitiesService } from '../../services/footprint-utilities.service';
import { LevelMarksService } from 'src/app/service/FootPrint/LevelMarks/level-marks.service';
import { DialogService } from 'src/app/service/DialogService.service';
import { Router } from '@angular/router';
import { FootprintLayoutService } from '../../services/footprint-layout.service';
import { FootprintRealtimeUpdaterService } from '../../services/footprint-realtime-updater.service';
import { copyFootprintParams, FootprintLoadState, FootprintSnapshot, FootprintUpdateEvent } from '../../models/footprint-data.types';
import { FootprintStateService } from '../../services/footprint-state.service';
import { HintContainerService } from '../../services/hint-container.service';
import { FootprintIndicatorEngine } from '../../indicators/indicator-engine';
import { IndicatorRegistry } from '../../indicators/indicator-registry';
import { registerFootprintBuiltInIndicators } from '../../indicators/builtins/register-builtins';
import { ColorSchemeService } from 'src/app/services/theme/color-scheme.service';
import { MaterialThemeService } from 'src/app/services/theme/material-theme.service';
import {
  StockChartPalette,
  STOCK_CHART_DEFAULT_PALETTE,
  DEFAULT_THEME_PRESET,
  ThemePreset,
} from 'src/app/services/theme/theme.model';
import { OpenPositionsRepository } from '../../services/open-positions.repository';

const MIN_PANEL_HEIGHT = 20;

@Component({
  standalone: true,
  imports: [MatProgressSpinnerModule],
  selector: 'app-footprint',
  templateUrl: './footprint.component.html',
  styleUrls: ['./footprint.component.css'],
  providers: [FootprintStateService, HintContainerService, OpenPositionsRepository],
})
export class FootPrintComponent implements AfterViewInit, OnDestroy {
  @ViewChild('drawingCanvas', { static: false }) canvasRef?: ElementRef;
  @Input() presetIndex: number;
  @Input() set params(value: FootPrintParameters | null) {
    if (this.destroyed) return;
    this.state.setParams(value ?? null);
    this.initializeViewIfReady();
  }
  get params(): FootPrintParameters | null {
    return this.state.params;
  }
  @Input() minimode: boolean = false;
  @Input() deltamode: boolean = false;
  @Input() caption: string | null = null;
  @Input() loadState: FootprintLoadState = { status: 'idle', sessionId: 0 };
  @Output() settingsChanged = new EventEmitter<ChartSettings>();
  @Output() settingsSaveRequested = new EventEmitter<ChartSettings>();
  @Output() retryRequested = new EventEmitter<void>();
  private currentSessionId: number | null = null;
  private applyingSnapshot = false;

  private _canvas: HTMLCanvasElement | null = this.canvasRef?.nativeElement;
  private _ctx: FootprintCanvasContext | null = null;
  private themeSubscription?: Subscription;
  private resourcesSubscription?: Subscription;
  private themePreset: ThemePreset = DEFAULT_THEME_PRESET;
  private destroyed = false;
  private rendering = false;
  readonly renderScheduler = new FootprintRenderScheduler(flags => this.renderFrame(flags));
  private readonly frameRenderer = new FootprintFrameRenderer(createFrameContext(this));

  palette: StockChartPalette = { ...STOCK_CHART_DEFAULT_PALETTE };
  animButtonState = {
    hover: false,
    pressed: false,
    hoverT: 0,
    pressT: 0,
  };

  markupEnabled: boolean;
  markupManager: MarkUpManager;
  clusterWidthScale: number = 0.97;

  views: Array<canvasPart> = new Array();
  readonly renderContext = createRenderContext(this);
  readonly viewContext = createChartViewContext(this);

  get pointer() { return this.mouseAndTouchManager?.selectedPoint ?? null; }

  private createInteractionContext(): InteractionContext {
    const host = this;
    return {
      get data() { return host.data; }, get ctx() { return host.ctx; },
      get palette() { return host.palette; }, get colorsService() { return host.colorsService; },
      get viewport() {
        return host.viewsManager.viewMain ?? host.viewsManager.viewRangeSet ??
          { view: host.viewsManager.clusterView, mtx: host.viewsManager.mtxMain };
      },
      clusterRect2: (price, column, width, matrix) => host.clusterRect2(price, column, width, matrix),
      requestRender: () => host.drawClusterView(),
      setCursor: cursor => { if (!host.destroyed && host.canvas) host.canvas.style.cursor = cursor; },
    };
  }

  readonly indicatorRegistry = new IndicatorRegistry();
  readonly indicatorEngine: FootprintIndicatorEngine;
  readonly markupRegistry = new MarkupRegistry();

  get data(): ClusterData | null {
    return this.state.data;
  }

  private set data(value: ClusterData | null) {
    this.state.setData(value);
    this.indicatorEngine?.setData(value);
  }

  get hiddenHint(): boolean {
    return this.state.hiddenHint;
  }
  set hiddenHint(hidden: boolean) {
    this.state.setHintHidden(hidden);
  }
  get selectedPrice(): number | null {
    return this.state.selectedPrice;
  }
  set selectedPrice(price: number | null) {
    this.state.setSelectedPrice(price);
  }
  get selectedPrice1(): number | null {
    return this.state.selectedPrice1;
  }
  set selectedPrice1(price: number | null) {
    this.state.setSelectedPrice1(price);
  }

  movedView: canvasPart | null = null;

  translateMatrix: Matrix | null = null;

  minIndex: number = 0;
  maxIndex: number = 0;

  finishPrice: number = 0;
  startPrice: number = 0;

  viewsManager: ViewsManager;
  mouseAndTouchManager: MouseAndTouchManager;
  manager: MarkUpManager;

  constructor(
    public colorsService: ColorsService,
    public formatService: FormattingService,
    private colorSchemeService: ColorSchemeService,
    private materialThemeService: MaterialThemeService,
    private hostRef: ElementRef<HTMLElement>,
    private footprintUtilities: FootprintUtilitiesService,
    public levelMarksService: LevelMarksService,
    public dialogService: DialogService,
    public router: Router,
    private footprintLayoutService: FootprintLayoutService,
    private openPositions: OpenPositionsRepository,
    private state: FootprintStateService,
    private hintContainer: HintContainerService
  ) {
    // this.FPsettings = FPsettings;
    this.translateMatrix = null;
    this.markupEnabled = false;

    registerFootprintBuiltInMarkups(this.markupRegistry);
    registerFootprintBuiltInIndicators(this.indicatorRegistry);
    this.indicatorEngine = new FootprintIndicatorEngine(
      this.indicatorRegistry,
      {
        requestRender: () => this.scheduleIndicatorRender(false),
        requestRecalc: () => this.scheduleIndicatorRender(true),
      },
      {
        ensurePanel: (kind: 'chart' | 'new', preferredId?: string) => this.ensureIndicatorPanel(kind, preferredId),
        getPanelHeight: (panelId: string) => this.getIndicatorPanelHeight(panelId),
      },
      {
        getMeta: () => ({
          ticker: this.params?.ticker ?? null,
          period: this.params?.period ?? null,
          rperiod: this.params?.rperiod ?? null,
          candlesOnly: this.params?.candlesOnly ?? null,
        }),
        loadOpenPositionsByTicker: (ticker: string) => this.openPositions.load(ticker),
      }
    );
  }

  get canvas(): HTMLCanvasElement | null {
    return this._canvas;
  }

  get ctx(): FootprintCanvasContext | null {
    return this._ctx;
  }

  get hintService(): HintContainerService {
    return this.hintContainer;
  }

  getCsv() {
    if (!this.params || !this.data) {
      return;
    }

    this.footprintUtilities.exportCsv(this.params, this.data);
  }

  presetItems: SelectListItemNumber[] = [];

  selectedColumn: ColumnEx | null = null;

  hideHint() {
    this.state.setHintHidden(true);
    this.state.clearSelection();
    this.hintContainer.hide();
  }

  showHint(content: string, position: { x: number; y: number }): void {
    if (this.destroyed) return;
    this.hintContainer.show(content, position);
    this.hiddenHint = false;
  }

  get dragMode(): number | null {
    return this.state.dragMode;
  }

  set dragMode(value: number | null) {
    this.state.setDragMode(value);
  }

  get FPsettings(): ChartSettings {
    return this.state.settings;
  }

  set FPsettings(settings: ChartSettings) {
    if (this.destroyed) return;
    this.state.setSettings(settings);
    this.indicatorEngine?.setSettings(settings);
    this.applyThemePreset(settings.ThemePreset);
    if (!this.applyingSnapshot) this.settingsChanged.emit(this.FPsettings);
  }

  applyOideltaDivider(): void {
    if (!this.data) {
      return;
    }

    this.data.setOiDeltaDivideBy2(!!this.FPsettings.OIDeltaDivideBy2);
  }

  applyThemePreset(presetName?: string | null, force = false): void {
    if (this.destroyed) return;
    const normalized =
      typeof presetName === 'string' && presetName.trim()
        ? presetName.trim()
        : DEFAULT_THEME_PRESET;
    const explicitPreset: ThemePreset = normalized === 'Dark' ? 'Dark' : 'Light';
    const storedPreset = this.materialThemeService.getStoredPreset();
    const preset: ThemePreset = force
      ? explicitPreset
      : storedPreset ?? DEFAULT_THEME_PRESET;

    this.materialThemeService.applyPreset(preset);
    const currentSettings = this.state.settings;
    if (currentSettings && currentSettings.ThemePreset !== preset) {
      currentSettings.ThemePreset = preset;
    }
    this.themePreset = preset;
    const hostEl = this.hostRef?.nativeElement;
    if (!hostEl) {
      return;
    }
    this.palette = this.colorSchemeService.setPreset(hostEl, preset);
  }

  get deltaVolumes(): readonly number[] {
    return this.state.deltaVolumes;
  }

  updateDeltaVolume(index: number, value: number): void {
    this.state.setDeltaVolume(index, value);
  }

  resetDeltaVolume(index: number): void {
    this.state.resetDeltaVolume(index);
  }

  consumeDeltaVolume(index: number): number {
    const delta = this.state.getDeltaVolume(index);
    this.resetDeltaVolume(index);

    return delta;
  }

  isPriceVisible() {
    if (!this.data) return false;
    return (
      Math.floor(
        this.viewsManager.mtxMain
          .inverse()
          .applyToPoint(
            this.viewsManager.clusterView.x + this.viewsManager.clusterView.w,
            0
          ).x
      ) >=
      this.data.clusterData.length - 1
    );
  }
  isStartVisible() {
    if (!this.data) return false;
    return (
      Math.floor(
        this.viewsManager.mtxMain
          .inverse()
          .applyToPoint(this.viewsManager.clusterView.x, 0).x
      ) <= 0
    );
  }

  getBar(matrix: Matrix): Rectangle { return barRectangle(matrix, this.data.priceScale); }
  clusterRect(price: number, column: number, matrix: Matrix): Rectangle {
    return clusterRectangle(matrix, this.data.priceScale, price, column);
  }
  clusterRect2(price: number, column: number, width: number, matrix: Matrix): Rectangle {
    return clusterRectangle(matrix, this.data.priceScale, price, column, width);
  }
  clusterFontSize(mtx: Matrix, textLen: number) {
    return this.clusterRectFontSize(this.clusterRect(0, 0, mtx), textLen);
  }
  clusterRectFontSize(rect: Rectangle, textLength: number): number {
    return clusterFontSize(rect, textLength, this.colorsService.maxFontSize());
  }

  private get viewInitialized(): boolean {
    return this.state.viewInitialized;
  }

  private markViewInitialized(): void {
    this.state.markViewInitialized();
  }
  getMinMaxIndex(mtx: Matrix) {
    const data = this.data.clusterData;
    this.minIndex = data.length - 1;
    this.maxIndex = 0;
    const finishPrice = mtx.Height2Price(
      this.viewsManager.clusterTotalView.y - 100
    );
    const startPrice = mtx.Height2Price(
      this.viewsManager.clusterTotalView.y +
        this.viewsManager.clusterTotalView.h +
        100
    );
    this.finishPrice =
      Math.floor(finishPrice / this.data.priceScale) * this.data.priceScale;
    this.startPrice =
      Math.floor(startPrice / this.data.priceScale) * this.data.priceScale;
    const visible = getVisibleBars(mtx, this.viewsManager.clusterView, data.length, this.data.priceScale);
    this.minIndex = visible.minIndex;
    this.maxIndex = visible.maxIndex;
    if (this.FPsettings.ShrinkY)
      this.data.maxFromPeriod(this.minIndex, this.maxIndex);
  }

  getInitMatrix(view: Rectangle, data: ClusterData) {
    if (!this.params) {
      return new Matrix();
    }

    return this.footprintLayoutService.getInitialMatrix(
      view,
      data,
      this.FPsettings,
      this.params
    );
  }

  hiddenTotal() {
    return this.FPsettings.totalMode == 'Hidden' && this.data.ableCluster();
  }

  initSize() {
    if (this.destroyed || !this.params) return;
    this.renderScheduler.request({ initialize: true });
  }

  drawClusterView() {
    if (this.destroyed || this.rendering) return;
    this.renderScheduler.request({ draw: true });
  }

  private scheduleIndicatorRender(recalculate: boolean): void {
    if (this.destroyed) return;
    this.renderScheduler.request({ draw: true, recalculate });
  }

  @HostListener('window:resize')
  public resize() {
    if (this.destroyed || !this.viewInitialized || !this.viewsManager) {
      return;
    }
    this.renderScheduler.request({ resize: true });
  }

  alignMatrix(matrix: Matrix, alignprice = false) {
    if (!this.data) return matrix;
    const alignedMatrix = this.footprintLayoutService.alignMatrix(
      matrix,
      this.viewsManager.clusterView,
      this.data,
      this.FPsettings,
      alignprice
    );
    this.getMinMaxIndex(alignedMatrix);
    return alignedMatrix;
  }
  topLinesCount() {
    const x = (this.topVolumes() ? 1 : 0) + (this.oiEnable() ? 1 : 0) + 2;
    return x;
  }
  topVolumes() {
    return this.FPsettings.TopVolumes;
  }
  oiEnable() {
    return this.FPsettings.oiEnable && this.data.maxAbsOIDelta > 0;
  }




  // ... остальной код компонента

  ngAfterViewInit() {
    if (this.destroyed) return;
    this.resourcesSubscription = this.openPositions.invalidated$.subscribe(ticker => {
      if (this.data && ticker === this.params?.ticker?.trim().toUpperCase()) this.indicatorEngine.refreshResources();
    });
    this.palette = this.colorSchemeService.readPalette(this.hostRef.nativeElement);
    this.themeSubscription = this.colorSchemeService.themeChanged$.subscribe((event) => {
      if (event.hostEl !== this.hostRef.nativeElement) {
        return;
      }
      this.palette = event.palette;
      if (!this.applyingSnapshot && this.viewInitialized && this.viewsManager) {
        this.viewsManager.drawClusterView();
      }
    });

    // Инициализация canvas и менеджеров
    const canvas: HTMLCanvasElement | null = this.canvasRef?.nativeElement;
    if (!canvas) return;
    this._canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) return;
    this._ctx = installFootprintCanvas(context);
    this.mouseAndTouchManager = new MouseAndTouchManager(createInputHostContext(this));
    this.viewsManager = new ViewsManager(createViewsHostContext(this), this.footprintLayoutService);

    try {
      this.markupManager = new MarkUpManager(this.markupRegistry, this.createInteractionContext());
      this.markupEnabled = true;
    } catch (e) {
      console.warn('Markup manager initialization failed', e);
      this.markupEnabled = false;
    }
    this.markViewInitialized();
    this.initializeViewIfReady();
  }

  bindRealtime(updater: FootprintRealtimeUpdaterService) {
    if (this.destroyed) return;
    updater.bindCanvas(this.canvasRef ?? null);
  }

  applySnapshot(snapshot: FootprintSnapshot): void {
    if (this.destroyed) return;
    if (this.currentSessionId !== snapshot.sessionId) this.openPositions.invalidate(snapshot.params.ticker);
    this.applyingSnapshot = true;
    try {
      this.currentSessionId = snapshot.sessionId;
      this.state.setParams(copyFootprintParams(snapshot.params));
      this.minimode = snapshot.options.minimode;
      this.deltamode = snapshot.options.deltamode;
      this.presetIndex = snapshot.presetIndex;
      this.presetItems = snapshot.presets;
      this.data = snapshot.data;
      this.FPsettings = snapshot.settings;
      this.applyOideltaDivider();
      this.indicatorEngine.setSettings(this.FPsettings);
      this.hintContainer.ensureHintElement();
    } finally {
      this.applyingSnapshot = false;
    }
    this.initializeViewIfReady();
  }

  clearSession(): void {
    if (this.destroyed) return;
    this.currentSessionId = null;
    this.renderScheduler.reset();
    this.mouseAndTouchManager?.cancelInteraction();
    this.viewsManager?.clearViews();
    this.markupManager?.cancelInteraction();
    this.translateMatrix = null;
    this.animButtonState.hover = false;
    this.animButtonState.pressed = false;
    this.animButtonState.hoverT = 0;
    this.animButtonState.pressT = 0;
    this.data = null;
    this.state.setParams(null);
    this.hideHint();
    this.indicatorEngine.setSettings(null);
    this.indicatorEngine.prepare();
    this.ctx?.clearRect(0, 0, this.canvas?.width ?? 0, this.canvas?.height ?? 0);
  }

  applyParams(params: FootPrintParameters) {
    if (this.destroyed) return;
    this.state.setParams(params);
    this.initializeViewIfReady();
  }

  applySettings(settings: ChartSettings) {
    if (this.destroyed) return;
    this.FPsettings = settings;
    this.applyOideltaDivider();
    this.indicatorEngine.setSettings(this.FPsettings);
    if (!this.viewInitialized || !this.data || !this.params) {
      return;
    }

    this.initSize();
    this.resize();
  }

  updatePresentation(settings: ChartSettings): void {
    if (this.destroyed) return;
    this.FPsettings = settings;
    this.applyOideltaDivider();
    this.renderScheduler.request({ resize: true, recalculate: true });
  }

  saveSettings(): void {
    if (this.destroyed) return;
    this.settingsSaveRequested.emit(this.FPsettings);
  }

  applyData(clusterData: ClusterData) {
    if (this.destroyed) return;
    const isNewDataInstance = this.data !== clusterData;
    this.data = clusterData;
    this.applyOideltaDivider();
    this.indicatorEngine.setData(this.data);
    this.hintContainer.ensureHintElement();
    if (!this.viewInitialized || !this.params || !isNewDataInstance) {
      return;
    }

    this.initSize();
    this.resize();
    this.viewsManager.drawClusterView();
  }

  private initializeViewIfReady(): void {
    if (this.destroyed || !this.viewInitialized || !this.data || !this.params) {
      return;
    }

    this.indicatorEngine.setData(this.data);
    this.indicatorEngine.setSettings(this.FPsettings);
    this.renderScheduler.request({ initialize: true, resize: true });
  }

  handleRealtimeUpdate(update: FootprintUpdateEvent) {
    if (this.destroyed || update.sessionId !== this.currentSessionId || !this.data || !this.viewsManager) {
      return;
    }

    const isVisible = this.isPriceVisible();
    const shouldMerge = update.type !== 'ladder' && isVisible && !!update.merged;
    this.renderScheduler.request({ draw: true, realtime: shouldMerge });
  }

  isFrameReady(): boolean {
    return !this.destroyed && this.viewInitialized && !!this.data && !!this.params && !!this.viewsManager;
  }

  private renderFrame(flags: FootprintRenderFlags): void {
    if (!this.isFrameReady()) return;
    this.rendering = true;
    try { this.frameRenderer.render(flags); }
    finally { this.rendering = false; }
  }

  private ensureIndicatorPanel(kind: 'chart' | 'new', preferredId?: string) {
    if (kind === 'chart') return 'chart';

    const idBase = (preferredId ?? 'panel').trim().replace(/\s+/g, '-');
    const settings = this.FPsettings;
    if (!settings.IndicatorPanels) settings.IndicatorPanels = {};
    let id = idBase;
    let i = 1;
    while (settings.IndicatorPanels[id] && i < 1000) {
      id = `${idBase}-${i++}`;
    }

    if (!settings.IndicatorPanels[id]) {
      settings.IndicatorPanels[id] = { height: Math.round(90 * this.colorsService.sscale()) };
    }

    return { id };
  }

  private getIndicatorPanelHeight(panelId: string): number {
    const h = this.FPsettings.IndicatorPanels?.[panelId]?.height;
    const normalized = typeof h === 'number' && isFinite(h) ? h : Math.round(90 * this.colorsService.sscale());
    return Math.max(MIN_PANEL_HEIGHT, Math.floor(normalized));
  }

  ngOnDestroy(): void { this.dispose(); }

  dispose(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.currentSessionId = null;
    this.renderScheduler.destroy();
    this.mouseAndTouchManager?.dispose();
    this.markupManager?.dispose();
    this.viewsManager?.dispose();
    this.indicatorEngine.dispose();
    this.openPositions.dispose();
    this.themeSubscription?.unsubscribe();
    this.resourcesSubscription?.unsubscribe();
    this.hintContainer.destroy();
    this.state.setData(null);
    this.state.setParams(null);
    this.translateMatrix = null;
    this.selectedColumn = null;
    this._ctx = null;
    this._canvas = null;
    this.canvasRef = undefined;
  }
}



