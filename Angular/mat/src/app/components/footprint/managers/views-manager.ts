import { applyCanvasSize } from '../rendering/canvas-size';
import type { ViewsHostContext } from '../models/chart-runtime-context';
import type { ChartColors } from '../models/footprint-context';
import { canvasPart } from '../views/canvas-part';
import { viewMiniHead } from '../views/view-mini-head';
import { viewAnim } from '../views/view-anim';
import { viewDates } from '../views/view-dates';
import { viewPrices } from '../views/view-prices';
import { viewPricesRangeSet } from '../views/view-prices-range-set';
import { viewBackground } from '../views/view-background';
import { viewBackground1 } from '../views/view-background-secondary';
import { viewDelta } from '../views/view-delta';
import { viewDeltaBars } from '../views/view-delta-bars';
import { viewHead } from '../views/view-head';
import { viewMain } from '../views/view-main';
import { viewRangeSet } from '../views/view-range-set';
import { viewDeltaRangeSet } from '../views/view-delta-range-set';
import { viewOIDelta } from '../views/view-oi-delta';
import { viewScrollBars } from '../views/view-scroll-bars';
import { viewTotal } from '../views/view-total';
import { viewVolumes } from '../views/view-volumes';
import { viewVolumesSeparated } from '../views/view-volumes-separated';
import { viewOI } from '../views/view-oi';
import { Rectangle } from 'src/app/models/Rectangle';
import { ClusterData } from '../models/cluster-data';
import { Matrix } from '../models/matrix';
import {
  FootprintLayoutDto,
  FootprintLayoutService,
  FootprintMatricesDto,
} from '../services/footprint-layout.service';
import { ChartSettingsService } from 'src/app/service/chart-settings.service';
import { ChartSettings } from 'src/app/models/ChartSettings';
import { viewBackgroundRange } from '../views/view-background-range';
import { viewIndicatorsOverlay } from '../views/view-indicators-overlay';
import { viewIndicatorPanel } from '../views/view-indicator-panel';
import { isArbitrageMode } from 'src/app/models/footprint-mode';
import { reconcileCanvasParts } from '../views/reconcile-canvas-parts';

export class ViewsManager {
  private destroyed = false;
  footprint: ViewsHostContext;
  colorsService: ChartColors;
  data: ClusterData | null = null;

  constructor(
    footprint_: ViewsHostContext,
    private layoutService: FootprintLayoutService
  ) {
    this.footprint = footprint_;
    this.colorsService = footprint_.colorsService;
  }

  views: Array<canvasPart> = new Array();
  resizeable: Array<canvasPart | null> = [];
  indicatorPanels: viewIndicatorPanel[] = [];
  viewMiniHead: viewMiniHead | null = null;
  viewMain: viewMain | null = null;
  viewBackground1: viewBackground1 | null = null;
  viewPrices: viewPrices | viewPricesRangeSet | null = null;
  viewBackground: viewBackground | null = null;
  viewBackgroundRange: viewBackgroundRange | null = null;
  viewRangeSet: viewRangeSet | null = null;
  viewDeltaRangeSet: viewDeltaRangeSet | null = null;
  viewVolumes: viewVolumes | null = null;
  viewHead: viewHead | null = null;
  viewAnim: viewAnim | null = null;
  viewDelta: viewDelta | null = null;
  viewOIDelta: viewOIDelta | null = null;
  viewOI: viewOI | null = null;
  viewDeltaBars: viewDeltaBars | null = null;
  viewScrollBars: viewScrollBars | null = null;
  viewTotal: viewTotal | null = null;
  viewDates: viewDates | null = null;
  viewVolumesSeparated: viewVolumesSeparated | null = null;

  clusterPricesView: Rectangle = new Rectangle(0, 0, 0, 0);
  clusterView: Rectangle = new Rectangle(0, 0, 0, 0);
  clusterDatesView: Rectangle = new Rectangle(0, 0, 0, 0);
  clusterHeadView: Rectangle = new Rectangle(0, 0, 0, 0);
  clusterMiniHeadView: Rectangle = new Rectangle(0, 0, 0, 0);
  clusterAnimArea: Rectangle = new Rectangle(0, 0, 0, 0);
  clusterVolumesView: Rectangle = new Rectangle(0, 0, 0, 0);
  clusterOIView: Rectangle = new Rectangle(0, 0, 0, 0);
  clusterOIDeltaView: Rectangle = new Rectangle(0, 0, 0, 0);
  clusterDeltaView: Rectangle = new Rectangle(0, 0, 0, 0);
  clusterDeltaBarsView: Rectangle = new Rectangle(0, 0, 0, 0);
  clusterTotalView: Rectangle = new Rectangle(0, 0, 0, 0);
  clusterTotalViewFill: Rectangle = new Rectangle(0, 0, 0, 0);
  layout: FootprintLayoutDto | null = null;
  matrices: FootprintMatricesDto | null = null;

