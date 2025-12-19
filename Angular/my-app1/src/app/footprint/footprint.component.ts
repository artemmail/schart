import { Component, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { Matrix, Rectangle } from './matrix';
import { Point } from './matrix';
import { viewAnim } from './parts/viewAnim';
import { viewDates } from './parts/viewDates';
import { viewPrices } from './parts/viewPrices';
import { SettingsService } from './service/Settings/settings.service';
import { ChartSettings } from '../models/ChartSettings';
import { ColorsService } from './service/Colors/color.service';
import { FormattingService } from './service/Formating/formatting.service';
import { LevelMarksService } from './service/LevelMarks/level-marks.service';
import { ClusterStreamService } from './service/ClusterStream/cluster-stream.service';
import { clusterData } from './clusterData';
import { canvasPart } from './parts/canvasPart';
import { viewBackground } from './parts/viewBackground';
import { viewBackground1 } from './parts/viewBackground1';
import { viewDelta } from './parts/viewDelta';
import { viewDeltaBars } from './parts/viewDeltaBars';
import { viewHead } from './parts/viewHead';
import { viewMain } from './parts/viewMain';
import { viewOIDelta } from './parts/viewOIDelta';
import { viewScrollBars } from './parts/viewScrollBars';
import { viewTotal } from './parts/viewTotal';
import { viewVolumes } from './parts/viewVolumes';
import { viewVolumesSeparated } from './parts/viewVolumesSeparated';
import { Parameters } from '../models/Params';
import { ColumnEx } from '../models/Column';
import { viewOI } from './parts/viewOI';
import { DraggableEnum } from '../models/Draggable';

@Component({
  selector: 'app-footprint',
  templateUrl: './footprint.component.html',
  styleUrls: ['./footprint.component.css'],
})
export class FootPrintComponent implements AfterViewInit {
  @ViewChild('drawingCanvas', { static: false }) canvasRef?: ElementRef;

  public canvas: HTMLCanvasElement | null = this.canvasRef?.nativeElement;
  public ctx: any;

  DeltaVolumes: Array<number> = [0, 0, 0, 0, 0, 0, 0, 0];
  hiddenHint: boolean;
  selectedPrice: any;
  hint: any;
  panStartInfo: { event: any; view: any } | any;
  selectedPoint: any;
  pressd: Point = { x: 0, y: 0 };

  markupEnabled: boolean;
  markupManager: any;
  clusterWidthScale: number = 0.97;
  data: clusterData | any = null;

  views: Array<canvasPart> = new Array();
  viewMain: viewMain | null = null;
  viewBackground1: viewBackground1 | null = null;
  viewPrices: viewPrices | null = null;
  viewBackground: viewBackground | null = null;
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
  selectedView: canvasPart | null = null;
  movedView: canvasPart | null = null;
  resizeable: Array<canvasPart | null> = [];

  clusterPricesView: Rectangle = new Rectangle(0, 0, 0, 0);
  clusterView: Rectangle = new Rectangle(0, 0, 0, 0);
  clusterDatesView: Rectangle = new Rectangle(0, 0, 0, 0);
  clusterHeadView: Rectangle = new Rectangle(0, 0, 0, 0);
  clusterAnimArea: Rectangle = new Rectangle(0, 0, 0, 0);
  clusterVolumesView: Rectangle = new Rectangle(0, 0, 0, 0);
  clusterOIView: Rectangle = new Rectangle(0, 0, 0, 0);
  clusterOIDeltaView: Rectangle = new Rectangle(0, 0, 0, 0);
  clusterDeltaView: Rectangle = new Rectangle(0, 0, 0, 0);
  clusterDeltaBarsView: Rectangle = new Rectangle(0, 0, 0, 0);
  clusterTotalView: Rectangle = new Rectangle(0, 0, 0, 0);
  clusterTotalViewFill: Rectangle = new Rectangle(0, 0, 0, 0);

  mtx: Matrix = new Matrix();
  mtxhead: Matrix = new Matrix();
  mtxtotal: Matrix = new Matrix();
  mtxprice: Matrix = new Matrix();
  mtxanim: Matrix = new Matrix();
  mtxMain: Matrix = new Matrix();
  translateMatrix: Matrix | null = null;

  minIndex: number = 0;
  maxIndex: number = 0;

  finishPrice: number = 0;
  startPrice: number = 0;

  constructor(
    // private route: ActivatedRoute,
    public settingsService: SettingsService,
    public colorsService: ColorsService,
    public formatService: FormattingService,
    public LevelMarksService: LevelMarksService,
    public ClusterStreamService: ClusterStreamService
  ) {
    // this.FPsettings = FPsettings;
    this.translateMatrix = null;
    this.hiddenHint = true;
    this.markupEnabled = false;
    // this.ColorsService =

    /*
        try {
            this.markupManager = new MarkUpManager(viewModel, this);
        }
        catch (e) {
            console.log('markup error');
            this.markupEnabled = false;
        }*/

    this.panStartInfo = null;

    const canvas: HTMLCanvasElement | null = this.canvasRef?.nativeElement;
    if (!canvas) return;

    //this.calcPrices();
  }

  ngAfterViewInit(): void {
    /*
    this.route.parent.paramMap
    .pipe(
        takeUntil(this.destroy$),
        tap(() => (this.isLoading = true)),
        tap((params) => (this.projectId = params.get('id'))),
        switchMap(() => this.attachReload())
    )
    .subscribe();*/

    ColorsService.CanvasExt();

    const canvas: HTMLCanvasElement | null = this.canvasRef?.nativeElement;
    if (!canvas) return;

    this.canvas = canvas;

    this.ctx = canvas.getContext('2d');

    this.ClusterStreamService.GetRange({
      ticker: 'GAZP',
      period: 1,
      priceStep: 0.1,
      startDate: new Date(2023, 11, 26).toISOString(),
      candlesOnly: false,
    }).subscribe((x: any) => {
      this.loadData(x);
      this.addhint();
      this.initSize();
      this.resize();
    });

    this.settingsService.GetSettings(567).subscribe((x: ChartSettings) => {
      this.FPsettings = x;
    });

    // Добавляем обработчики событий для мыши
    canvas.addEventListener('mousedown', this.onMouseDown);
    canvas.addEventListener('mousemove', this.onMouseMove);
    canvas.addEventListener('mouseup', this.onMouseUp);
    canvas.addEventListener('wheel', this.onMouseWheel);
    canvas.addEventListener('click', this.onTap);
  }

  onMouseUp = (): void => {
    let FPsettings = this.FPsettings;
    if (this.dragMode != null) {
      FPsettings.VolumesHeight[this.dragMode] +=
        this.DeltaVolumes[this.dragMode];
      this.DeltaVolumes[this.dragMode] = 0;
      this.dragMode = null;
      //viewModel.save();
      return;
    }

    if (this.movedView !== null) {
      (this.movedView as any).onMouseUp();
      this.drawClusterView();
    }
  };

  onMouseWheel = (event: WheelEvent): void => {
    //point.center = this.conv_mouse_xy({ x: point.clientX, y: point.clientY });
    //debugger
    let point = this.eventToPoint(event);

    for (const view in this.views)
      if (
        'onMouseWheel' in this.views[view] &&
        this.views[view].checkPoint(point)
      )
        (this.views[view] as any).onMouseWheel(point, -event.deltaY / 100.0);
  };

  onMouseDown = (event: MouseEvent): void => {
    this.hideHint();
    let point = this.eventToPoint(event);
    this.pressd = point;
    //   point.center = this.conv_mouse_xy({ x: point.clientX, y: point.clientY });
    for (var v in this.views)
      if (this.views[v].checkDraggable(point)) {
        debugger;
        for (var x = 0; x < this.resizeable.length; x++)
          if (this.views[v] === this.resizeable[x]) this.dragMode = x;

        return;
      }
    for (const view in this.views)
      if (
        'onMouseDown' in this.views[view] &&
        this.views[view].checkPoint(point)
      )
        (this.views[view] as any).onMouseDown(point);
  };

  public params: Parameters = {
    ticker: 'GAZP',
    period: 1,
    priceStep: 1,
    startDate: new Date(),
    candlesOnly: false,
  };

  selectedCoumn: ColumnEx | any;

  public loadData(initdata: any) {
    this.data = new clusterData(initdata);
  }

  /*
  conv_mouse_xy(point: Point) {
    var r = this.canvas.getBoundingClientRect();
    return {
      x: Math.round((point.x - r.left) * this.colorsService.scale()),
      y: Math.round((point.y - r.top) * this.colorsService.scale()),
    };
  }*/

  onMouseOut() {
    this.hideHint();
  }

  hideHint() {
    this.hiddenHint = true;
    this.selectedPrice = null;
    this.hint.style.overflow = 'hidden';
    this.hint.style.display = 'none';
  }

  onPinchStart(point: Point) {
    this.hideHint();
    //point.center = this.conv_mouse_xy(point.center);
    for (const view in this.views)
      if (
        'onPinchStart' in this.views[view] &&
        this.views[view].checkPoint(point)
      )
        (this.views[view] as any).onPinchStart(point);
  }
  onPinchMove(point: Point) {
    //   point.center = this.conv_mouse_xy(point.center);
    for (const view in this.views)
      if ('onPinchMove' in this.views[view])
        (this.views[view] as any).onPinchMove(point);
  }
  onPinchEnd(point: Point) {
    //point.center = this.conv_mouse_xy(point.center);
    for (const view in this.views)
      if ('onPinchEnd' in this.views[view])
        (this.views[view] as any).onPinchEnd(point);
  }
  onPanStart(event: TouchEvent) {
    if (this.dragMode != null) return;
    for (const view in this.views)
      if ('onPanStart' in this.views[view])
        if (this.views[view].checkPoint(this.eventToPoint(event))) {
          this.panStartInfo = { event: event, view: this.views[view] };
        }
  }
  onPan(event: TouchEvent) {
    if (this.dragMode != null) return;
    if (this.panStartInfo != null) this.panStartInfo.view.onPan(event);
  }
  onPanEnd(event: TouchEvent) {
    if (this.dragMode != null) return;
    if (this.panStartInfo != null) {
      this.panStartInfo.view.onPanEnd(event);
      this.panStartInfo = null;
    }
  }

  eventToPoint(event: MouseEvent | TouchEvent | WheelEvent): Point {
    const canvas: HTMLCanvasElement = this.canvasRef?.nativeElement;
    const rect = canvas.getBoundingClientRect();
    let x: number = 0,
      y: number = 0;
    if (event instanceof MouseEvent) {
      x = event.clientX - rect.left;
      y = event.clientY - rect.top;
    } else if (event instanceof TouchEvent) {
      // Получаем координаты первого пальца
      x = event.touches[0].clientX - rect.left;
      y = event.touches[0].clientY - rect.top;
    }
    return { x: x, y: y };
  }

  onMouseMove = (event: MouseEvent): void => {
    if (event.buttons == 1) {
      this.onMouseMovePressed(this.eventToPoint(event));
      return;
    }

    const canvas: HTMLCanvasElement | null = this.canvasRef?.nativeElement;
    if (canvas == null) return;
    if (this.dragMode !== null) return;

    canvas.style.cursor = 'default';
    //point.center = this.conv_mouse_xy({ x: point.clientX, y: point.clientY });
    //this.selectedPrice = null;

    let point = this.eventToPoint(event);

    if (this.viewMain != null && !this.viewMain.checkPoint(point)) {
      this.onMouseOut();
    }

    for (var v = 0; v < this.views.length; v++) {
      if (this.views[v].checkDraggable(point)) {
        var part = this.views[v].draggable;
        if (part === DraggableEnum.Left || part === DraggableEnum.Right)
          canvas.style.cursor = 'w-resize';
        else canvas.style.cursor = 's-resize';
        return;
      }
    }
    //                this.views[view].onMouseMove(point);
    for (const view in this.views)
      if (
        'onMouseMove' in this.views[view] &&
        this.views[view].checkPoint(point)
      ) {
        this.selectedView = this.views[view];
        this.selectedPoint = point;
        this.onMouseOut();
        (this.views[view] as any).onMouseMove({
          position: point,
          button: event.button,
        });
      }
  };
  onMouseMovePressed(point: Point) {
    this.hideHint();

    //    canvas.style.cursor = 'default';
    // point.center = this.conv_mouse_xy({ x: point.clientX, y: point.clientY });

    if (this.dragMode != null) {
      //debugger
      var part = this.resizeable[this.dragMode]?.draggable;

      var Delta =
        part === DraggableEnum.Left || part === DraggableEnum.Right
          ? point.x - this.pressd.x
          : this.pressd.y - point.y;

      if (this.FPsettings.VolumesHeight[this.dragMode] + Delta > 10)
        this.DeltaVolumes[this.dragMode] = Delta;

      this.translateMatrix = null; // new Matrix().translate(0, 0);
      this.drawClusterView();
      return;
    }

    for (const view in this.views)
      if (
        'onMouseMovePressed' in this.views[view] &&
        this.views[view].checkPoint(point)
      ) {
        this.movedView = this.views[view];
        (this.views[view] as any).onMouseMovePressed(point);
      }
  }

  dragMode: number | null = null;

  onTap = (event: MouseEvent): void => {
    //var point1 = event. .pointers[0];
    var point = this.eventToPoint(event);
    for (const view in this.views)
      if ('onTap' in this.views[view] && this.views[view].checkPoint(point))
        (this.views[view] as any).onTap(point);
  };
  onDblClick(point: Point) {
    //point.center = this.conv_mouse_xy({ x: point.clientX, y: point.clientY });
    for (const view in this.views)
      if (
        'onDblClick' in this.views[view] &&
        this.views[view].checkPoint(point)
      )
        (this.views[view] as any).onDblClick(point);
  }
  onRightClick(point: Point) {
    for (const view in this.views)
      if (
        'onRightClick' in this.views[view] &&
        this.views[view].checkPoint(point)
      ) {
        (this.views[view] as any).onRightClick(point);
        return true;
      }
    return false;
  }

  addhint() {
    if (document.getElementById('hint') == null) {
      var element = document.createElement('div');
      element.id = 'hint';
      document.body.appendChild(element);
      //         this.canvas.parentNode.appendChild(element);
    }
    this.hint = document.getElementById('hint');
  }

  public FPsettings: ChartSettings = SettingsService.DefaultSettings();

  createParts() {
    this.genViews();
    this.views = [];
    let FPsettings = this.FPsettings;

    this.viewBackground1 = new viewBackground1(
      this,
      this.clusterTotalViewFill,
      this.mtxMain
    );
    if (FPsettings.totalMode == 'Left' && this.data.ableCluster())
      this.views.push(this.viewBackground1);

    this.views.push(
      (this.viewPrices = new viewPrices(
        this,
        this.clusterPricesView,
        this.mtxprice
      ))
    );
    this.views.push(
      (this.viewBackground = new viewBackground(
        this,
        this.clusterView,
        this.mtxMain
      ))
    );
    this.views.push(
      (this.viewDates = new viewDates(
        this,
        this.clusterDatesView,
        this.mtxMain
      ))
    );

    if (FPsettings.Head) {
      this.views.push(
        (this.viewHead = new viewHead(this, this.clusterHeadView, this.mtxhead))
      );
      this.views.push(
        (this.viewAnim = new viewAnim(this, this.clusterAnimArea, this.mtxanim))
      );
    }

    this.views.push(
      (this.viewMain = new viewMain(this, this.clusterView, this.mtxMain))
    );

    if (FPsettings.SeparateVolume)
      this.views.push(
        (this.viewVolumesSeparated = new viewVolumesSeparated(
          this,
          this.clusterVolumesView,
          this.mtxMain
        ))
      );
    else
      this.views.push(
        (this.viewVolumes = new viewVolumes(
          this,
          this.clusterVolumesView,
          this.mtxMain
        ))
      );

    //this.views.push(this.viewVolumes = new viewVolumes(this,  this.clusterVolumesView, this.mtxMain));
    this.viewTotal = new viewTotal(
      this,
      this.clusterTotalViewFill,
      this.mtxtotal
    );
    if (FPsettings.totalMode != 'Hidden' && this.data.ableCluster())
      this.views.push(this.viewTotal);
    this.views.push(
      (this.viewScrollBars = new viewScrollBars(
        this,
        this.clusterView,
        this.mtxMain
      ))
    );

    //  this.views.push(this.viewOI = new viewOI(this,  this.clusterBottomVolumes, this.mtxMain));

    if (this.data.ableOI() && FPsettings.OI) {
      this.views.push(
        (this.viewOI = new viewOI(this, this.clusterOIView, this.mtxMain))
      );
    }

    if (this.data.ableOI() && FPsettings.OIDelta) {
      this.views.push(
        (this.viewOIDelta = new viewOIDelta(
          this,
          this.clusterOIDeltaView,
          this.mtxMain
        ))
      );
    }

    if (FPsettings.Delta) {
      this.views.push(
        (this.viewDelta = new viewDelta(
          this,
          this.clusterDeltaView,
          this.mtxMain
        ))
      );
    }

    if (FPsettings.DeltaBars) {
      this.views.push(
        (this.viewDeltaBars = new viewDeltaBars(
          this,
          this.clusterDeltaBarsView,
          this.mtxMain
        ))
      );
    }

    // debugger
    this.resizeable = [
      this.viewVolumesSeparated,
      this.viewOI,
      this.viewDelta,
      this.viewOIDelta,
      this.viewTotal,
      this.viewDeltaBars,
    ];
  }
  IsPriceVisible() {
    return (
      Math.floor(
        this.mtxMain
          .inverse()
          .applyToPoint(this.clusterView.x + this.clusterView.w, 0).x
      ) >=
      this.data.clusterData.length - 1
    );
  }
  IsStartVisible() {
    return (
      Math.floor(
        this.mtxMain.inverse().applyToPoint(this.clusterView.x, 0).x
      ) <= 0
    );
  }

  mergeMatrix() {
    var v = this.clusterView;
    if (this.data.clusterData.length < 12)
      this.mtx = this.mtx.reassignX(
        { x1: 0, x2: this.data.clusterData.length },
        { x1: v.x, x2: v.x + v.w }
      );
    else {
      var x = this.mtx.applyToPoint(this.data.clusterData.length, 0).x;
      this.mtx = this.mtx.getTranslate(v.x + v.w - x, 0);
    }

    /*

        if (('ShrinkY' in FPsettings) && FPsettings.ShrinkY && !!this.data.local.maxPrice) {
            this.getMinMaxIndex(matrix);
            var dp = (this.data.local.maxPrice - this.data.local.minPrice) / 10;
            matrix = matrix.reassignY({ y1: this.data.local.maxPrice + dp, y2: this.data.local.minPrice - dp }, { y1: v.y, y2: v.y + v.h });
        }*/
  }

  isWrongMerge(data: clusterData) {
    return (
      this.data.clusterData[this.data.clusterData.length - 1].x <
      data.clusterData[0].x
    );
  }

  mergeData(data: clusterData) {
    var IsVis = this.IsPriceVisible();
    var needMerge = this.data.mergeData(data);
    if (IsVis && needMerge) this.mergeMatrix();

    this.drawClusterView();
  }

  getBar(mtx: Matrix): Rectangle {
    var p1 = mtx.applyToPoint(0, 0);
    var p2 = mtx.applyToPoint(1, this.data.priceScale);
    return { x: 0, y: 0, w: p2.x - p1.x, h: p2.y - p1.y };
  }
  clusterRect(price: number, columnNumber: number, mtx: Matrix) {
    var p1 = mtx.applyToPoint(columnNumber, price - this.data.priceScale / 2);
    var p2 = mtx.applyToPoint(
      columnNumber + 1,
      price + this.data.priceScale / 2
    );
    return { x: p1.x, y: p1.y, w: p2.x - p1.x, h: p2.y - p1.y };
  }
  clusterRect2(price: number, columnNumber: number, w: number, mtx: Matrix) {
    var p1 = mtx.applyToPoint(columnNumber, price - this.data.priceScale / 2);
    var p2 = mtx.applyToPoint(
      columnNumber + w,
      price + this.data.priceScale / 2
    );
    return { x: p1.x, y: p1.y, w: p2.x - p1.x, h: p2.y - p1.y };
  }
  clusterFontSize(mtx: Matrix, textLen: number) {
    return this.clusterRectFontSize(this.clusterRect(0, 0, mtx), textLen);
  }
  clusterRectFontSize(rect: Rectangle, textLen: number) {
    var w = Math.abs(rect.w);
    var h = Math.abs(rect.h);
    return Math.min(h - 1, w / textLen, this.colorsService.maxFontSize());
  }
  getMinMaxIndex(mtx: Matrix) {
    var data = this.data.clusterData;
    this.minIndex = data.length - 1;
    this.maxIndex = 0;
    var finishPrice = mtx.Height2Price(this.clusterTotalView.y - 100);
    var startPrice = mtx.Height2Price(
      this.clusterTotalView.y + this.clusterTotalView.h + 100
    );
    this.finishPrice =
      Math.floor(finishPrice / this.data.priceScale) * this.data.priceScale;
    this.startPrice =
      Math.floor(startPrice / this.data.priceScale) * this.data.priceScale;
    for (var i = 0; i < data.length; i++) {
      var r = this.clusterRect(/*data[i].cl[0].p*/ 1, i, mtx);
      if (
        !(
          r.x + r.w < this.clusterView.x ||
          r.x > this.clusterView.x + this.clusterView.w
        )
      ) {
        this.minIndex = Math.min(this.minIndex, i);
        this.maxIndex = Math.max(this.maxIndex, i);
      }
    }
    if (this.FPsettings.ShrinkY)
      this.data.maxFromPeriod(this.minIndex, this.maxIndex);
  }

  getInitMatrix(view: Rectangle, data: clusterData) {
    var len = Math.floor(view.w / 10);
    var len2 = Math.floor(view.w / 100);
    var firstCol = Math.max(
      data.clusterData.length -
        (this.FPsettings.CompressToCandles == 'Always' ||
        this.FPsettings.CandlesOnly
          ? len
          : len2),
      0
    );
    var h = view.h / 30;
    var to = [
      view.x,
      view.y,
      view.x,
      view.y + view.h,
      view.x + view.w,
      view.y + view.h / 2,
    ];
    var from = [
      firstCol,
      data.lastPrice + data.priceScale * h,
      firstCol,
      data.lastPrice - data.priceScale * h,
      data.clusterData.length,
      data.lastPrice,
    ];
    return this.alignMatrix(Matrix.fromTriangles(from, to));
  }

  hiddenTotal() {
    return this.FPsettings.totalMode == 'Hidden' && this.data.ableCluster();
  }

  genViews() {
    const canvas: HTMLCanvasElement | null = this.canvasRef?.nativeElement;

    if (canvas == null || canvas.parentElement == undefined) return;

    let FPsettings = this.FPsettings;

    var newTotal = FPsettings.totalMode == 'Under' || !this.data.ableCluster();
    var hidden = this.hiddenTotal();
    var totalLen = hidden ? 0 : FPsettings.VolumesHeight[4];
    let GraphTopSpace = FPsettings.Head
      ? this.topLinesCount() * 20 * this.colorsService.sscale()
      : 0;
    var CanvasWidth = canvas.width;
    var CanvasHeight = canvas.height;
    var VolumesH = /*FPsettings.VolumesHeight +*/ [
      this.DeltaVolumes[0],
      this.DeltaVolumes[1],
      this.DeltaVolumes[2],
      this.DeltaVolumes[3],
      this.DeltaVolumes[5],
    ];

    if (FPsettings.SeparateVolume) {
      VolumesH[0] += FPsettings.VolumesHeight[0];
    }

    if (this.data.ableOI() && FPsettings.OI) {
      VolumesH[1] += FPsettings.VolumesHeight[1];
    }

    if (FPsettings.Delta) {
      VolumesH[2] += FPsettings.VolumesHeight[2];
    }

    if (FPsettings.DeltaBars) {
      VolumesH[4] += FPsettings.VolumesHeight[5];
    }

    if (this.data.ableOI() && FPsettings.OIDelta) {
      VolumesH[3] += FPsettings.VolumesHeight[3];
    }

    var totalVH =
      VolumesH[0] + VolumesH[1] + VolumesH[2] + VolumesH[3] + VolumesH[4];

    this.clusterView = new Rectangle(
      totalLen + this.DeltaVolumes[4],
      GraphTopSpace,
      CanvasWidth -
        this.colorsService.LegendPriceWidth() -
        totalLen -
        this.DeltaVolumes[4],
      CanvasHeight -
        this.colorsService.LegendDateHeight() -
        GraphTopSpace -
        totalVH
    );
    debugger
    if (newTotal) {
      this.clusterView.x = 0;
      this.clusterView.w = CanvasWidth - this.colorsService.LegendPriceWidth();
    }
    let GraphValuesHeight = Math.abs(this.clusterView.h / 7);
    this.clusterHeadView = {
      x: totalLen + this.DeltaVolumes[4],
      y: 0,
      w: this.clusterView.w,
      h: GraphTopSpace,
    };
    if (newTotal) {
      this.clusterHeadView = {
        x: 0,
        y: 0,
        w: this.clusterView.w,
        h: GraphTopSpace,
      };
    }
    this.clusterVolumesView = { ...this.clusterView };
    this.clusterVolumesView.y += this.clusterVolumesView.h - GraphValuesHeight;
    this.clusterVolumesView.h = GraphValuesHeight;
    this.clusterTotalView = {
      x: 0,
      y: GraphTopSpace,
      w: totalLen + this.DeltaVolumes[4] - ColorsService.ScrollWidth,
      h: this.clusterView.h,
    };
    this.clusterTotalViewFill = {
      x: 0,
      y: GraphTopSpace,
      w: totalLen + this.DeltaVolumes[4],
      h: this.clusterView.h,
    };
    this.clusterPricesView = {
      x: this.clusterView.w + this.clusterView.x,
      w: CanvasWidth - (this.clusterView.w + this.clusterView.x),
      y: this.clusterTotalView.y,
      h: this.clusterTotalView.h,
    };
    this.clusterDatesView = {
      x: this.clusterView.x,
      w: this.clusterView.w,
      y: this.clusterView.y + this.clusterView.h,
      h: CanvasHeight - (this.clusterView.y + this.clusterView.h) - totalVH,
    };
    this.clusterAnimArea = {
      x: this.clusterHeadView.w + this.clusterHeadView.x,
      y: this.clusterHeadView.y,
      h: this.clusterHeadView.h,
      w: this.clusterPricesView.w,
    };

    if (FPsettings.SeparateVolume)
      this.clusterVolumesView = {
        x: this.clusterView.x,
        y: this.clusterDatesView.y + this.clusterDatesView.h,
        w: this.clusterView.w,
        h: VolumesH[0],
      };

    if (FPsettings.SeparateVolume)
      this.clusterOIView = {
        x: this.clusterView.x,
        y: this.clusterVolumesView.y + this.clusterVolumesView.h,
        w: this.clusterView.w,
        h: VolumesH[1],
      };
    else
      this.clusterOIView = {
        x: this.clusterView.x,
        y: this.clusterDatesView.y + this.clusterDatesView.h,
        w: this.clusterView.w,
        h: VolumesH[1],
      };

    this.clusterDeltaView = {
      x: this.clusterView.x,
      y: this.clusterOIView.y + this.clusterOIView.h,
      w: this.clusterView.w,
      h: VolumesH[2],
    };

    this.clusterDeltaBarsView = {
      x: this.clusterView.x,
      y: this.clusterDeltaView.y + this.clusterDeltaView.h,
      w: this.clusterView.w,
      h: VolumesH[4],
    };

    this.clusterOIDeltaView = {
      x: this.clusterView.x,
      y: this.clusterDeltaBarsView.y + this.clusterDeltaBarsView.h,
      w: this.clusterView.w,
      h: VolumesH[3],
    };
  }
  initSize() {
    this.alignCanvas();
    this.genViews();
    this.mtx = this.getInitMatrix(this.clusterView, this.data);
    this.drawClusterView();
  }

  public resize() {
    var canvas = this.canvasRef?.nativeElement;
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = Math.max(
      220,
      window.innerHeight - canvas.getBoundingClientRect().top
    );
    canvas.style.height = canvas.height + 'px';
    canvas.style.width = canvas.width + 'px';

    var oldX = this.clusterView.x + this.clusterView.w;
    var oldY = this.clusterView.y + this.clusterView.h / 2;
    this.alignCanvas();
    this.genViews();
    var newX = this.clusterView.x + this.clusterView.w;
    var newY = this.clusterView.y + this.clusterView.h / 2;
    this.mtx = this.alignMatrix(
      this.mtx.getTranslate(newX - oldX, newY - oldY)
    );
    this.drawClusterView();
  }

  alignCanvas() {
    const canvas: HTMLCanvasElement | null = this.canvasRef?.nativeElement;

    if (canvas == null || canvas.parentElement == undefined) return;

    if (this.colorsService.isMobile2()) {
      var parent = canvas.parentElement?.getBoundingClientRect();
      if (parent !== undefined) {
        var w = Math.floor(parent.width);
        var h = Math.floor(window.innerHeight - parent.top) - 4;
        canvas.style.height = h + 'px';
        canvas.style.width = w + 'px';
        canvas.height = Math.floor(h * this.colorsService.scale());
        canvas.width = Math.floor(w * this.colorsService.scale());
      } else {
        canvas.width = canvas.parentElement?.clientWidth - 10;
        canvas.height = Math.max(
          220,
          window.innerHeight - canvas.getBoundingClientRect().top - 4
        );
      }
    }
  }
  alignMatrix(matrix: Matrix, alignprice = false) {
    var v = { ...this.clusterView };

    //var vis = Math.floor(matrix.inverse().applyToPoint(this.clusterView.x + this.clusterView.w, 0).x) >= this.data.clusterData.length - 1;
    if ('MaxTrades' in this.FPsettings && this.FPsettings.MaxTrades) {
      let del = (matrix.applyToPoint(1, 0).x - matrix.applyToPoint(0, 0).x) / 5;
      v.x += del;
      v.w -= del;
    }
    var x1 = matrix.applyToPoint(0, 0).x;
    var x2 = matrix.applyToPoint(this.data.clusterData.length, 0).x;
    var dp = (this.data.maxPrice - this.data.minPrice) / 10;
    var y1 = matrix.applyToPoint(0, this.data.maxPrice + dp).y;
    var y2 = matrix.applyToPoint(0, this.data.minPrice - dp).y;
    var deltaX = 0;
    var deltaY = 0;
    if (x2 - x1 < v.w)
      matrix = matrix.reassignX(
        { x1: 0, x2: this.data.clusterData.length },
        { x1: v.x, x2: v.x + v.w }
      );
    else {
      if (x1 > v.x) deltaX = v.x - x1;
      if (x2 < v.x + v.w) deltaX = v.x + v.w - x2;
    }
    if (y2 - y1 < v.h)
      matrix = matrix.reassignY(
        { y1: this.data.maxPrice + dp, y2: this.data.minPrice - dp },
        { y1: v.y, y2: v.y + v.h }
      );
    else {
      if (y1 > v.y) deltaY = v.y - y1;
      if (y2 < v.y + v.h) deltaY = v.y + v.h - y2;
    }
    if (deltaX != 0 || deltaY != 0)
      matrix = matrix.getTranslate(deltaX, deltaY);

    this.getMinMaxIndex(matrix);

    if (this.FPsettings.ShrinkY && !!this.data.local.maxPrice) {
      var dp = (this.data.local.maxPrice - this.data.local.minPrice) / 10;
      matrix = matrix.reassignY(
        {
          y1: this.data.local.maxPrice + dp,
          y2: this.data.local.minPrice - dp,
        },
        { y1: v.y, y2: v.y + v.h }
      );
    }

    try {
      if (alignprice && this.IsPriceVisible()) {
        var xx = matrix.applyToPoint(this.data.clusterData.length, 0).x;
        matrix = matrix.getTranslate(v.x + v.w - xx, 0);
      }
    } catch (e) {}
    // return;

    return matrix;
  }
  topLinesCount() {
    var x = (this.topVolumes() ? 1 : 0) + (this.oiEnable() ? 1 : 0) + 2;
    return x;
  }
  topVolumes() {
    return this.FPsettings.TopVolumes;
  }
  oiEnable() {
    return this.FPsettings.oiEnable && this.data.maxAbsOIDelta > 0;
  }
  drawClusterView() {
    const canvas: HTMLCanvasElement | null = this.canvasRef?.nativeElement;

    if (canvas == null || canvas.parentElement == undefined) return;
    const ctx: any = canvas?.getContext('2d');

    if (this.colorsService.isMobile2()) {
      var parent = canvas.parentElement?.getBoundingClientRect();
      if (parent !== undefined)
        //if(ctx===null)      return;

        ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      if (this.data.clusterLength() < 1) {
        ctx.font = 'bold 16px Verdana';
        ctx.fillStyle = 'Black';
        ctx.fillText('НЕТ ДАННЫХ', canvas.width * 0.5, 30);
        return;
      }
      this.mtxMain = this.mtx.clone();
      if (this.translateMatrix != null) {
        var t = this.translateMatrix.clone();
        t.multiply(this.mtxMain);
        this.mtxMain = this.alignMatrix(t);
      }
      var mtx = this.mtxMain;
      this.mtxtotal = mtx.reassignX(
        { x1: 0, x2: 1 },
        {
          x1: this.clusterTotalView.x,
          x2: this.clusterTotalView.x + this.clusterTotalView.w,
        }
      );
      this.mtxprice = mtx.reassignX(
        { x1: 0, x2: this.clusterPricesView.w },
        {
          x1: this.clusterPricesView.x,
          x2: this.clusterPricesView.x + this.clusterPricesView.w,
        }
      );
      if (this.FPsettings.Head) {
        this.mtxhead = mtx.reassignY(
          { y1: 0, y2: this.topLinesCount() },
          {
            y1: this.clusterHeadView.y,
            y2: this.clusterHeadView.y + this.clusterHeadView.h,
          }
        );
        this.mtxanim = this.mtxprice.reassignY(
          {
            y1: this.clusterAnimArea.y,
            y2: this.clusterAnimArea.y + this.clusterAnimArea.h,
          },
          {
            y1: this.clusterAnimArea.y,
            y2: this.clusterAnimArea.y + this.clusterAnimArea.h,
          }
        );
      }
      this.createParts();
      this.getMinMaxIndex(this.mtxMain);
      for (const view in this.views) this.views[view].drawCanvas();
    }
  }
}
