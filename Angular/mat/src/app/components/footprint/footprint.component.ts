import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  HostListener,
  input,
  Input,
  NgZone,
} from '@angular/core';
import { Matrix, Rectangle } from './matrix';

import { ChartSettings } from 'src/app/models/ChartSettings';
import { ColorsService } from 'src/app/service/FootPrint/Colors/color.service';
import { FormattingService } from 'src/app/service/FootPrint/Formating/formatting.service';
import { ClusterData } from './clusterData';
import { canvasPart } from './parts/canvasPart';
import { FootPrintParameters } from 'src/app/models/Params';
import { ColumnEx } from 'src/app/models/Column';
import { SignalRService } from 'src/app/service/FootPrint/signalr.service';
import { MarkUpManager } from './Markup/Manager';
import { ProfileModel } from 'src/app/models/profileModel';
import { MouseAndTouchManager } from './MouseAnTouchManager';
import { ViewsManager } from './ViewsManager';
import { ChartSettingsService } from 'src/app/service/chart-settings.service';
import { SelectListItemNumber } from 'src/app/models/preserts';
import { FootprintDataService } from './footprint-data.service';
import { FootprintUtilitiesService } from './footprint-utilities.service';
import { Subscription } from 'rxjs';
import { LevelMarksService } from 'src/app/service/FootPrint/LevelMarks/level-marks.service';
import { DialogService } from 'src/app/service/DialogService.service';
import { Router } from '@angular/router';

@Component({
  standalone: false,
  selector: 'app-footprint',
  templateUrl: './footprint.component.html',
  styleUrls: ['./footprint.component.css'],
  providers: [SignalRService, FootprintDataService, FootprintUtilitiesService],
})
export class FootPrintComponent implements AfterViewInit, OnDestroy {
  @ViewChild('drawingCanvas', { static: false }) canvasRef?: ElementRef;
  @Input() presetIndex: number;
  @Input() params: FootPrintParameters;
  @Input() minimode: boolean = false;
  @Input() deltamode: boolean = false;
  @Input() caption: string | null = null;

  public canvas: HTMLCanvasElement | null = this.canvasRef?.nativeElement;
  public ctx: any;

  DeltaVolumes: Array<number> = [0, 0, 0, 0, 0, 0, 0, 0];
  hiddenHint: boolean;
  selectedPrice: number| null ;
  selectedPrice1: number| null;
  hint: any;

  markupEnabled: boolean;
  markupManager: MarkUpManager;
  clusterWidthScale: number = 0.97;
  data: ClusterData | any = null;

  views: Array<canvasPart> = new Array();
  private subscriptions: Subscription[] = [];

  
  movedView: canvasPart | null = null;

  translateMatrix: Matrix | null = null;

  minIndex: number = 0;
  maxIndex: number = 0;

  finishPrice: number = 0;
  startPrice: number = 0;
  inited = false;

  viewModel: ProfileModel = {
    profilePeriod: -1,
    color: '#F08080',
    width: 3,
    font: 36,
    elementid: '',
    text: 'Some comment',
    arrow: false,
    total: true,
    dockable: true,
    mode: 'Edit',
    visible: {
      toolbar: true,
      color: false,
      width: false,
      font: false,
      id: false,
      text: false,
      arrow: false,
      profile: false,
    },
  };
  viewsManager: ViewsManager;
  mouseAndTouchManager: MouseAndTouchManager;
  manager: MarkUpManager;

  constructor(
    public colorsService: ColorsService,
    public formatService: FormattingService,
    private footprintDataService: FootprintDataService,
    private footprintUtilities: FootprintUtilitiesService,
    public levelMarksService: LevelMarksService,
    public dialogService: DialogService,
    public router: Router
  ) {
    // this.FPsettings = FPsettings;
    this.translateMatrix = null;
    this.hiddenHint = true;
    this.markupEnabled = false;

    // this.ColorsService =

    const canvas: HTMLCanvasElement | null = this.canvasRef?.nativeElement;
    if (!canvas) return;

    //this.calcPrices();
  }

  GetCSV() {
    if (this.data) {
      this.footprintUtilities.exportCsv(this.params, this.data);
    }
  }

  presetItems: SelectListItemNumber[] = [];

  reloadPresets() {
    this.footprintUtilities
      .loadPresets()
      .then((x) => (this.presetItems = x));
  }

  async reloadPresetsAsync() {
    this.presetItems = await this.footprintUtilities.loadPresets();
  }



  public ReLoad() {
    this.params.candlesOnly = this.FPsettings.CandlesOnly;
    this.footprintDataService.reload(this.params);
  }

  public async ServerRequest(params: FootPrintParameters): Promise<void> {
    this.params = params;
    await this.footprintDataService.reload(params);
  }

  public handleCluster(answ: any) {
    var IsVis = this.IsPriceVisible();
    var needMerge = this.data.handleCluster(answ);
    if (IsVis && needMerge) this.mergeMatrix();
    this.viewsManager.drawClusterView();
  }

  public handleTicks(answ: any) {
    var IsVis = this.IsPriceVisible();
    var needMerge = this.data.handleTicks(answ);
    if (IsVis && needMerge) this.mergeMatrix();
    this.viewsManager.drawClusterView();
  }

  public handleLadder(ladder: any) {
    this.data.handleLadder(ladder);
    this.viewsManager.drawClusterView();
  }

  selectedCoumn: ColumnEx | any;

  public loadData(initdata: any) {
    this.data = new ClusterData(initdata);
  }

