import { FootPrintComponent } from './footprint.component';
import { canvasPart } from './parts/canvasPart';
import { viewMiniHead } from './parts/viewMiniHead';
import { viewAnim } from './parts/viewAnim';
import { viewDates } from './parts/viewDates';
import { viewPrices } from './parts/viewPrices';
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
import { viewOI } from './parts/viewOI';
import { Rectangle } from 'src/app/models/Rectangle';
import { ColorsService } from 'src/app/service/FootPrint/Colors/color.service';
import { ClusterData } from './clusterData';
import { Matrix } from './matrix';

export class ViewsManager {
  footprint: FootPrintComponent;
  colorsService: ColorsService;
  data: ClusterData | any = null;

  constructor(footprint_: FootPrintComponent) {
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

  mtx: Matrix = new Matrix();
  mtxhead: Matrix = new Matrix();
  mtxtotal: Matrix = new Matrix();
  mtxprice: Matrix = new Matrix();
  mtxanim: Matrix = new Matrix();
  mtxMain: Matrix = new Matrix();

  genViews() {
    const canvas: HTMLCanvasElement | null = this.footprint.canvas;
    const DeltaVolumes: Array<number> = this.footprint.DeltaVolumes;
    const minimode: boolean = this.footprint.minimode;

    let FPsettings = this.footprint.FPsettings;

    var newTotal =
      FPsettings.totalMode == 'Under' || !this.footprint.data.ableCluster();
    var hidden = this.footprint.hiddenTotal();
    var totalLen = hidden ? 0 : FPsettings.VolumesHeight[4];
    let GraphTopSpace = FPsettings.Head
      ? this.footprint.topLinesCount() *
        20 *
        this.footprint.colorsService.sscale()
      : 0;
    let miniHeadTop = 25;

    if (this.footprint.minimode) GraphTopSpace = miniHeadTop;

    var CanvasWidth = canvas.width;
    var CanvasHeight = canvas.height;
    var VolumesH = /*FPsettings.VolumesHeight +*/ [
      DeltaVolumes[0],
      DeltaVolumes[1],
      DeltaVolumes[2],
      DeltaVolumes[3],
      DeltaVolumes[5],
    ];

    if (FPsettings.SeparateVolume) {
      VolumesH[0] += FPsettings.VolumesHeight[0];
    }

    if (this.footprint.data.ableOI() && FPsettings.OI) {
      VolumesH[1] += FPsettings.VolumesHeight[1];
    }

    if (FPsettings.Delta) {
      VolumesH[2] += FPsettings.VolumesHeight[2];
    }

    if (FPsettings.DeltaBars) {
      VolumesH[4] += FPsettings.VolumesHeight[5];
    }

    if (this.footprint.data.ableOI() && FPsettings.OIDelta) {
      VolumesH[3] += FPsettings.VolumesHeight[3];
    }

    var totalVH =
      VolumesH[0] + VolumesH[1] + VolumesH[2] + VolumesH[3] + VolumesH[4];

    this.clusterView = new Rectangle(
      totalLen + DeltaVolumes[4],
      GraphTopSpace,
      CanvasWidth -
        this.colorsService.LegendPriceWidth(minimode) -
        totalLen -
        DeltaVolumes[4],
      CanvasHeight -
        this.colorsService.LegendDateHeight(minimode) -
        GraphTopSpace -
        totalVH
    );

    if (newTotal) {
      this.clusterView.x = 0;
      this.clusterView.w =
        CanvasWidth - this.colorsService.LegendPriceWidth(minimode);
    }
    let GraphValuesHeight = Math.abs(this.clusterView.h / 7);

    this.clusterHeadView = {
      x: totalLen + DeltaVolumes[4],
      y: 0,
      w: this.clusterView.w,
      h: GraphTopSpace,
    };

    this.clusterMiniHeadView = {
      x: 0,
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
      w: totalLen + DeltaVolumes[4] - ColorsService.ScrollWidth,
      h: this.clusterView.h,
    };
    this.clusterTotalViewFill = {
      x: 0,
      y: GraphTopSpace,
      w: totalLen + DeltaVolumes[4],
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

    if (minimode) this.clusterDatesView.h = 0;

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

  createParts() {
    this.genViews();
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

  drawClusterView() {
    let FPsettings = this.footprint.FPsettings;
    const canvas: HTMLCanvasElement | null = this.footprint.canvas;
    const ctx: any = canvas?.getContext('2d');
    this.data = this.footprint.data;

    if (!this.data) return;

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
      if (this.footprint.translateMatrix != null) {
        var t = this.footprint.translateMatrix.clone();
        t.multiply(this.mtxMain);
        this.mtxMain = this.footprint.alignMatrix(t);
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
      if (FPsettings.Head) {
        this.mtxhead = mtx.reassignY(
          { y1: 0, y2: this.footprint.topLinesCount() },
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
      this.footprint.getMinMaxIndex(this.mtxMain);
      for (const view in this.views) this.views[view].drawCanvas();
    }
  }

  alignCanvas() {
    var canvas = this.footprint.canvasRef?.nativeElement;
    const container = canvas.parentNode.parentNode;
  
    if (canvas && container) {
      // Получаем размеры контейнера
      
      const containerRect = container.getBoundingClientRect();
      const w = containerRect.width;
      const h = containerRect.height;
  
      // Получаем devicePixelRatio
      let ratio = window.devicePixelRatio ;//|| 1;
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
    return

    var canvas = this.footprint.canvasRef?.nativeElement;

    if (canvas == null || canvas.parentElement == undefined) return;


      var parent = canvas.parentElement?.getBoundingClientRect();
      if (parent !== undefined) {
        var w = Math.floor(canvas.width);
        var h = Math.floor(canvas.height);
        canvas.style.height = h + 'px';
        canvas.style.width = w + 'px';
        canvas.height = Math.floor(h * this.colorsService.scale());
        canvas.width = Math.floor(w * this.colorsService.scale());

        const ctx = this.footprint.ctx;
        ctx.setTransform(1, 0, 0, 1, 0, 0);  // сброс
        ctx.scale( this.colorsService.scale(),  this.colorsService.scale());

      
    }
  }

  public resize() {
    if (!this.footprint.data) return;
  
    var canvas = this.footprint.canvasRef?.nativeElement;
    const container = canvas.parentNode.parentNode;
  
    if (canvas && container) {
      // Получаем размеры контейнера
      /*
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
      ctx.scale(ratio, ratio);*/
  
      // Ваша логика для обновления и отрисовки контента
      var oldX = this.clusterView.x + this.clusterView.w;
      var oldY = this.clusterView.y + this.clusterView.h / 2;
      this.alignCanvas();
      this.genViews();
      var newX = this.clusterView.x + this.clusterView.w;
      var newY = this.clusterView.y + this.clusterView.h / 2;
      this.mtx = this.footprint.alignMatrix(
        this.mtx.getTranslate(newX - oldX, newY - oldY)
      );
      this.drawClusterView();
    }
  }
  
  
}
