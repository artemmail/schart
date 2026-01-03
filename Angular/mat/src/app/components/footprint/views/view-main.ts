import { canvasPart } from './canvas-part';
import { Matrix, Point, Rectangle } from './../matrix';
import { ColorsService } from 'src/app/service/FootPrint/Colors/color.service';
import { DeltaVolumeColumn } from '../columns/delta-volume-column';
import { VolumeDeltaColumn } from '../columns/volume-delta-column';
import { ClassicColumn } from '../columns/classic-column';
import { VolumeColumn } from '../columns/volume-column';
import { MarketDeltaColumn } from '../columns/market-delta-column';
import { DensityDeltaColumn } from '../columns/density-delta-column';
import { BarColumn } from '../columns/bar-column';
import { CandleColumn } from '../columns/candle-column';
import { DraggableEnum } from 'src/app/models/Draggable';
import { ColumnEx, createClusterColumnContext } from '../columns/cluster-column-base';
import { ChartSettings } from 'src/app/models/ChartSettings';
import { FootPrintComponent } from '../footprint.component';
import { MyMouseEvent } from 'src/app/models/MyMouseEvent';
import { removeUTC } from 'src/app/service/FootPrint/Formating/formatting.service';
import { drob } from 'src/app/service/FootPrint/utils';
import * as Hammer from 'hammerjs';

export class viewMain extends canvasPart {





  private frame: number;
  private startTime: number;
  private v0: number;
  private damping: number;
  private isScrolling: boolean;

  constructor(parent: FootPrintComponent, view: Rectangle, mtx: Matrix) {
    super(parent, view, mtx, DraggableEnum.No);

      this.frame = 0;
      this.startTime = 0;
      this.v0 = 0;
      this.damping = 1500.0; // коэффициент затухания скорости
      this.isScrolling = false;
  }

  stopSwipe() {
    if (this.parent.translateMatrix != null) {
        if (!this.parent.markupEnabled || this.parent.markupManager.allowPan()) {
            this.parent.viewsManager.mtx = this.parent.alignMatrix(
                this.parent.translateMatrix.multiply(this.parent.viewsManager.mtx)
            );
            this.parent.translateMatrix = null;
        }
        cancelAnimationFrame(this.frame);
        this.isScrolling = false;
    }
}

calculateElapsed(): number {
    return (Date.now() - this.startTime) / 1000; // переводим миллисекунды в секунды
}

calculateStopTime(): number {
    return Math.abs(this.v0) / this.damping;
}

calculateDisplacement(t: number, t_stop: number): number {
    if (t <= t_stop) {
        return this.v0 * t - 0.5 * this.damping * t * t;
    } else {
        return this.v0 * t_stop - 0.5 * this.damping * t_stop * t_stop;
    }
}

applyDisplacement(dx: number) {
    if (Math.abs(dx) > 1) {
        this.parent.translateMatrix = new Matrix().translate(dx, 0);
        this.parent.drawClusterView();
    } else {
        this.stopSwipe();
    }
}

onSwipe = (event: Hammer.HammerInput): void => {
    this.interruptSwipe();

    this.v0 = event.velocityX * 1000; // начальная скорость в пикселях/секунду
    this.startTime = Date.now();
    this.isScrolling = true;

    const t_stop = this.calculateStopTime();

    const inertiaScroll = () => {
        const elapsed = this.calculateElapsed();
        const dx = this.calculateDisplacement(elapsed, t_stop);

        this.applyDisplacement(dx);

        if (elapsed <= t_stop && Math.abs(dx) > 1) {
            this.frame = requestAnimationFrame(inertiaScroll);
        } else {
            this.stopSwipe();
        }
    };

    this.frame = requestAnimationFrame(inertiaScroll);
};

interruptSwipe() {
    if (this.isScrolling) {
        const elapsed = this.calculateElapsed();
        const t_stop = this.calculateStopTime();
        const dx = this.calculateDisplacement(elapsed, t_stop);

        this.applyDisplacement(dx);
        this.stopSwipe();
    }
}



  onTap(e: any) {
    this.interruptSwipe();

  }