  onDataInitialized() {
    this.inited = true;
  }

  hideHint() {
    this.hiddenHint = true;
    this.selectedPrice = null;
    this.selectedPrice1 = null;
    this.hint.style.overflow = 'hidden';
    this.hint.style.display = 'none';
  }

  dragMode: number | null = null;

  addhint() {
    if (document.getElementById('hint') == null) {
      var element = document.createElement('div');
      element.id = 'hint';
      document.body.appendChild(element);
      //         this.canvas.parentNode.appendChild(element);
    }
    this.hint = document.getElementById('hint');
  }

  public FPsettings: ChartSettings = ChartSettingsService.DefaultSettings();

  IsPriceVisible() {
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
  IsStartVisible() {
    return (
      Math.floor(
        this.viewsManager.mtxMain
          .inverse()
          .applyToPoint(this.viewsManager.clusterView.x, 0).x
      ) <= 0
    );
  }

  mergeMatrix() {
    var v = this.viewsManager.clusterView;
    if (this.data.clusterData.length < 12)
      this.viewsManager.mtx = this.viewsManager.mtx.reassignX(
        { x1: 0, x2: this.data.clusterData.length },
        { x1: v.x, x2: v.x + v.w }
      );
    else {
      var x = this.viewsManager.mtx.applyToPoint(
        this.data.clusterData.length,
        0
      ).x;
      this.viewsManager.mtx = this.viewsManager.mtx.getTranslate(
        v.x + v.w - x,
        0
      );
    }

    /*

        if (('ShrinkY' in FPsettings) && FPsettings.ShrinkY && !!this.data.local.maxPrice) {
            this.getMinMaxIndex(matrix);
            var dp = (this.data.local.maxPrice - this.data.local.minPrice) / 10;
            matrix = matrix.reassignY({ y1: this.data.local.maxPrice + dp, y2: this.data.local.minPrice - dp }, { y1: v.y, y2: v.y + v.h });
        }*/
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
    var finishPrice = mtx.Height2Price(
      this.viewsManager.clusterTotalView.y - 100
    );
    var startPrice = mtx.Height2Price(
      this.viewsManager.clusterTotalView.y +
        this.viewsManager.clusterTotalView.h +
        100
    );
    this.finishPrice =
      Math.floor(finishPrice / this.data.priceScale) * this.data.priceScale;
    this.startPrice =
      Math.floor(startPrice / this.data.priceScale) * this.data.priceScale;
    for (var i = 0; i < data.length; i++) {
      var r = this.clusterRect(/*data[i].cl[0].p*/ 1, i, mtx);
      if (
        !(
          r.x + r.w < this.viewsManager.clusterView.x ||
          r.x >
            this.viewsManager.clusterView.x + this.viewsManager.clusterView.w
        )
      ) {
        this.minIndex = Math.min(this.minIndex, i);
        this.maxIndex = Math.max(this.maxIndex, i);
      }
    }
    if (this.FPsettings.ShrinkY)
      this.data.maxFromPeriod(this.minIndex, this.maxIndex);
  }

  getInitMatrix(view: Rectangle, data: ClusterData) {
    var len = Math.floor(view.w / 10);
    var len2 = Math.floor(view.w / 100);
    var firstCol = Math.max(
      data.clusterData.length -
        (this.FPsettings.CompressToCandles == 'Always' ||
        this.params.candlesOnly
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

  initSize() {
    this.viewsManager.alignCanvas();
    this.viewsManager.genViews();
    this.viewsManager.mtx = this.getInitMatrix(
      this.viewsManager.clusterView,
      this.data
    );
    this.viewsManager.drawClusterView();
  }

  drawClusterView() {
    this.viewsManager.drawClusterView();
  }

  @HostListener('window:resize', ['$event'])
  public resize() {
    this.viewsManager.resize();
  }

  alignMatrix(matrix: Matrix, alignprice = false) {
    var v = { ...this.viewsManager.clusterView };

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




  // ... остальной код компонента

  ngAfterViewInit() {
    // Инициализация canvas и менеджеров
    ColorsService.CanvasExt();
    const canvas: HTMLCanvasElement | null = this.canvasRef?.nativeElement;
    if (!canvas) return;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.mouseAndTouchManager = new MouseAndTouchManager(this);
    this.viewsManager = new ViewsManager(this);

    try {
      this.markupManager = new MarkUpManager(this.viewModel, this);
      this.markupEnabled = true;
    } catch (e) {
      console.log('markup error');
      this.markupEnabled = false;
    }
    this.footprintDataService.bindComponent(this, this.canvasRef ?? null);

    this.subscriptions.push(
      this.footprintDataService.data$.subscribe((clusterData) => {
        this.data = clusterData;
        this.inited = true;
        this.addhint();
        this.initSize();
        this.resize();
      }),
      this.footprintDataService.settings$.subscribe((settings) => {
        if (settings) {
          this.FPsettings = settings;
        }
      }),
      this.footprintDataService.params$.subscribe((params) => {
        if (params) {
          this.params = params;
        }
      }),
      this.footprintDataService.presets$.subscribe((items) => {
        this.presetItems = items;
      })
    );

    this.footprintDataService.initialize(this.params, this.presetIndex, {
      minimode: this.minimode,
      deltamode: this.deltamode,
    });
  }

  ngOnDestroy() {
    this.subscriptions.forEach((subscription) => subscription.unsubscribe());
    this.footprintDataService.ngOnDestroy();
  }

}