  mtx: Matrix = new Matrix();
  mtxhead: Matrix = new Matrix();
  mtxtotal: Matrix = new Matrix();
  mtxprice: Matrix = new Matrix();
  mtxanim: Matrix = new Matrix();
  mtxMain: Matrix = new Matrix();

  clearViews(): void {
    const parts = new Set(this.views);
    for (const value of Object.values(this)) {
      if (value instanceof canvasPart) parts.add(value);
    }
    for (const part of parts) part.dispose();
    for (const key of Object.keys(this)) {
      if ((this as any)[key] instanceof canvasPart) (this as any)[key] = null;
    }
    this.views = this.footprint.views = [];
    this.resizeable = [];
    this.indicatorPanels = [];
    this.layout = null;
    this.matrices = null;
    this.data = null;
  }

  dispose(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.clearViews();
  }

  updateLayout() {
    if (this.destroyed) return;
    const canvas: HTMLCanvasElement | null = this.footprint.canvas;
    const data = this.footprint.data;

    if (!canvas || !data) {
      return;
    }

    const indicatorPanels = this.footprint.indicators?.getPanels?.() ?? [];
    const layout = this.layoutService.calculateLayout({
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      deltaVolumes: this.footprint.deltaVolumes,
      minimode: this.footprint.minimode,
      settings: this.getSettings(),
      data,
      topLinesCount: this.footprint.topLinesCount(),
      indicatorPanels,
    });

    this.layout = layout;
    this.clusterPricesView = layout.clusterPricesView;
    this.clusterView = layout.clusterView;
    this.clusterDatesView = layout.clusterDatesView;
    this.clusterHeadView = layout.clusterHeadView;
    this.clusterMiniHeadView = layout.clusterMiniHeadView;
    this.clusterAnimArea = layout.clusterAnimArea;
    this.clusterVolumesView = layout.clusterVolumesView;
    this.clusterOIView = layout.clusterOIView;
    this.clusterOIDeltaView = layout.clusterOIDeltaView;
    this.clusterDeltaView = layout.clusterDeltaView;
    this.clusterDeltaBarsView = layout.clusterDeltaBarsView;
    this.clusterTotalView = layout.clusterTotalView;
    this.clusterTotalViewFill = layout.clusterTotalViewFill;
  }

  getSettings(): ChartSettings {
    const hasRangeSet = (this.data?.rangeSetLines ?? null) != null;
    if (!hasRangeSet) return this.footprint.FPsettings;

    const settings = ChartSettingsService.miniSettings();
    settings.Delta = true;
    settings.VolumesHeight = this.footprint.FPsettings.VolumesHeight ?? settings.VolumesHeight;
    return settings;
  }

 createParts() {
    if (this.destroyed) return;
    const previous = this.views;
    this.buildParts();
    const replacements = reconcileCanvasParts(previous, this.views);
    if (previous.some(part => part.isDisposed)) this.footprint.cancelInteraction();
    for (const key of Object.keys(this)) {
      const value = (this as any)[key];
      if (replacements.has(value)) (this as any)[key] = replacements.get(value);
    }
    this.views = this.footprint.views = this.views.map(view => replacements.get(view) ?? view);
    this.resizeable = this.resizeable.map(view => replacements.get(view) ?? view);
    this.indicatorPanels = this.indicatorPanels.map(view => (replacements.get(view) ?? view) as viewIndicatorPanel);
  }

