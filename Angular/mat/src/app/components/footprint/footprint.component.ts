import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  HostListener,
  input,
  Input,
  NgZone,
} from '@angular/core';
import { Matrix, Rectangle } from './matrix';

import { ChartSettings } from 'src/app/models/ChartSettings';
import { ColorsService } from 'src/app/service/FootPrint/Colors/color.service';
import { FormattingService } from 'src/app/service/FootPrint/Formating/formatting.service';
import { LevelMarksService } from 'src/app/service/FootPrint/LevelMarks/level-marks.service';
import { ClusterStreamService } from 'src/app/service/FootPrint/ClusterStream/cluster-stream.service'; //  /ClusterStream/cluster-stream.service';
import { ClusterData } from './clusterData';
import { canvasPart } from './parts/canvasPart';
import { FootPrintParameters } from 'src/app/models/Params';
import { ColumnEx } from 'src/app/models/Column';
import { SignalRService } from 'src/app/service/FootPrint/signalr.service';
import { Params, Router } from '@angular/router';
import { MarkUpManager } from './Markup/Manager';
import { ProfileModel } from 'src/app/models/profileModel';
import { MouseAndTouchManager } from './MouseAnTouchManager';
import { ViewsManager } from './ViewsManager';
import { saveAs } from 'file-saver';
import { DialogService } from 'src/app/service/DialogService.service';
import { ChartSettingsService } from 'src/app/service/chart-settings.service';
import { SelectListItemNumber } from 'src/app/models/preserts';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-footprint',
  templateUrl: './footprint.component.html',
  styleUrls: ['./footprint.component.css'],
  providers: [SignalRService],
})
export class FootPrintComponent implements AfterViewInit {
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
  private visibilityObserver: IntersectionObserver;
  private isVisible: boolean = false;
  private isSubscribed: boolean = false;
  private initializationStarted = false;

  
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
    // private route: ActivatedRoute,
    public settingsService: ChartSettingsService,
    public colorsService: ColorsService,
    public formatService: FormattingService,
    public levelMarksService: LevelMarksService,
    public clusterStreamService: ClusterStreamService,
    public signalRService: SignalRService,
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
    // Проверка периода для тикового графика
    if (this.params.period === 0) {
      alert('Невозможно скачать тиковый график. Есть возможность купить базу данных всех сделок');
      return;
    }
  
    // Подтверждение сохранения файла в формате CSV
    const userConfirmed = confirm('Сохранить свечи в формате CSV (Можно использовать в Excel)?');
    if (!userConfirmed) {
      return;
    }
  
    // Создание заголовка для CSV файла
    let csvContent = 'Date;Opn;High;Low;Close;Volume;BidVolume;Quantity;';
    if (this.data.clusterData.length > 0 && this.data.clusterData[0].oi > 0) {
      csvContent += 'OpenPositions;';
    }
    csvContent += '\n';
  
    // Формирование данных для CSV файла
    this.data.clusterData.forEach(candle => {
      const row = [
        this.formatService.jDateToStr(candle.x),
        candle.o,
        candle.h,
        candle.l,
        candle.c,
        candle.v,
        candle.bv,
        candle.q
      ];
      if (candle.oi != 0) {
        row.push(candle.oi);
      }
      csvContent += row.join(';') + '\n';
    });
  