  onPanStart(e: any) {
    this.interruptSwipe();
    if (!this.parent.markupEnabled || this.parent.markupManager.allowPan()) {
      this.parent.translateMatrix = new Matrix().translate(
        e.deltaX ,
        e.deltaY 
      );
      this.parent.drawClusterView();
    }
  }
  onPan(e: any) {
    this.onPanStart(e);
  }
  onPanEnd(e: any) {
    if (this.parent.translateMatrix != null)
      if (!this.parent.markupEnabled || this.parent.markupManager.allowPan()) {
        this.parent.viewsManager.mtx = this.parent.alignMatrix(
          this.parent.translateMatrix.multiply(this.parent.viewsManager.mtx)
        );
        this.parent.translateMatrix = null;
      }
  }
  onMouseDown(e: Point) {
    this.interruptSwipe();
    if (this.parent.markupEnabled) this.parent.markupManager.onMouseDown(e);
  }



  onMouseMovePressed(e: Point) {
    if (this.parent.markupEnabled) this.parent.markupManager.onMouseDownMove(e);

    if (!this.parent.markupEnabled || this.parent.markupManager.allowPan())
      this.parent.translateMatrix = new Matrix().translate(
        -(this.parent.mouseAndTouchManager.pressd.x - e.x) 
          ,
        -(this.parent.mouseAndTouchManager.pressd.y - e.y)
      );

    this.parent.drawClusterView();
  }
  onMouseUp(e: Point) {
    if (this.parent.markupEnabled) this.parent.markupManager.onMouseUp(e);

    if (!this.parent.markupEnabled || this.parent.markupManager.allowPan()) {
      if (this.parent.translateMatrix != null)
        this.parent.viewsManager.mtx = this.parent.alignMatrix(
          this.parent.translateMatrix.multiply(this.parent.viewsManager.mtx)
        );
      this.parent.translateMatrix = null;
    }

    this.parent.drawClusterView();
  }
  onPinchEnd(e: any) {
    if (this.parent.translateMatrix != null)
      this.parent.viewsManager.mtx = this.parent.alignMatrix(
        this.parent.translateMatrix.multiply(this.parent.viewsManager.mtx)
      );
    this.parent.translateMatrix = null;
  }
  onPinchStart(e: any) {
    //alert('pinch');
    var s = e.scale;
    var sx = Math.abs(Math.cos((e.angle * 3.14159) / 180));
    var sy = Math.abs(Math.sin((e.angle * 3.14159) / 180));
    sx = sy = s;
    var x = e.center.x;
    var y = e.center.y;
    var m = Matrix.fromTriangles(
      [x, y, x + 1, y + 1, x + 1, y - 1],
      [x, y, x + sx, y + sy, x + sx, y - sy]
    );
    this.parent.translateMatrix = m;
    this.parent.drawClusterView();
  }
  onPinchMove(e: any) {
    this.onPinchStart(e);
  }

  onMouseWheel(ev: MyMouseEvent, wheelDistance: number) {
    var s = Math.pow(1.05, wheelDistance);
    const [x, y] = [ev.position.x, ev.position.y];

    this.drawHint(ev);

    var m = Matrix.fromTriangles(
      [x, y, x + 1, y + 1, x + 1, y - 1],
      [x, y, x + s, y + s, x + s, y - s]
    );
    this.parent.viewsManager.mtx = this.parent.alignMatrix(
      m.multiply(this.parent.viewsManager.mtx),
      this.parent.isPriceVisible()
    );
    this.parent.drawClusterView();
  }



  onMouseMove(e: MyMouseEvent) {
    /* if(this.parent.canvas!==null)
     this.parent.canvas.style.cursor = 'default'; //'s-resize';
   */
    //   canvas.style.cursor = 'move';// selectedPoint == null ? (mode == 'Edit' ? 'move' : 'default') : 'pointer';
    if (this.parent.markupEnabled)
      this.parent.markupManager.onMouseMove(e.position);
    var point = this.mtx.inverse().applyToPoint1(e.position);
    var p =
      Math.round(point.y / this.parent.data.priceScale) *
      this.parent.data.priceScale;
    let pp = drob(p, 4);

    const n = Math.floor(point.x);
    const clusterData = this.parent.data.clusterData;

    if (!clusterData || n < 0 || n >= clusterData.length) {
      this.parent.hideHint();
      return;
    }

    const col = clusterData[n];

    this.parent.selectedPrice = pp;
    this.parent.selectedColumn = col;

    this.drawHint(e);

    //if (e.button == 0)
    this.parent.drawClusterView();
  }

