import { canvasPart } from './canvasPart';
import { Matrix, Rectangle } from './../matrix';
import { ColorsService } from './../service/Colors/color.service';
import { LevelMarksService } from '../service/LevelMarks/level-marks.service';
import { DraggableEnum } from 'src/app/models/Draggable';
import { ChartSettings } from 'src/app/models/ChartSettings';
import { FootPrintComponent } from '../footprint.component';

export class viewBackground extends canvasPart {
  constructor(parent: FootPrintComponent, view: Rectangle, mtx: Matrix) {
    super(parent, view, mtx, DraggableEnum.No);
  }

  draw(parent: FootPrintComponent, view: Rectangle, mtx: Matrix): void {
    const ctx = this.parent.ctx;
    var params = this.parent.params;
    var FPsettings: ChartSettings = this.parent.FPsettings;
    var CanvasWidth = this.parent.canvas?.width;
    var data = parent.data.clusterData;
    /*ctx.fillStyle = Gray3;
        ctx.myFillRect(parent.clusterTotalViewFill);*/
    ctx.fillStyle = ColorsService.Gray1;
    ctx.setLineDash([5, 3, 5]);
    ctx.beginPath();

    var r1 = parent.clusterRect(data[parent.minIndex].o, parent.minIndex, mtx);

    var horiz = r1.w <= 20 || FPsettings.CandlesOnly;

    if (horiz) this.draw1(parent, view, mtx);

    for (let i = parent.minIndex; i <= parent.maxIndex; i++) {
      var r = parent.clusterRect(/*data[i].cl[0].p*/ data[i].o, i, mtx);

      if (!horiz && r1.w > 20 && i % 2 == 1 && r.w > 20)
        ctx.myFillRect({ x: r.x, y: view.y, w: r.w, h: view.h });

      if (
        i > 0 &&
        this.formatService.dateDelimeter(
          this.formatService.MoscowTimeShift(data[i - 1].x),
          this.formatService.MoscowTimeShift(data[i].x),
          params.period
        )
      )
        ctx.myLine(r.x, view.y, r.x, view.y + view.h);
    }

    var sv: LevelMarksService = this.parent.LevelMarksService;

    var ms = sv.getMarks(this.parent.params);

    if (ms !== null && typeof ms.dates != 'undefined') {
      
      var mset = ms.dates;
      var values = Object.keys(mset);
      var len = values.length;
      for (let i = 0; i < len; i++) {
        var date = values[i];
        var line = mset[date];
        var rgbcolor = this.colorsService.hexToRgb(line.color);
        var grd = ctx.createLinearGradient(0, 0, 0, parent.canvas?.height);
        grd.addColorStop(
          0,
          `rgba(${rgbcolor.r},${rgbcolor.g},${rgbcolor.b},0.05)`
        );
        grd.addColorStop(
          1,
          `rgba(${rgbcolor.r},${rgbcolor.g},${rgbcolor.b},0.5)`
        );

        ctx.fillStyle = grd;
        var r = parent.clusterRect(
          100,
          parent.data.ColumnNumberByDate[date],
          mtx
        );
        r.y = 0;
        r.h = parent.canvas?.height ?? 0;
        ctx.myFillRect(r);
      }
    }
    ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    ctx.myRect({
      x: 0,
      w: CanvasWidth,
      y: parent.clusterView.y,
      h: parent.clusterView.h,
    });
    ctx.clip();
    if (
      !FPsettings.ToolTip &&
      this.parent.translateMatrix == null &&
      this.parent.selectedPrice != null
    ) {
      var rgbcolor = this.colorsService.hexToRgb('#80c4de');
      var grd = ctx.createLinearGradient(0, 0, CanvasWidth, 0);
      grd.addColorStop(
        0,
        `rgba(${rgbcolor.r},${rgbcolor.g},${rgbcolor.b},0.3)`
      );
      grd.addColorStop(
        1,
        `rgba(${rgbcolor.r},${rgbcolor.g},${rgbcolor.b},0.3)`
      );

      ctx.fillStyle = grd;
      var r = parent.clusterRect(Number(this.parent.selectedPrice), 0, mtx);
      r.x = 0;
      r.w = CanvasWidth ?? 0;
      ctx.myFillRect(r);
    }

    if (FPsettings.ToolTip && !parent.hiddenHint && 'selectedPoint' in parent) {
      //if (this.checkPoint(parent.selectedPoint))
      var e = parent.selectedPoint;
      ctx.strokeStyle = 'rgba(200, 200, 200, 0.7)';
      ctx.myLine(this.view.x, e.y, this.view.x + this.view.w, e.y);
      ctx.myLine(e.x, this.view.y, e.x, this.view.y + this.view.h);

      var pp =
        '' +
        this.formatService.drob(this.mtx.inverse().applyToPoint(e.x, e.y).y, 4);

      var lpRect = {
        x: this.view.x + this.view.w + 5,
        y: e.y - 9 * this.colorsService.sscale(),
        w: (3 + pp.toString().length * 8) * this.colorsService.sscale(),
        h: 18 * this.colorsService.sscale(),
      };

      ctx.fillStyle = 'Linen';
      ctx.myFillRect(lpRect);
      ctx.myStrokeRect(lpRect);
      ctx.font = Math.round(12 * this.colorsService.sscale()) + 'px Verdana';
      ctx.fillStyle = '#333';
      ctx.fillText(pp, lpRect.x + 3, lpRect.y + 10);
      ctx.stroke();
    }

    if (ms != null) {
      if (typeof ms.levels != 'undefined') {
        var mset = ms.levels;
        var values = Object.keys(mset);
        var fontSize = Math.min(
          this.colorsService.maxFontSize(),
          Math.abs(parent.getBar(mtx).h)
        );
        ctx.font = fontSize + 'px Verdana';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        for (let i = 0; i < values.length; i++) {
          var price = parseFloat(values[i]);
          var line = mset[price];
          var rgbcolor = this.colorsService.hexToRgb(line.color);
          var grd = ctx.createLinearGradient(0, 0, CanvasWidth, 0);
          grd.addColorStop(
            0,
            `rgba(${rgbcolor.r},${rgbcolor.g},${rgbcolor.b},0.6)`
          );
          grd.addColorStop(
            1,
            `rgba(${rgbcolor.r},${rgbcolor.g},${rgbcolor.b},0.8)`
          );
          ctx.fillStyle = grd;
          var r = parent.clusterRect(price, 0, mtx);
          r.x = 0;
          r.w = CanvasWidth ?? 0;
          ctx.myFillRect(r);
          if (fontSize > 7 && line.comment != '') {
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            var y = r.y + parent.getBar(mtx).h / 2;
            ctx.fillText(
              line.comment,
              r.w - this.colorsService.LegendPriceWidth() - 5,
              y
            );
          }
        }
      }
    }
    ctx.restore();
  }