    // Сохранение CSV файла
    const blob = new Blob([csvContent], { type: 'text/plain;charset=' + document.characterSet });
    const filename = `${this.params.ticker}_${this.formatService.jDateToStrD(this.params.startDate)}-${this.formatService.jDateToStrD(this.params.endDate)}_${this.params.period}.csv`;
    saveAs(blob, filename);
  }
  
  presetItems: SelectListItemNumber[] = [];

  reloadPresets() {
    this.settingsService.getPresets().subscribe((x) => (this.presetItems = x));
  }

  async reloadPresetsAsync() {
    this.presetItems = await this.settingsService.getPresets().toPromise();      
  }



  public ReLoad() {
    this.params.candlesOnly = this.FPsettings.CandlesOnly;
    this.ServerRequest(this.params);
  }

  public ServerRequest(x: FootPrintParameters): void {
    this.params = x;
    // this.params.candlesOnly = this.FPsettings.CandlesOnly;

    this.levelMarksService.load(this.params);
    this.clusterStreamService.GetRange(this.params).subscribe({
      next: (rangeData) => {
        this.inited = true;
        this.signalRService.unsubscr();
        this.loadData(rangeData);
        this.addhint();
        this.initSize();
        this.resize();
        


    // Проверка условия: если endDate заполнено и оно меньше текущей даты, 
        // либо startDate или endDate не имеет время "00:00"
         // Функция для сравнения только дат (без времени)
         const compareDatesIgnoringTime = (date1: Date, date2: Date): boolean => {
          const d1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
          const d2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
          return d1 < d2;
        };

        // Проверка: endDate заполнено и меньше текущей даты (без учета времени)
        const now = new Date();
        const isEndDateInPast = this.params.endDate && compareDatesIgnoringTime(new Date(this.params.endDate), now);

        // Проверка на то, что время в startDate или endDate не 00:00
        const isInvalidTime = (date: any) => date && (new Date(date).getHours() !== 0 || new Date(date).getMinutes() !== 0);

        // Инвертируем условие, если endDate не в прошлом и время в датах равно 00:00
        if (!isEndDateInPast && !isInvalidTime(this.params.startDate) && !isInvalidTime(this.params.endDate)) {
          // Если все условия выполнены, выполняем подписку
          this.signalRService.Subscribe({
            ticker: this.params.ticker,
            period: this.params.period,
            step: this.params.priceStep,
          });
        } else {
          console.log('Подписка пропущена: условия не выполнены.');
        }
        
      },
      error: async (err: HttpErrorResponse) =>  {
        
        if (err instanceof HttpErrorResponse) {
          await this.dialogService.info_async(err.error);
        }
        else
          await this.dialogService.info_async(err);
        // Обработка ошибки
        console.error('Ошибка при выполнении запроса к серверу', err);
      },
    });
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

    // Инициализируем наблюдатель за видимостью
    this.initVisibilityObserver();

    // Начинаем инициализацию независимо от видимости
    if (!this.initializationStarted) {
      this.initializationStarted = true;
      this.asyncInit();
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

    if (this.canvasRef?.nativeElement) {
      this.visibilityObserver.observe(this.canvasRef.nativeElement);
    }
  }

  private async handleComponentVisible() {
    console.log('Компонент стал видимым');
    if (!this.isSubscribed) {
      try {
        await this.signalRService.startConnection(this);
        await this.signalRService.Subscribe({
          ticker: this.params.ticker,
          period: this.params.period,
          step: this.params.priceStep,
        });
        this.isSubscribed = true;
      } catch (err) {
        console.error('Ошибка при повторном подключении к SignalRService', err);
      }
    }
  }

  private async handleComponentHidden() {
    console.log('Компонент стал невидимым');
    // Отписываемся от сервиса и останавливаем подключение
    try {
      await this.signalRService.unsubscr();
      await this.signalRService.stopConnection();
    } catch (err) {
      console.error('Ошибка при отписке или остановке SignalRService', err);
    }
    this.isSubscribed = false;
  }

  async asyncInit() {
    // Загрузка пресетов и настроек
    this.presetItems = await this.settingsService.getPresets().toPromise();
    if (!this.presetIndex) {
      this.presetIndex = this.presetItems[0].Value;
    }

    let settings = ChartSettingsService.miniSettings();

    if (!this.minimode) {
      settings = await this.settingsService
        .getChartSettings(this.presetIndex)
        .toPromise();
    }
    else
    {
      settings.DeltaGraph = this.deltamode;
    }

    this.FPsettings = settings;
    this.params.candlesOnly = this.FPsettings.CandlesOnly;
    this.levelMarksService.load(this.params);

    let rangeData: any;

    try {
      rangeData = await this.clusterStreamService
        .GetRange(this.params)
        .toPromise();
    } catch (err) {
      console.error('Ошибка при выполнении запроса к серверу', err);
      if (err instanceof HttpErrorResponse) {
        await this.dialogService.info_async(err.error);
      } else {
        await this.dialogService.info_async(err);
      }
      return;
    }

    this.inited = true;

    this.loadData(rangeData);
    this.addhint();
    this.initSize();
    this.resize();

    // Не подписываемся, если компонент не виден
    if (this.isVisible && !this.isSubscribed) {
      try {
        await this.signalRService.startConnection(this);
        await this.signalRService.Subscribe({
          ticker: this.params.ticker,
          period: this.params.period,
          step: this.params.priceStep,
        });
        this.isSubscribed = true;
      } catch (err) {
        console.error('Ошибка при подписке к SignalRService', err);
      }
    }
  }

  /*
  ngOnDestroy() {
    this.signalRService.unsubscr();
    this.signalRService.stopConnection(); // Останавливаем подключение
    if (this.visibilityObserver && this.canvasRef?.nativeElement) {
      this.visibilityObserver.unobserve(this.canvasRef.nativeElement);
    }
  }*/

}
