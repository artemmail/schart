import { FootPrintComponent } from '../components/footprint/footprint.component';
import { canvasPart } from '../views/canvas-part';
import { viewMiniHead } from '../views/view-mini-head';
import { viewAnim } from '../views/view-anim';
import { viewDates } from '../views/view-dates';
import { viewPrices } from '../views/view-prices';
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
import { ColorsService } from 'src/app/service/FootPrint/Colors/color.service';
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

export class ViewsManager {
  footprint: FootPrintComponent;
  colorsService: ColorsService;
  data: ClusterData | any = null;

  constructor(
    footprint_: FootPrintComponent,
    private layoutService: FootprintLayoutService
  ) {
    this.footprint = footprint_;
    this.colorsService = footprint_.colorsService;
  }

  views: Array<canvasPart> = new Array();
  resizeable: Array<canvasPart | null> = [];
  viewMiniHead: viewMiniHead | null = null;
  viewMain: viewMain | null = null;
  viewBackground1: viewBackground1 | null = null;
  viewPrices: viewPrices | null = null;
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

  updateLayout() {
    const canvas: HTMLCanvasElement | null = this.footprint.canvas;
    const data = this.footprint.data;

    if (!canvas || !data) {
      return;
    }

    const layout = this.layoutService.calculateLayout({
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      deltaVolumes: this.footprint.deltaVolumes,
      minimode: this.footprint.minimode,
      settings: this.footprint.FPsettings,
      data,
      topLinesCount: this.footprint.topLinesCount(),
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

  getSettings(): ChartSettings
  {
       return this.data?.rangeSetLines??null == null? this.footprint.FPsettings :ChartSettingsService.miniSettings();
  }

 createParts() {
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
      this.footprint,
      this.clusterTotalViewFill,
      this.mtxMain
    );
    if (FPsettings.totalMode == 'Left' && this.data.ableCluster())
      this.views.push(this.viewBackground1);

    
    this.views.push(
      (this.viewBackground = new viewBackground(
        this.footprint,
        this.clusterView,
        this.mtxMain
      ))
    );

    if (!minimode)
      this.views.push(
        (this.viewDates = new viewDates(
          this.footprint,
          this.clusterDatesView,
          this.mtxMain
        ))
      );

      this.views.push(
        (this.viewPrices = new viewPrices(
          this.footprint,
          this.clusterPricesView,
          this.mtxprice
        ))
      );

    if (minimode)
      this.views.push(
        (this.viewMiniHead = new viewMiniHead(
          this.footprint,
          this.clusterMiniHeadView,
          this.mtx
        ))
      );

    if (FPsettings.Head) {
      this.views.push(
        (this.viewHead = new viewHead(
          this.footprint,
          this.clusterHeadView,
          this.mtxhead
        ))
      );
      this.views.push(
        (this.viewAnim = new viewAnim(
          this.footprint,
          this.clusterAnimArea,
          this.mtxanim
        ))
      );
    }

    this.views.push(
      (this.viewMain = new viewMain(
        this.footprint,
        this.clusterView,
        this.mtxMain
      ))
    );

    if (FPsettings.SeparateVolume)
      this.views.push(
        (this.viewVolumesSeparated = new viewVolumesSeparated(
          this.footprint,
          this.clusterVolumesView,
          this.mtxMain
        ))
      );
    else
      this.views.push(
        (this.viewVolumes = new viewVolumes(
          this.footprint,
          this.clusterVolumesView,
          this.mtxMain
        ))
      );

    //this.views.push(this.viewVolumes = new viewVolumes(this,  this.clusterVolumesView, this.mtxMain));
    this.viewTotal = new viewTotal(
      this.footprint,
      this.clusterTotalViewFill,
      this.mtxtotal
    );
    if (FPsettings.totalMode != 'Hidden' && this.data.ableCluster())
      this.views.push(this.viewTotal);
    this.views.push(
      (this.viewScrollBars = new viewScrollBars(
        this.footprint,
        this.clusterView,
        this.mtxMain
      ))
    );

    //  this.views.push(this.viewOI = new viewOI(this,  this.clusterBottomVolumes, this.mtxMain));

    if (this.data.ableOI() && FPsettings.OI) {
      this.views.push(
        (this.viewOI = new viewOI(
          this.footprint,
          this.clusterOIView,
          this.mtxMain
        ))
      );
    }

    if (this.data.ableOI() && FPsettings.OIDelta) {
      this.views.push(
        (this.viewOIDelta = new viewOIDelta(
          this.footprint,
          this.clusterOIDeltaView,
          this.mtxMain
        ))
      );
    }

    if (FPsettings.Delta) {
      this.views.push(
        (this.viewDelta = new viewDelta(
          this.footprint,
          this.clusterDeltaView,
          this.mtxMain
        ))
      );
    }

    if (FPsettings.DeltaBars) {
      this.views.push(
        (this.viewDeltaBars = new viewDeltaBars(
          this.footprint,
          this.clusterDeltaBarsView,
          this.mtxMain
        ))
      );
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
        this.footprint,
        this.clusterView,
        this.mtxMain
      ))
    );


            this.views.push(
      (this.viewRangeSet = new viewRangeSet(
        this.footprint,
        this.clusterView,
        this.mtxMain
      ))
    );



    if (!minimode)
      this.views.push(
        (this.viewDates = new viewDates(
          this.footprint,
          this.clusterDatesView,
          this.mtxMain
        ))
      );

      
      this.views.push(
        (this.viewPrices = new viewPrices(
          this.footprint,
          this.clusterPricesView,
          this.mtxprice
        ))
      );


    this.resizeable = [

//this.viewRangeSet
     // this.viewDeltaRangeSet 
    ];
  }