  drawHint( event: MyMouseEvent) {

    if (!this.parent.data) {
      this.parent.hideHint();
      return;
    }

    this.parent.hintService.renderHint({
      event,
      mtx: this.mtx,
      clusterData: this.parent.data.clusterData,
      priceScale: this.parent.data.priceScale,
      views: this.parent.views,
      settings: this.parent.FPsettings,
      formatService: this.formatService,
      onShow: (content, position) => this.parent.showHint(content, position),
      onHide: () => this.parent.hideHint(),
    });
  }

  ParmasFromCandle1(dt: Date, period: number) {
    var dt2 = new Date(dt.getTime() + (60000 * period - 1));
    var newperiod = 0;
    if (period >= 1440) newperiod = 5;
    else if (period >= 120) newperiod = 1;
    else newperiod = 0;
    var tickerparams = {
      startDate: removeUTC(dt),
      endDate: removeUTC(dt2),
      period: newperiod,
    };
    return tickerparams;
  }

  onDoubleClick(point: Point) {    
    if (this.parent.minimode)
    {
      this.parent.router.  navigate(['/FootPrint'], { queryParams: this.parent.params });
      return;

    }

    let params = this.parent.params;    
    var p = Math.floor(this.mtx.inverse().applyToPoint1(point).x);
    var v = this.formatService.MoscowTimeShift(
      this.parent.data.clusterData[p].x
    );
    var cp: any = this.ParmasFromCandle1(v, params.period);      
    cp.ticker = params.ticker;    
    this.parent.router.  navigate(['/FootPrint'], { queryParams: cp });


    //window.open('/FootPrint?' + jQuery.param(cp));
    //OpenClusters(cp);
  }

