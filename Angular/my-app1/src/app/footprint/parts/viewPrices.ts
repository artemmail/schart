import { canvasPart } from './canvasPart';
import { Matrix, Point, Rectangle} from './../matrix';
import { ColorsService } from './../service/Colors/color.service';
import { LevelMarksService } from '../service/LevelMarks/level-marks.service';
import { DraggableEnum } from 'src/app/models/Draggable';
import { FootPrintComponent } from '../footprint.component';

export class viewPrices extends canvasPart {
  constructor(parent: FootPrintComponent,  view: Rectangle, mtx: Matrix) {
    super(parent,  view, mtx, DraggableEnum.No);
  }
  onPanStart(e: any) {}
  onPan(e: any) {
    /*if (this.parent.panStartInfo != null) {
      var s = Math.pow(1.03, -e.deltaY / 4);
      var x = 0;
      var y = this.parent.conv_mouse_xy(
        this.parent.panStartInfo.event.center
      ).y;
      this.parent.translateMatrix = Matrix.fromTriangles(
        [x + 1, y, x - 2, y + 1, x, y + 2],
        [x + 1, y, x - 2, y + s, x, y + 2 * s]
      );
      this.parent.drawClusterView();
    }*/
  }
  onPanEnd(e: any) {
    if (this.parent.translateMatrix!=null)
    this.parent.mtx = this.parent.alignMatrix(
      this.parent.translateMatrix.multiply(this.parent.mtx)
    );
    this.parent.translateMatrix = null;
  }

  onTap(e: Point) {
    var sv: LevelMarksService = this.parent.LevelMarksService;
    var p = this.mtx.inverse().applyToPoint(e.x, e.y).y;
    p =
      Math.round(p / this.parent.data.priceScale) * this.parent.data.priceScale;
    var val = this.formatService.drob(p, 4) + '';
    sv.togglePrice(this.parent.params, val);
    this.parent.drawClusterView();
  }

