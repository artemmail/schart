import { ColumnEx } from 'src/app/models/Column';
import { Matrix, Rectangle } from '../matrix';

import { ChartSettings } from 'src/app/models/ChartSettings';
import { FootPrintComponent } from '../footprint.component';
import { ClusterData } from '../cluster-data';
import { ColorsService } from 'src/app/service/FootPrint/Colors/color.service';
import { FormattingService } from 'src/app/service/FootPrint/Formating/formatting.service';
import { drob, MoneyToStr } from 'src/app/service/FootPrint/utils';

export interface ClusterColumnContext {
  data: ClusterData;
  colorsService: ColorsService;
  formatService: FormattingService;
  ctx: CanvasRenderingContext2D;
  startPrice: number;
  finishPrice: number;
  clusterWidthScale: number;
  settings: ChartSettings;
}

export function createClusterColumnContext(
  parent: FootPrintComponent
): ClusterColumnContext {
  if (!parent.data || !parent.ctx) {
    throw new Error('Cluster context is not initialized');
  }

  return {
    data: parent.data,
    colorsService: parent.colorsService,
    formatService: parent.formatService,
    ctx: parent.ctx,
    startPrice: parent.startPrice,
    finishPrice: parent.finishPrice,
    clusterWidthScale: parent.clusterWidthScale,
    settings: parent.FPsettings,
  };
}

export class ClusterColumnBase {
  protected readonly ctx: CanvasRenderingContext2D;
  protected readonly view: Rectangle;
  protected readonly mtx: Matrix;
  private readonly context: ClusterColumnContext;

  constructor(context: ClusterColumnContext, view: Rectangle, mtx: Matrix) {
    this.context = context;
    this.ctx = context.ctx;
    this.view = view;
    this.mtx = mtx;
  }

  protected get colorsService(): ColorsService {
    return this.context.colorsService;
  }

  protected get formatService(): FormattingService {
    return this.context.formatService;
  }

  protected get settings(): ChartSettings {
    return this.context.settings;
  }

  protected get data(): ClusterData {
    return this.context.data;
  }

  protected get startPrice(): number {
    return this.context.startPrice;
  }

  protected get finishPrice(): number {
    return this.context.finishPrice;
  }

  protected get clusterWidthScale(): number {
    return this.context.clusterWidthScale;
  }

  drawMaxVolumeRect(r: Rectangle, column: ColumnEx, i: number) {
    const settings = this.settings;
    if ('MaxTrades' in settings && settings.MaxTrades) {
      const x = r.x;
      const y = r.y + r.h / 2;
      if (Math.abs(column.cl[i].mx) > this.data.maxt2) {
        this.ctx.fillStyle =
          column.cl[i].mx > 0
            ? ColorsService.greencandlesat
            : ColorsService.redcandlesat;
        this.ctx.strokeStyle =
          column.cl[i].mx > 0
            ? ColorsService.greenCandleBorder
            : ColorsService.redCandleBorder;
        const rh = Math.max(10, Math.abs(r.h));
        const hh = Math.abs(
          Math.sqrt(Math.abs(column.cl[i].mx) / this.data.maxt1) * rh
        );
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        this.ctx.lineTo(x - hh, y - hh * 0.66);
        this.ctx.lineTo(x - hh, y + hh * 0.66);
        this.ctx.lineTo(x, y);
        this.ctx.fill();
        this.ctx.stroke();
      }
    }
  }
  getZIndexDelta(column: ColumnEx) {
    return this.getZIndex(column, function (a: number, b: number) {
      return (
        Math.abs(2 * column.cl[a].bq - column.cl[a].q) -
        Math.abs(2 * column.cl[b].bq - column.cl[b].q)
      );
    });
  }
  getZIndex(column: ColumnEx, lambda: (a: number, b: number) => number) {
    const arr = new Array<number>(column.cl.length);
    for (let i = 0; i < arr.length; i++) arr[i] = i;
    arr.sort(lambda);
    return arr;
  }
  getZIndexVolume(column: ColumnEx) {
    return this.getZIndex(column, function (a: number, b: number) {
      return column.cl[a].q - column.cl[b].q;
    });
  }
  getZIndexDensity(column: ColumnEx) {
    return this.getZIndex(column, function (a: number, b: number) {
      return Math.abs(column.cl[a].mx) - Math.abs(column.cl[b].mx);
    });
  }
  drawOpenClose(
    ctx: CanvasRenderingContext2D,
    column: ColumnEx,
    number: number,
    mtx: Matrix
  ) {
    const settings: ChartSettings = this.settings;
    if (settings.OpenClose && 'o' in column && column.o > 0) {
      let wide =
        settings.style != 'ASKxBID' &&
        !(settings.style == 'VolumeDelta' && settings.deltaStyle == 'Delta');
      if (wide)
        ctx.fillStyle =
          column.o > column.c
            ? ColorsService.redcandleAA
            : ColorsService.greencandleAA;
      else
        ctx.fillStyle =
          column.o > column.c
            ? ColorsService.redcandle
            : ColorsService.greencandle;
      var r1 = mtx.price2Height(column.o, number);
      var r2 = mtx.price2Height(column.c, number);
      ctx.fillRect(r1.x, r1.y, !wide ? 2 : this.getBar(mtx).w, r2.y - r1.y);
    }
  }