 private buildParts() {
    this.updateLayout();
    if (!this.layout) {
      return;
    }

   if( this.data.rangeSetLines != null )
   {
      this.createPartsRange();
      return;
   }

    this.views = this.footprint.views = [];
    let FPsettings = this.footprint.FPsettings;
    const minimode: boolean = this.footprint.minimode;

    this.viewBackground1 = new viewBackground1(
      this.footprint.viewContext,
      this.clusterTotalViewFill,
      this.mtxMain
    );
    if (FPsettings.totalMode == 'Left' && this.data.ableCluster())
      this.views.push(this.viewBackground1);

    
    this.views.push(
      (this.viewBackground = new viewBackground(
        this.footprint.viewContext,
        this.clusterView,
        this.mtxMain
      ))
    );

    if (!minimode)
      this.views.push(
        (this.viewDates = new viewDates(
          this.footprint.viewContext,
          this.clusterDatesView,
          this.mtxMain
        ))
      );

      this.views.push(
        (this.viewPrices = new viewPrices(
          this.footprint.viewContext,
          this.clusterPricesView,
          this.mtxprice
        ))
      );

    if (minimode)
      this.views.push(
        (this.viewMiniHead = new viewMiniHead(
          this.footprint.viewContext,
          this.clusterMiniHeadView,
          this.mtx
        ))
      );

    if (FPsettings.Head) {
      this.views.push(
        (this.viewHead = new viewHead(
          this.footprint.viewContext,
          this.clusterHeadView,
          this.mtxhead
        ))
      );
      this.views.push(
        (this.viewAnim = new viewAnim(
          this.footprint.viewContext,
          this.clusterAnimArea,
          this.mtxanim
        ))
      );
    }

    this.views.push(
      (this.viewMain = new viewMain(
        this.footprint.viewContext,
        this.clusterView,
        this.mtxMain
      ))
    );

    if (FPsettings.SeparateVolume)
      this.views.push(
        (this.viewVolumesSeparated = new viewVolumesSeparated(
          this.footprint.viewContext,
          this.clusterVolumesView,
          this.mtxMain
        ))
      );
    else
      this.views.push(
        (this.viewVolumes = new viewVolumes(
          this.footprint.renderContext,
          this.clusterVolumesView,
          this.mtxMain
        ))
      );

    //this.views.push(this.viewVolumes = new viewVolumes(this,  this.clusterVolumesView, this.mtxMain));
    this.viewTotal = new viewTotal(
      this.footprint.viewContext,
      this.clusterTotalViewFill,
      this.mtxtotal
    );
    if (FPsettings.totalMode != 'Hidden' && this.data.ableCluster())
      this.views.push(this.viewTotal);

    // Draw overlay indicators AFTER volumes so they remain visible on top.
    this.views.push(new viewIndicatorsOverlay(this.footprint.viewContext, this.clusterView, this.mtxMain));

    this.views.push(
      (this.viewScrollBars = new viewScrollBars(
        this.footprint.viewContext,
        this.clusterView,
        this.mtxMain
      ))
    );

    //  this.views.push(this.viewOI = new viewOI(this,  this.clusterBottomVolumes, this.mtxMain));

    if (this.data.ableOI() && FPsettings.OI) {
      this.views.push(
        (this.viewOI = new viewOI(
          this.footprint.viewContext,
          this.clusterOIView,
          this.mtxMain
        ))
      );
    }

    if (this.data.ableOI() && FPsettings.OIDelta) {
      this.views.push(
        (this.viewOIDelta = new viewOIDelta(
          this.footprint.viewContext,
          this.clusterOIDeltaView,
          this.mtxMain
        ))
      );
    }

    if (FPsettings.Delta) {
      this.views.push(
        (this.viewDelta = new viewDelta(
          this.footprint.viewContext,
          this.clusterDeltaView,
          this.mtxMain
        ))
      );
    }

    if (FPsettings.DeltaBars) {
      this.views.push(
        (this.viewDeltaBars = new viewDeltaBars(
          this.footprint.viewContext,
          this.clusterDeltaBarsView,
          this.mtxMain
        ))
      );
    }

    this.indicatorPanels = [];
    for (const panel of this.layout.indicatorPanels) {
      const v = new viewIndicatorPanel(this.footprint.viewContext, panel.view, this.mtxMain, panel.id);
      this.indicatorPanels.push(v);
      this.views.push(v);
    }

    // 
    this.resizeable = [
      this.viewVolumesSeparated,
      this.viewOI,
      this.viewDelta,
      this.viewOIDelta,
      this.viewTotal,
      this.viewDeltaBars,
    ];

    // allow resizing indicator panels too (handled separately in MouseAndTouchManager)
    this.resizeable.push(...this.indicatorPanels);
  }