  draw1(parent: FootPrintComponent, view: Rectangle, mtx: Matrix) {
    let ctx = this.parent.ctx;
    var finishPrice = mtx.Height2Price(view.y - 100);
    var startPrice = mtx.Height2Price(view.y + view.h + 100);
    finishPrice =
      Math.floor(finishPrice / parent.data.priceScale) * parent.data.priceScale;
    startPrice = Math.max(
      0,
      Math.floor(startPrice / parent.data.priceScale) * parent.data.priceScale
    );
    var r = parent.getBar(mtx);
    r.w = 80 * this.colorsService.sscale();
    r.h = Math.abs(r.h);
    var fontSize = parent.clusterRectFontSize(r, 6);
    var hh = fontSize;
    fontSize = Math.max(fontSize, 9 * this.colorsService.sscale());
    var textDrawStride = Math.round(Math.max(1, Math.abs((1 + fontSize) / hh)));
    ctx.fillStyle = ColorsService.Gray1;

    for (
      var price = finishPrice + (parent.data.priceScale * textDrawStride) / 2;
      price > startPrice;
      price -= parent.data.priceScale * textDrawStride * 2
    ) {
      var r1 = mtx.price2Height(price, 0);
      var r2 = mtx.price2Height(
        price + parent.data.priceScale * textDrawStride,
        0
      );
      ctx.myFillRect({ x: view.x, y: r1.y, w: view.w, h: -r2.y + r1.y });
      //  ctx.myLine(view.x, r.y, view.x+ view.w,r.y);
    }
  }
}