  getBar(mtx: Matrix) {
    var p1 = mtx.applyToPoint(0, 0);
    var p2 = mtx.applyToPoint(1, this.data.priceScale);
    return { w: p2.x - p1.x, h: p2.y - p1.y };
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

  drawColumnText(
    ctx: CanvasRenderingContext2D,
    column: ColumnEx,
    number: number,
    mtx: Matrix
  ) {
    const settings: ChartSettings = this.settings;
    var fontSize = this.clusterFontSize(
      mtx,
      settings.style == 'ASKxBID' ? 9 : 5
    );
    if (fontSize > 8) {
      ctx.font = '' + fontSize + 'px Verdana';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = ColorsService.WhiteText;
      for (let i = 0; i < column.cl.length; i++) {
        if (
          column.cl[i].p >= this.startPrice &&
          column.cl[i].p <= this.finishPrice
        ) {
          var r = this.clusterRect(column.cl[i].p, number, mtx);

          var mul = settings.Contracts
            ? 1
            : this.data.volumePerQuantity * column.cl[i].p;

          var text: any = column.cl[i].q * mul;
          if (settings.style == 'Ruticker') {
            if (settings.classic == 'ASK') text = column.cl[i].bq * mul;
            if (settings.classic == 'BID')
              text = mul * (column.cl[i].q - column.cl[i].bq);
            if (settings.classic == 'ASK-BID')
              text = mul * (2 * column.cl[i].bq - column.cl[i].q);
          }

          text = drob(text, 3);
          if (text > 100000) text = MoneyToStr(text);

          ctx.fillText(
            text,
            r.x + 1.5,
            r.y + this.getBar(mtx).h / 2
          );
        }
      }
    }
  }
  drawColumnTextTree(
    ctx: CanvasRenderingContext2D,
    column: ColumnEx,
    number: number,
    mtx: Matrix
  ) {
    const settings: ChartSettings = this.settings;
    var fontSize = this.clusterFontSize(
      mtx,
      settings.style == 'ASKxBID' ? 9 : 5
    );
    if (fontSize > 8) {
      ctx.font = '' + fontSize + 'px Verdana';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = ColorsService.WhiteText;
      for (let i = 0; i < column.cl.length; i++) {
        if (
          column.cl[i].p >= this.startPrice &&
          column.cl[i].p <= this.finishPrice
        ) {
          var r = this.clusterRect(column.cl[i].p, number, mtx);

          var mul = settings.Contracts
            ? 1
            : this.data.volumePerQuantity * column.cl[i].p;

          ctx.textAlign = 'right';
          if (Math.round(column.cl[i].q - column.cl[i].bq) != 0)
            ctx.fillText(
              Math.round(mul * (column.cl[i].q - column.cl[i].bq)).toString(),
              r.w / 2 + r.x - 1.5,
              r.y + this.getBar(mtx).h / 2
            );
          ctx.textAlign = 'left';
          if (Math.round(column.cl[i].bq) != 0)
            ctx.fillText(
              Math.round(mul * column.cl[i].bq).toString(),
              r.w / 2 + r.x + 1.5,
              r.y + this.getBar(mtx).h / 2
            );
        }
      }
    }
  }
  drawColumnTextDeltaTree(
    ctx: CanvasRenderingContext2D,
    column: ColumnEx,
    number: number,
    mtx: Matrix
  ) {
    const settings: ChartSettings = this.settings;
    var fontSize = this.clusterFontSize(
      mtx,
      settings.style == 'ASKxBID' ? 9 : 5
    );
    if (fontSize > 8) {
      ctx.font = '' + fontSize + 'px Verdana';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = ColorsService.WhiteText;
      for (let i = 0; i < column.cl.length; i++) {
        if (
          column.cl[i].p >= this.startPrice &&
          column.cl[i].p <= this.finishPrice
        ) {
          var r = this.clusterRect(column.cl[i].p, number, mtx);

          var mul = settings.Contracts
            ? 1
            : this.data.volumePerQuantity * column.cl[i].p;

          let t = Math.round(mul * column.cl[i].q);
          ctx.textAlign = 'right';
          if (t != 0)
            ctx.fillText(
              t.toString(),
              r.w / 2 + r.x - 1.5,
              r.y + this.getBar(mtx).h / 2
            );
          t = Math.round(mul * (2 * column.cl[i].bq - column.cl[i].q));
          ctx.textAlign = 'left';
          if (t != 0)
            ctx.fillText(
              t.toString(),
              r.w / 2 + r.x + 1.5,
              r.y + this.getBar(mtx).h / 2
            );
        }
      }
    }
  }
  drawClassicColumn_(
    column: ColumnEx,
    number: number,
    mtx: Matrix,
    total: boolean
  ) {
    const settings: ChartSettings = this.settings;
    var ctx = this.ctx;
    this.drawOpenClose(ctx, column, number, mtx);

    var maxDelta = !total ? this.data.maxDelta : column.maxDelta;
    var maxVol = !total ? this.data.maxClusterQnt : column.qntMax;
    var maxVolAsk = !total ? this.data.maxClusterQntAsk : column.qntAskMax;
    var maxVolBid = !total ? this.data.maxClusterQntBid : column.qntBidMax;

    if (!settings.Contracts) {
      maxVol = !total ? this.data.maxClusterVol : column.volMax;
      maxVolAsk = !total ? this.data.maxClusterVolAsk : column.volAskMax;
      maxVolBid = !total ? this.data.maxClusterVolBid : column.volBidMax;
      maxDelta = !total ? this.data.maxDeltaV : column.maxDeltaV;
    }

    var maxVolAskBid = Math.max(maxVolAsk, maxVolBid);
    var bar = this.getBar(mtx);
    var drawBorder = Math.abs(bar.w) > 20 && Math.abs(bar.h) > 6;
    var z = this.getZIndexVolume(column);
    for (let j = 0; j < column.cl.length; j++) {
      var i = z[j];
      if (
        column.cl[i].p >= this.startPrice &&
        column.cl[i].p <= this.finishPrice
      ) {
        var mul = settings.Contracts
          ? 1
          : this.data.volumePerQuantity * column.cl[i].p;

        var r = this.clusterRect(column.cl[i].p, number, mtx);
        if (settings.classic == 'ASK+BID') {
          r.w = (mul * column.cl[i].q * bar.w) / maxVol;
          r.w *= this.clusterWidthScale;
          ctx.strokeStyle = ColorsService.redCandleBorder;
          ctx.fillStyle = ColorsService.redcandle;
          if (drawBorder) {
            ctx.myFillRect(r);
            ctx.myStrokeRect(r);
          } else ctx.myFillRectSmoothX(r);
          r.w = (mul * column.cl[i].bq * bar.w) / maxVol;
          r.w *= this.clusterWidthScale;
          ctx.strokeStyle = ColorsService.greenCandleBorder;
          ctx.fillStyle = ColorsService.greencandle;
          if (drawBorder) {
            ctx.myFillRect(r);
            ctx.myStrokeRect(r);
          } else ctx.myFillRectSmoothX(r);
        }
        if (settings.classic == 'ASK-BID') {
          let qbq = 2 * column.cl[i].bq - column.cl[i].q;
          let absqbq = Math.abs(mul * qbq);
          r.w = (absqbq * bar.w) / Math.abs(maxDelta);
          r.w *= this.clusterWidthScale;
          ctx.strokeStyle = ColorsService.redCandleBorder;
          ctx.fillStyle =
            qbq < 0 ? ColorsService.redcandle : ColorsService.greencandle;
          if (drawBorder) {
            ctx.myFillRect(r);
            ctx.myStrokeRect(r);
          } else ctx.myFillRectSmoothX(r);
        }
        if (settings.classic == 'ASK/BID') {
          ctx.strokeStyle = ColorsService.redCandleBorder;
          ctx.fillStyle = ColorsService.redcandle;
          var w = ((column.cl[i].q - column.cl[i].bq) * bar.w) / maxVolAskBid;
          w *= mul * this.clusterWidthScale;
          ctx.myFillRect({ x: r.x, y: r.y + r.h / 2, w: w, h: r.h / 2 });
          var w2 = (mul * column.cl[i].bq * bar.w) / maxVolAskBid;
          w2 *= this.clusterWidthScale;
          ctx.fillStyle = ColorsService.greencandle;
          ctx.myFillRect({ x: r.x, y: r.y, w: w2, h: r.h / 2 });
          ctx.strokeStyle = '#aaa';
          if (drawBorder)
            ctx.myStrokeRect({ x: r.x, y: r.y, w: Math.max(w, w2), h: r.h });
        }
        if (settings.classic == 'Tree') {
          ctx.strokeStyle = ColorsService.redCandleBorder;
          ctx.fillStyle = ColorsService.redcandle;
          var w =
            (mul * (column.cl[i].q - column.cl[i].bq) * bar.w) / maxVolAskBid;
          w *= this.clusterWidthScale;
          ctx.myFillRect({ x: r.x + bar.w / 2, y: r.y, w: -w / 2, h: r.h });
          var w2 = (mul * column.cl[i].bq * bar.w) / maxVolAskBid;
          w2 *= this.clusterWidthScale;
          ctx.fillStyle = ColorsService.greencandle;
          ctx.myFillRect({ x: r.x + bar.w / 2, y: r.y, w: w2 / 2, h: r.h });
          ctx.strokeStyle = '#aaa';
          if (drawBorder)
            ctx.myStrokeRect({
              x: r.x + bar.w / 2 - w / 2,
              y: r.y,
              w: (w + w2) / 2,
              h: r.h,
            });
        }
        if (settings.classic == 'ASK') {
          r.w = (mul * column.cl[i].bq * bar.w) / maxVolAsk;
          r.w *= this.clusterWidthScale;
          ctx.strokeStyle = ColorsService.greenCandleBorder;
          ctx.fillStyle = ColorsService.greencandle;
          if (drawBorder) {
            ctx.myFillRect(r);
            ctx.myStrokeRect(r);
          } else ctx.myFillRectSmoothX(r);
        }
        if (settings.classic == 'BID') {
          r.w = (mul * (column.cl[i].q - column.cl[i].bq) * bar.w) / maxVolBid;
          r.w *= this.clusterWidthScale;
          ctx.strokeStyle = ColorsService.redCandleBorder;
          ctx.fillStyle = ColorsService.redcandle;
          ctx.myFillRect(r);
          if (drawBorder) {
            ctx.myFillRect(r);
            ctx.myStrokeRect(r);
          } else ctx.myFillRectSmoothX(r);
        }
        if (!total) this.drawMaxVolumeRect(r, column, i);
      }
    }
    if (settings.classic == 'Tree') this.drawColumnTextTree(ctx, column, number, mtx);
    else this.drawColumnText(ctx, column, number, mtx);
  }
}

export { ColumnEx };