  private drawDeltaLine(
    parent: FootPrintComponent,
    view: Rectangle,
    mtx: Matrix
): void {

  const ctx = this.parent.ctx;
  const FPsettings: ChartSettings = this.parent.FPsettings;

  // ----------------  расчёт границ по данным  -----------------
  let max = parent.data.maxCumDelta;
  let min = parent.data.minCumDelta;

  if (FPsettings.ShrinkY) {          // учитывать локальное сжатие
    max = parent.data.local.maxCumDelta;
    min = parent.data.local.minCumDelta;
  }

  const pad = (max - min) / 10;      // небольшой «воздух»
  max += pad;
  min -= pad;

  // ----------------  подготавливаем матрицу  ------------------
  const m = mtx.reassignY(
    { y1: min, y2: max },
    { y1: view.h + view.y, y2: view.y }
  );

  // ----------------  нулевая линия  ---------------------------
  const pLeft  = m.applyToPoint(parent.minIndex + 0.5, 0);
  const pRight = m.applyToPoint(parent.maxIndex + 0.5, 0);

  ctx.save();
  ctx.strokeStyle = '#ddd';
  ctx.beginPath();
  ctx.myLine(pLeft.x, pLeft.y, pRight.x, pRight.y);
  ctx.stroke();
  ctx.restore();

  // ----------------  сама дельта ------------------------------
  function trace() {
    ctx.beginPath();
    for (let i = parent.minIndex; i <= parent.maxIndex; i++) {
      const y = parent.data.clusterData[i].cumDelta;
      const p = m.applyToPoint(i + 0.5, y);

      if (i === parent.minIndex) ctx.moveTo(p.x, p.y);
      else                       ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }

  // Зелёный участок >0
  ctx.save();
  ctx.strokeStyle = ColorsService.greencandle;
  ctx.beginPath();
  ctx.myRectXY({ x: view.x, y: view.y }, { x: view.x + view.w, y: pLeft.y });
  ctx.clip();
  trace();
  ctx.restore();

  // Красный участок <0
  ctx.save();
  ctx.strokeStyle = ColorsService.redcandle;
  ctx.beginPath();
  ctx.myRectXY({ x: view.x, y: pLeft.y }, { x: view.x + view.w, y: view.y + view.h });
  ctx.clip();
  trace();
  ctx.restore();
}

// === 2.  МОДИФИЦИРУЕМ draw()  ================================
override draw(parent: FootPrintComponent, view: Rectangle, mtx: Matrix) {

  const FPsettings: ChartSettings = this.parent.FPsettings;

  /* >>> НОВОЕ УСЛОВИЕ — если включён DeltaGraph, рисуем дельту
        и выходим, не создавая свечи/кластеры.  <<< */
  if (FPsettings.DeltaGraph) {
    this.drawDeltaLine(parent, view, mtx);
    return;          // всё, дальше обычная логика не нужна
  }

    let params = this.parent.params;

    let ctx = this.parent.ctx;
    if (FPsettings.ShrinkY) {
      parent.data.maxClusterQnt = parent.data.local.qntMax;
      parent.data.maxDelta = parent.data.local.maxDelta;
      parent.data.maxClusterQntAsk = parent.data.local.qntAskMax;
      parent.data.maxClusterQntBid = parent.data.local.qntBidMax;

      parent.data.maxClusterVol = parent.data.local.volMax;
      parent.data.maxDeltaV = parent.data.local.maxDeltaV;
      parent.data.maxClusterVolAsk = parent.data.local.volAskMax;
      parent.data.maxClusterVolBid = parent.data.local.volBidMax;

      parent.data.maxDens = parent.data.local.maxDens;
    }

    let Bars = 'Bars' in FPsettings && FPsettings.Bars;

    const columnContext = createClusterColumnContext(parent);
    var ColumnBuilder;

    if (
      !parent.data.ableCluster() ||
      ('CompressToCandles' in FPsettings &&
        (FPsettings.CompressToCandles == 'Always' ||
          (FPsettings.CompressToCandles == 'Auto' &&
            parent.getBar(mtx).w < ColorsService.maxColWidth)))
    ) {
        ColumnBuilder = Bars
          ? new BarColumn(columnContext, view, mtx)
          : new CandleColumn(
              columnContext,
              view,
              mtx,
              () => parent.selectedColumn
            );
    } else
      switch (FPsettings.style) {
        case 'Ruticker':
          ColumnBuilder = new ClassicColumn(columnContext, view, mtx);
          break;
        case 'Volume':
          ColumnBuilder = new VolumeColumn(
            columnContext,
            view,
            mtx,
            parent.levelMarksService
          );
          break;
        case 'ASKxBID':
          ColumnBuilder = new MarketDeltaColumn(columnContext, view, mtx);
          break;
        case 'Density':
          ColumnBuilder = new DensityDeltaColumn(columnContext, view, mtx);
          break;
        case 'VolumeDelta':
          ColumnBuilder =
            FPsettings.deltaStyle == 'Delta'
              ? new VolumeDeltaColumn(columnContext, view, mtx)
              : new DeltaVolumeColumn(columnContext, view, mtx);
          break;
      }

    var data = parent.data.clusterData;

    if (params.period == 0) {
      var s = Math.max(0, parent.minIndex - 1);
      ctx.beginPath();

      for (
        let i = s;
        i <= Math.min(parent.data.clusterData.length - 1, 1 + parent.maxIndex);
        i++
      ) {
        var p = mtx.applyToPoint(i + 0.5, data[i].c);
        if (i == s) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);

        if (data[i].q === data[i].bq) this.ctx.fillStyle = 'green';
        else this.ctx.fillStyle = 'red';

        ctx.myFillRectSmooth({ x: p.x - 3, y: p.y - 3, w: 6, h: 6 });
      }
      ctx.stroke();
      return;
    }

    if (ColumnBuilder != null)
      for (let i = parent.minIndex; i <= parent.maxIndex; i++)
        ColumnBuilder.draw(data[i], i, mtx, false);
  }


}