  /*
  onRightClick (e:any) {
    var p = this.mtx.inverse().applyToPoint(e.offsetX, e.offsetY).y;
    var p =
      Math.round(p / this.parent.data.priceScale) * this.parent.data.priceScale;
    var price = this.formatService.drob(p, 4);
    var key = getMarksKey();
    if (typeof markset[key] != 'undefined') {
      var mset = markset[key].levels;
      if (typeof mset[price] != 'undefined') {
        globalvar = mset[price];
        levelSettingsModel.set('level', mset[price]);
        $('#levelsSettings').data('kendoWindow').center().open();
      }
    }
  };*/
  onMouseMove(e: Point) {
    if(this.parent.canvas!==null)
     this.parent.canvas.style.cursor = 'pointer'; //'s-resize';



  }
  draw(parent: FootPrintComponent,  view: Rectangle, mtx: Matrix): void {
    let ctx = this.parent.ctx;
    let sscale = this.colorsService.sscale();
    /*    this.maxQuantity = this.data.maxQuantity;
        this.maxQuantityAsk = this.data.maxQuantityAsk;
        this.maxQuantityBid = this.data.maxQuantityBid;


        if (FPsettings.ShrinkY) {
            this.maxQuantity = this.data.local.q;
            this.maxQuantityAsk = this.data.local.bq;
            this.maxQuantityBid = this.data.local.sq;
        }*/

    var finishPrice = mtx.Height2Price(view.y - 100);
    var startPrice = mtx.Height2Price(view.y + view.h + 100);
    finishPrice =
      Math.floor(finishPrice / parent.data.priceScale) * parent.data.priceScale;
    startPrice = Math.max(
      0,
      Math.floor(startPrice / parent.data.priceScale) * parent.data.priceScale
    );
    var r = parent.getBar(mtx);
    r.w = 80 * sscale;
    r.h = Math.abs(r.h);
    var fontSize = parent.clusterRectFontSize(r, 6);
    var hh = fontSize;
    fontSize = Math.max(fontSize, 9 * sscale);
    var textDrawStride = Math.round(Math.max(1, Math.abs((1 + fontSize) / hh)));
    ctx.font = '' + fontSize + 'px Verdana';
    ctx.strokeStyle = ColorsService.lineColor;
    ctx.fillStyle = '#333';
    ctx.textBaseline = 'middle';
    ctx.beginPath();

    //var m = Math.round((finishPrice - startPrice)/parent.data.priceScale);

    for (
      var price = finishPrice;
      price > startPrice;
      price -= parent.data.priceScale * textDrawStride
    ) {
      const r = mtx.price2Height(price, 0);
      ctx.myLine(r.x, r.y, r.x + 5, r.y);
      //if (Math.round((price - startPrice/* parent.data.minPrice*/) / parent.data.priceScale) % textDrawStride == 0)
      ctx.fillText(this.formatService.drob(price, 4), r.x + 8, r.y);
    }
    ctx.stroke();
    if (!this.parent.IsPriceVisible()) return;
    ctx.beginPath();
    var r1 = mtx.price2Height(parent.data.lastPrice, 0);
    ctx.moveTo(r1.x, r1.y);
    ctx.lineTo(r1.x + 10, r1.y);
    ctx.stroke();
    let pp = this.formatService.drob(parent.data.lastPrice, 6) + '';
    var lpRect = {
      x: r1.x + 5 * sscale,
      y: r1.y - 9 * sscale,
      w: (3 + pp.toString().length * 8) * sscale,
      h: 18 * sscale,
    };
    ctx.fillStyle = 'Linen';
    ctx.myFillRect(lpRect);
    ctx.myStrokeRect(lpRect);
    ctx.font = Math.round(12 * sscale) + 'px Verdana';
    ctx.fillStyle = '#333';
    ctx.fillText(pp, r1.x + 8, r1.y);
    ctx.font = '' + fontSize + 'px Verdana';
    var ladder: Record<string, number> = parent.data.ladder;
    if (ladder != null) {
      var maxVolume = 0;
      for (const price in ladder)
        maxVolume = Math.max(maxVolume, Math.abs(ladder[price]));
      for (const price in ladder) {
        var p = parseFloat(price);
        var volume = ladder[price];
        var r = parent.clusterRect(p, 0, mtx);
        r = {
          x: view.x + view.w - 1,
          w: -40 * Math.abs(volume / maxVolume),
          y: r.y,
          h: r.h,
        };
        ctx.fillStyle =
          volume > 0 ? 'rgba(4, 163, 68, 0.5)' : 'rgba(214, 24, 0, 0.5)';
        ctx.myFillRect(r);
        ctx.strokeStyle =
          volume > 0 ? 'rgba(4, 163, 68, 0.3)' : 'rgba(214, 24, 0, 0.3)';
        ctx.myStrokeRect(r);
        r.w = 40;
        var fontSize = parent.clusterRectFontSize(r, 4);
        if (fontSize > 7) {
          ctx.fillStyle = '#333';
          ctx.font = '' + Math.round(fontSize * sscale) + 'px Verdana';
          ctx.fillStyle = '#333';
          r.x = view.x + 10;
          ctx.fillText(
            Math.abs(volume).toString(),
            view.x + 67 * sscale,
            r.y + r.h / 2
          );
        }
      }
    }
    ctx.strokeStyle = ColorsService.lineColor;
    ctx.myStrokeRect(this.view);
  }
  onMouseWheel(point:Point, wheelDistance : number) {
    
    var s = Math.pow(1.05, wheelDistance);
    var x = point.x;
    var y = point.y;
    
    var m = Matrix.fromTriangles(
      [x + 1, y, x - 2, y + 1, x, y + 2],
      [x + 1, y, x - 2, y + s, x, y + 2 * s]
    );
    this.parent.mtx = this.parent.alignMatrix(m.multiply(this.parent.mtx));
    this.parent.drawClusterView();
  }
}
