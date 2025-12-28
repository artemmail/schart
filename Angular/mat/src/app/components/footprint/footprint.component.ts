import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  Input,
} from '@angular/core';
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
import { SelectListItemNumber } from 'src/app/models/preserts';
import { FootprintUtilitiesService } from './footprint-utilities.service';
import { LevelMarksService } from 'src/app/service/FootPrint/LevelMarks/level-marks.service';
import { DialogService } from 'src/app/service/DialogService.service';
import { Router } from '@angular/router';
import { FootprintLayoutService } from './footprint-layout.service';
import { FootprintRealtimeUpdaterService } from './footprint-realtime-updater.service';
import { FootprintUpdateEvent } from './footprint-data.types';
import { FootprintStateService } from './footprint-state.service';
import { HintContainerService } from './hint-container.service';
import {
  FootprintRenderCommand,
  FootprintRenderer,
} from './footprint-render.types';

export type FootprintRendererCommand = 'ResizeAndRedraw';

@Component({
  standalone: false,
  selector: 'app-footprint',
  templateUrl: './footprint.component.html',
  styleUrls: ['./footprint.component.css'],
  providers: [FootprintStateService, HintContainerService],
})
export class FootPrintComponent
  implements AfterViewInit, FootprintRenderer
{
  @ViewChild('drawingCanvas', { static: false }) canvasRef?: ElementRef;
  @Input() presetIndex: number;
  @Input() set params(value: FootPrintParameters | null) {
    this.state.setParams(value ?? null);
    this.initializeViewIfReady();
  }
  get params(): FootPrintParameters | null {
    return this.state.snapshot.params;
  }
  @Input() minimode: boolean = false;
  @Input() deltamode: boolean = false;
  @Input() caption: string | null = null;
  @Input() postInit?: (component: FootPrintComponent) => void;

  private _canvas: HTMLCanvasElement | null = this.canvasRef?.nativeElement;
  private _ctx: CanvasRenderingContext2D | null = null;

  markupEnabled: boolean;
  markupManager: MarkUpManager;
  clusterWidthScale: number = 0.97;

  views: Array<canvasPart> = new Array();

  get data(): ClusterData | null {
    return this.state.snapshot.data;
  }

  private set data(value: ClusterData | null) {
    this.state.setData(value);
  }

  get hiddenHint(): boolean {
    return this.state.snapshot.hiddenHint;
  }
  set hiddenHint(hidden: boolean) {
    this.state.setHintHidden(hidden);
  }
  get selectedPrice(): number | null {
    return this.state.snapshot.selectedPrice;
  }
  set selectedPrice(price: number | null) {
    this.state.setSelectedPrice(price);
  }
  get selectedPrice1(): number | null {
    return this.state.snapshot.selectedPrice1;
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
    private footprintUtilities: FootprintUtilitiesService,
    public levelMarksService: LevelMarksService,
    public dialogService: DialogService,
    public router: Router,
    private footprintLayoutService: FootprintLayoutService,
    private state: FootprintStateService,
    private hintContainer: HintContainerService
  ) {
    // this.FPsettings = FPsettings;
    this.translateMatrix = null;
    this.markupEnabled = false;
  }

  get canvas(): HTMLCanvasElement | null {
    return this._canvas;
  }

  get ctx(): CanvasRenderingContext2D | null {
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
    this.hintContainer.show(content, position);
    this.hiddenHint = false;
  }

  get dragMode(): number | null {
    return this.state.snapshot.dragMode;
  }

  set dragMode(value: number | null) {
    this.state.setDragMode(value);
  }

  get FPsettings(): ChartSettings {
    return this.state.snapshot.settings;
  }

  set FPsettings(settings: ChartSettings) {
    this.state.setSettings(settings);
  }

  get deltaVolumes(): readonly number[] {
    return this.state.snapshot.deltaVolumes;
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

  mergeMatrix() {
    const v = this.viewsManager.clusterView;
    if (this.data.clusterData.length < 12)
      this.viewsManager.mtx = this.viewsManager.mtx.reassignX(
        { x1: 0, x2: this.data.clusterData.length },
        { x1: v.x, x2: v.x + v.w }
      );
    else {
      const x = this.viewsManager.mtx.applyToPoint(
        this.data.clusterData.length,
        0
      ).x;
      this.viewsManager.mtx = this.viewsManager.mtx.getTranslate(
        v.x + v.w - x,
        0
      );
    }

    /*

        if (("ShrinkY" in FPsettings) && FPsettings.ShrinkY && !!this.data.local.maxPrice) {
            this.getMinMaxIndex(matrix);
            const dp = (this.data.local.maxPrice - this.data.local.minPrice) / 10;
            matrix = matrix.reassignY({ y1: this.data.local.maxPrice + dp, y2: this.data.local.minPrice - dp }, { y1: v.y, y2: v.y + v.h });
        }*/
  }

  getBar(mtx: Matrix): Rectangle {
    const p1 = mtx.applyToPoint(0, 0);
    const p2 = mtx.applyToPoint(1, this.data.priceScale);
    return { x: 0, y: 0, w: p2.x - p1.x, h: p2.y - p1.y };
  }
  clusterRect(price: number, columnNumber: number, mtx: Matrix) {
    const p1 = mtx.applyToPoint(columnNumber, price - this.data.priceScale / 2);
    const p2 = mtx.applyToPoint(
      columnNumber + 1,
      price + this.data.priceScale / 2
    );
    return { x: p1.x, y: p1.y, w: p2.x - p1.x, h: p2.y - p1.y };
  }
  clusterRect2(price: number, columnNumber: number, w: number, mtx: Matrix) {
    const p1 = mtx.applyToPoint(columnNumber, price - this.data.priceScale / 2);
    const p2 = mtx.applyToPoint(
      columnNumber + w,
      price + this.data.priceScale / 2
    );
    return { x: p1.x, y: p1.y, w: p2.x - p1.x, h: p2.y - p1.y };
  }
  clusterFontSize(mtx: Matrix, textLen: number) {
    return this.clusterRectFontSize(this.clusterRect(0, 0, mtx), textLen);
  }
  clusterRectFontSize(rect: Rectangle, textLen: number) {
    const w = Math.abs(rect.w);
    const h = Math.abs(rect.h);
    return Math.min(h - 1, w / textLen, this.colorsService.maxFontSize());
  }

  private get viewInitialized(): boolean {
    return this.state.snapshot.viewInitialized;
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
    for (let i = 0; i < data.length; i++) {
      const r = this.clusterRect(/*data[i].cl[0].p*/ 1, i, mtx);
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

  executeCommand(command: FootprintRendererCommand): void {
    switch (command) {
      case 'ResizeAndRedraw':
        this.resizeAndRedraw();
        break;
      default:
        break;
    }
  }

  private initSize() {
    if (!this.params) return;
    this.viewsManager.alignCanvas();
    this.viewsManager.updateLayout();
    if (!this.data || !this.viewsManager.layout) return;
    this.viewsManager.mtx = this.getInitMatrix(
      this.viewsManager.clusterView,
      this.data
    );
    this.viewsManager.drawClusterView();
    this.runPostInitialization();
  }

  drawClusterView() {
    this.viewsManager.drawClusterView();
  }

  private resizeLayout() {
    if (!this.viewInitialized || !this.viewsManager) {
      return;
    }
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
    // Инициализация canvas и менеджеров
    ColorsService.CanvasExt();
    const canvas: HTMLCanvasElement | null = this.canvasRef?.nativeElement;
    if (!canvas) return;
    this._canvas = canvas;
    this._ctx = canvas.getContext('2d');
    this.mouseAndTouchManager = new MouseAndTouchManager(this);
    this.viewsManager = new ViewsManager(this, this.footprintLayoutService);

    try {
      this.markupManager = new MarkUpManager(this.viewModel, this);
      this.markupEnabled = true;
    } catch (e) {
      console.log('markup error');
      this.markupEnabled = false;
    }
    this.markViewInitialized();
    this.initializeViewIfReady();
  }

  public applyDefaultPostInit(): void {
    if (!this.viewsManager?.mtx) {
      return;
    }

    this.viewsManager.mtx = this.alignMatrix(this.viewsManager.mtx);
    this.viewsManager.drawClusterView();
  }

  public runPostInitialization(): void {
    const postInitHandler = this.postInit ?? ((component: FootPrintComponent) => component.applyDefaultPostInit());

    postInitHandler(this);
  }

  bindRealtime(updater: FootprintRealtimeUpdaterService) {
    updater.bindCanvas(this.canvasRef ?? null);
  }

  applyParams(params: FootPrintParameters) {
    this.state.setParams(params);
    this.initializeViewIfReady();
  }

  applySettings(settings: ChartSettings) {
    this.FPsettings = settings;
    if (!this.viewInitialized || !this.data || !this.params) {
      return;
    }

    this.executeCommand('ResizeAndRedraw');
  }

  applyData(clusterData: ClusterData) {
    const isNewDataInstance = this.data !== clusterData;
    this.data = clusterData;
    this.hintContainer.ensureHintElement();
    if (!this.viewInitialized || !this.params || !isNewDataInstance) {
      return;
    }

    this.executeCommand('ResizeAndRedraw');
  }

  private initializeViewIfReady(): void {
    if (!this.viewInitialized || !this.data || !this.params) {
      return;
    }

    this.executeCommand('ResizeAndRedraw');
  }

  applyRenderCommand(command: FootprintRenderCommand): void {
    switch (command.type) {
      case 'snapshot':
        this.applyParams(command.snapshot.params);
        this.applySettings(command.snapshot.settings);
        this.applyData(command.snapshot.data);
        break;
      case 'delta':
        this.handleRealtimeUpdate(command.delta);
        break;
      case 'settings':
        this.applySettings(command.settings);
        if (command.params) {
          this.applyParams(command.params);
        }
        break;
    }
  }

  handleRealtimeUpdate(update: FootprintUpdateEvent) {
    if (!this.data || !this.viewsManager) {
      return;
    }

    const isVisible = this.isPriceVisible();
    if (update.type !== 'ladder' && isVisible && update.merged) {
      this.mergeMatrix();
    }

    this.viewsManager.drawClusterView();
  }

  private resizeAndRedraw(): void {
    if (!this.viewInitialized) {
      return;
    }

    this.initSize();
    this.resizeLayout();
    this.viewsManager.drawClusterView();
  }

}