  drawClusterView() {
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

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (this.data.clusterLength() < 1) {
      ctx.font = 'bold 16px Verdana';
      ctx.fillStyle = 'Black';
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
    var canvas = this.footprint.canvasRef?.nativeElement;
    if (!canvas) return;

    let container: HTMLElement | null = canvas.parentElement;

    while (container) {
      const rect = container.getBoundingClientRect();
      if (rect.height > 0 && rect.width > 0) {
        break;
      }
      container = container.parentElement;
    }

    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const w = containerRect.width;
    const h = containerRect.height;

    // Получаем devicePixelRatio
    let ratio = window.devicePixelRatio; //|| 1;
    //ratio = 1;

    // Устанавливаем размеры canvas с учетом devicePixelRatio
    canvas.width = w * ratio;
    canvas.height = h * ratio;

    // Устанавливаем размеры стилей для canvas
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    // Сбрасываем трансформацию контекста и масштабируем
    const ctx = this.footprint.ctx;
   // ctx.setTransform(1, 0, 0, 1, 0, 0);  // сброс
    //ctx.scale(1, 1);
  }

  public resize() {
    if (!this.footprint.data) return;
  
    var canvas = this.footprint.canvasRef?.nativeElement;
    const container = canvas.parentNode.parentNode;
  
    if (canvas && container) {
      // Получаем размеры контейнера
      
      const containerRect = container.getBoundingClientRect();
      const w = containerRect.width;
      const h = containerRect.height;
  
      // Получаем devicePixelRatio
      let ratio = window.devicePixelRatio || 1;
      ratio = 1;
  
      // Устанавливаем размеры canvas с учетом devicePixelRatio
      canvas.width = w * ratio;
      canvas.height = h * ratio;
  
      // Устанавливаем размеры стилей для canvas
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
  
      // Сбрасываем трансформацию контекста и масштабируем
      const ctx = this.footprint.ctx;
      ctx.setTransform(1, 0, 0, 1, 0, 0);  // сброс
      ctx.scale(ratio, ratio);
  
      // Ваша логика для обновления и отрисовки контента
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
      this.drawClusterView();
    }
  }
  
  
}