  createPartsRange() {
    this.updateLayout();
    if (!this.layout) {
      return;
    }
    this.views = this.footprint.views = [];
    let FPsettings =   this.getSettings();
    const minimode: boolean = this.footprint.minimode;
    
    this.views.push(
      (this.viewBackgroundRange = new viewBackgroundRange(
        this.footprint.viewContext,
        this.clusterView,
        this.mtxMain
      ))
    );


    this.views.push(
      (this.viewRangeSet = new viewRangeSet(
        this.footprint.viewContext,
        this.clusterView,
        this.mtxMain
      ))
    );

      this.views.push(
        (this.viewDates = new viewDates(
          this.footprint.viewContext,
          this.clusterDatesView,
          this.mtxMain
        ))
      );

      
      this.views.push(
        (this.viewPrices = new viewPricesRangeSet(
          this.footprint.viewContext,
          this.clusterPricesView,
          this.mtxprice
        ))
      );


      this.views.push(
        (this.viewDeltaRangeSet = new viewDeltaRangeSet(
          this.footprint.viewContext,
          this.clusterDeltaView,
          this.mtxMain
        )));

    const isArbitrage = isArbitrageMode(this.footprint.params ?? {});
    if (!isArbitrage) {
      // Draw overlay indicators last (above range set visuals too).
      this.views.push(new viewIndicatorsOverlay(this.footprint.viewContext, this.clusterView, this.mtxMain));
    }

    this.indicatorPanels = [];
    for (const panel of this.layout.indicatorPanels) {
      const v = new viewIndicatorPanel(this.footprint.viewContext, panel.view, this.mtxMain, panel.id);
      this.indicatorPanels.push(v);
      this.views.push(v);
    }

    this.resizeable = [
      null,
      null,
      this.viewDeltaRangeSet,
      null,
      null,
      null,
    ];

    this.resizeable.push(...this.indicatorPanels);
  }

  drawClusterView() {
    if (!this.destroyed) this.footprint.requestRender();
  }

  renderNow() {
    if (this.destroyed) return;
    const FPsettings =  this.getSettings(); //  this.footprint.FPsettings;
    const canvas: HTMLCanvasElement | null = this.footprint.canvas;
    const ctx: CanvasRenderingContext2D | null = canvas?.getContext('2d');
    this.data = this.footprint.data;

    if (!this.data || !canvas || !ctx) return;
    if (canvas.width <= 1 || canvas.height <= 1) return;

    if (!this.layout) {
      this.updateLayout();
    }

    if (!this.layout) return;
    if (this.clusterView.w <= 1 || this.clusterView.h <= 1) return;

    ctx.fillStyle = this.footprint.palette.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (this.data.clusterLength() < 1) {
      ctx.font = 'bold 16px Verdana';
      ctx.fillStyle = this.footprint.palette.text;
      ctx.fillText('НЕТ ДАННЫХ', canvas.width * 0.5, 30);
      return;
    }

    
    this.matrices = this.layoutService.buildMatrices(
      this.mtx,
      this.layout,
      FPsettings,
      this.data,
      this.footprint.topLinesCount(),
      this.footprint.translateMatrix
    );

    this.mtxMain = this.matrices.mtxMain;
    this.mtxtotal = this.matrices.mtxtotal;
    this.mtxprice = this.matrices.mtxprice;
    this.mtxhead = this.matrices.mtxhead;
    this.mtxanim = this.matrices.mtxanim;
    this.createParts();
    this.footprint.getMinMaxIndex(this.mtxMain);
    for (const view in this.views) 
      this.views[view].drawCanvas();
  }

  alignCanvas() {
    if (this.destroyed) return;
    var canvas = this.footprint.canvas;
    if (!canvas) return;
    const container = this.resolveCanvasContainer(canvas);
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const w = containerRect.width;
    const h = containerRect.height;

    applyCanvasSize(canvas, w, h, window.devicePixelRatio);
  }

  public resize() {
    if (!this.destroyed) this.footprint.resize();
  }

  resizeNow() {
    if (this.destroyed) return;
    if (!this.footprint.data) return;
  
    var canvas = this.footprint.canvas;
    if (!canvas) {
      return;
    }

    const container = this.resolveCanvasContainer(canvas);
  
    if (container) {
      var oldX = this.clusterView.x + this.clusterView.w;
      var oldY = this.clusterView.y + this.clusterView.h / 2;
      this.alignCanvas();
      this.updateLayout();
      if (!this.layout) {
        return;
      }
      var newX = this.clusterView.x + this.clusterView.w;
      var newY = this.clusterView.y + this.clusterView.h / 2;
      
      this.mtx = this.footprint.alignMatrix(
        this.mtx.getTranslate(newX - oldX, newY - oldY)
      );
    }
  }

  private resolveCanvasContainer(canvas: HTMLCanvasElement): HTMLElement | null {
    let container: HTMLElement | null = canvas.parentElement;

    while (container) {
      const rect = container.getBoundingClientRect();
      if (rect.height > 0 && rect.width > 0) {
        return container;
      }
      container = container.parentElement;
    }

    return null;
  }
  
  
}





