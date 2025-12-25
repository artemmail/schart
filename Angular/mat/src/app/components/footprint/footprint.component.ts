import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnChanges,
  OnDestroy,
  HostListener,
  DestroyRef,
  input,
  Input,
  NgZone,
  SimpleChanges,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Matrix, Rectangle } from './matrix';

import { ChartSettings } from 'src/app/models/ChartSettings';
import { ColorsService } from 'src/app/service/FootPrint/Colors/color.service';
import { FormattingService } from 'src/app/service/FootPrint/Formating/formatting.service';
import { ClusterData } from './clusterData';
import { canvasPart } from './parts/canvasPart';
import { FootPrintParameters } from 'src/app/models/Params';
import { ColumnEx } from 'src/app/models/Column';
import { MarkUpManager } from './Markup/Manager';
import { ProfileModel } from 'src/app/models/profileModel';
import { MouseAndTouchManager } from './MouseAnTouchManager';
import { ViewsManager } from './ViewsManager';
import { ChartSettingsService } from 'src/app/service/chart-settings.service';
import { SelectListItemNumber } from 'src/app/models/preserts';
import { FootprintDataService } from './footprint-data.service';
import { SignalRService } from 'src/app/service/FootPrint/signalr.service';
import { FootprintUtilitiesService } from './footprint-utilities.service';
import { LevelMarksService } from 'src/app/service/FootPrint/LevelMarks/level-marks.service';
import { DialogService } from 'src/app/service/DialogService.service';
import { Router } from '@angular/router';
import { FootprintLayoutService } from './footprint-layout.service';

interface TickData {
  number: number;
  tradeDate: string | Date;
  price: number;
  quantity: number;
  direction: number;
  volume: number;
  oi: number;
}

type LadderData = Record<string, number>;

interface ClusterInitData {
  clusterData: ColumnEx[];
  priceScale: number;
  VolumePerQuantity?: number;
}

@Component({
  standalone: false,
  selector: 'app-footprint',
  templateUrl: './footprint.component.html',
  styleUrls: ['./footprint.component.css'],
  providers: [FootprintDataService, SignalRService],
})
export class FootPrintComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('drawingCanvas', { static: false }) canvasRef?: ElementRef;
  @Input() presetIndex: number;
  @Input() params: FootPrintParameters;
  @Input() minimode: boolean = false;
  @Input() deltamode: boolean = false;
  @Input() caption: string | null = null;

  public canvas: HTMLCanvasElement | null = this.canvasRef?.nativeElement;
  public ctx: CanvasRenderingContext2D | null = null;

  DeltaVolumes: Array<number> = [0, 0, 0, 0, 0, 0, 0, 0];
  hiddenHint: boolean;
  selectedPrice: number | null;
  selectedPrice1: number | null;
  hint: HTMLDivElement | null = null;

  markupEnabled: boolean;
  markupManager: MarkUpManager;
  clusterWidthScale: number = 0.97;
  data: ClusterData | null = null;

  views: Array<canvasPart> = new Array();


  movedView: canvasPart | null = null;

  translateMatrix: Matrix | null = null;

  minIndex: number = 0;
  maxIndex: number = 0;

  finishPrice: number = 0;
  startPrice: number = 0;
  private viewInitialized = false;

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
    public router: Router,
    private footprintLayoutService: FootprintLayoutService,
    private destroyRef: DestroyRef
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

  getCsv() {
    if (!this.params || !this.data) {
      return;
    }

    this.footprintUtilities.exportCsv(this.params, this.data);
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



  public reload() {
    if (!this.params) {
      return;
    }

    this.params.candlesOnly = this.FPsettings.CandlesOnly;
    this.footprintDataService.reload(this.params);
  }

  public async serverRequest(params: FootPrintParameters): Promise<void> {
    this.params = params;
    await this.footprintDataService.reload(params);
  }

  public handleCluster(answ: ColumnEx[]) {
    if (!this.data) return;
    const isVisible = this.isPriceVisible();
    const needMerge = this.data.handleCluster(answ);
    if (isVisible && needMerge) this.mergeMatrix();
    this.viewsManager.drawClusterView();
  }

  public handleTicks(answ: TickData[]) {
    if (!this.data) return;
    const isVisible = this.isPriceVisible();
    const needMerge = this.data.handleTicks(answ);
    if (isVisible && needMerge) this.mergeMatrix();
    this.viewsManager.drawClusterView();
  }

  public handleLadder(ladder: LadderData) {
    if (!this.data) return;
    this.data.handleLadder(ladder);
    this.viewsManager.drawClusterView();
  }

  selectedColumn: ColumnEx | null = null;

  public loadData(initdata: ClusterInitData) {
    this.data = new ClusterData(initdata);
  }

  hideHint() {
    this.hiddenHint = true;
    this.selectedPrice = null;
    this.selectedPrice1 = null;
    if (this.hint) {
      this.hint.style.overflow = 'hidden';
      this.hint.style.display = 'none';
    }
  }

  dragMode: number | null = null;

  addhint() {
    if (document.getElementById('hint') == null) {
      const element = document.createElement('div');
      element.id = 'hint';
      document.body.appendChild(element);
      //         this.canvas.parentNode.appendChild(element);
    }
    this.hint = document.getElementById('hint') as HTMLDivElement;
  }

  public FPsettings: ChartSettings = ChartSettingsService.DefaultSettings();

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
    if (!this.params) return;
    this.viewsManager.alignCanvas();
    this.viewsManager.updateLayout();
    if (!this.data || !this.viewsManager.layout) return;
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
    this.viewsManager = new ViewsManager(this, this.footprintLayoutService);

    try {
      this.markupManager = new MarkUpManager(this.viewModel, this);
      this.markupEnabled = true;
    } catch (e) {
      console.log('markup error');
      this.markupEnabled = false;
    }
    this.footprintDataService.bindComponent(this, this.canvasRef ?? null);

    this.footprintDataService.data$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((clusterData) => {
        this.data = clusterData;
        this.addhint();
        if (this.params) {
          this.initSize();
          this.resize();
        }
      });
    this.footprintDataService.settings$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((settings) => {
        if (settings) {
          this.FPsettings = settings;
          if (this.data && this.params) {
            this.initSize();
            this.resize();
          }
        }
      });
    this.footprintDataService.params$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        if (params) {
          this.params = params;
          if (this.data) {
            this.initSize();
          }
        }
      });
    this.footprintDataService.presets$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((items) => {
        this.presetItems = items;
      });

    this.viewInitialized = true;
    this.initializeDataFlow();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.viewInitialized) {
      return;
    }

    if (changes['params'] || changes['presetIndex'] || changes['minimode'] || changes['deltamode']) {
      this.initializeDataFlow();
    }
  }

  ngOnDestroy() {
    this.footprintDataService.destroy();
  }

  private initializeDataFlow() {
    if (!this.params && this.presetIndex == null) {
      return;
    }

    this.footprintDataService.initialize(this.params, this.presetIndex, {
      minimode: this.minimode,
      deltamode: this.deltamode,
    });
  }

}
