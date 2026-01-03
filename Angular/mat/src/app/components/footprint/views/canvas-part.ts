import { DraggableEnum } from 'src/app/models/Draggable';
import { Matrix } from '../models/matrix';
import { Point } from '../models/matrix';
import { Rectangle } from '../models/matrix';

import { FormattingService, rounder, rrounder } from 'src/app/service/FootPrint/Formating/formatting.service';
import { FootPrintComponent } from '../components/footprint/footprint.component';
import { ColorsService } from 'src/app/service/FootPrint/Colors/color.service';
import { drob, MoneyToStr } from 'src/app/service/FootPrint/utils';

export abstract class canvasPart {
  public ctx: any;
  public view: Rectangle;
  public mtx: Matrix;
  public parent: FootPrintComponent;
  public draggable: DraggableEnum;
  public colorsService: ColorsService;
  public formatService: FormattingService;

  constructor(
    parent: FootPrintComponent,  
    view: Rectangle,
    mtx: Matrix,
    draggable: DraggableEnum = DraggableEnum.No
  ) {
    
    this.view = view;
    this.parent = parent;
    this.ctx = this.parent.ctx;
    this.mtx = mtx;
    this.draggable = draggable;
    this.colorsService = this.parent.colorsService;
    this.formatService = this.parent.formatService;
  }

  protected calculatePriceRange(view: Rectangle, mtx: Matrix): { startPrice: number; finishPrice: number; step: number; fontSize: number; skip: number } {
    const sscale = this.colorsService.sscale();
    let finishPrice = mtx.Height2Price(view.y - 100);
    let startPrice = mtx.Height2Price(view.y + view.h + 100);
  
    const bar = this.parent.getBar(mtx);
    bar.w = 80 * sscale;
    bar.h = Math.abs(bar.h);
  
    let fontSize = this.parent.clusterRectFontSize(bar, 6);
    fontSize = Math.max(fontSize, 9 * sscale);
  
    let step = this.parent.data.priceScale; // Оставляем шаг без изменений
  
    if (this.parent.minimode || this.parent.FPsettings.CandlesOnly || !this.parent.data.ableCluster()) {
      fontSize = 12;
      step = rounder((18 * (finishPrice - startPrice)) / view.h);
      finishPrice = Math.floor(finishPrice / step) * step;
      startPrice = Math.floor(startPrice / step) * step;
    } else {
      finishPrice = Math.floor(finishPrice / step) * step;
      startPrice = Math.max(0, Math.floor(startPrice / step) * step);
    }
  
    // Вычисляем пиксельное расстояние между рисками
    const pixelStart = mtx.price2Height(startPrice, 0).y;
    const pixelEnd = mtx.price2Height(startPrice + step, 0).y;
    const pixelStep = Math.abs(pixelEnd - pixelStart);
  
    // Вычисляем необходимую высоту для шрифта в пикселях
    const fontPixelHeight = fontSize * 1.2; // Коэффициент можно настроить по необходимости
  
    // Вычисляем количество рисок для пропуска между метками
    const skip = Math.max(1, Math.ceil(fontPixelHeight / pixelStep));
  
    return { startPrice, finishPrice, step, fontSize, skip };
  }
  

  /**
   * Loops over the price range and executes a callback for each price level.
   */
  protected loopOverPrices(startPrice: number, finishPrice: number, step: number, callback: (price: number) => void): void {
    for (let price = finishPrice; price > startPrice; price -= step) {
      callback(price);
    }
  }

  /**
   * Draws the selected price line and label.
   */
  protected drawSelectedPriceLine(ctx: any, mtx: Matrix, price: number): void {
    ctx.beginPath();
    const position = mtx.price2Height(price, 0);
    ctx.moveTo(position.x, position.y);
    ctx.lineTo(position.x + 10, position.y);
    ctx.stroke();

    const sscale = this.colorsService.sscale();
    const priceText = drob(price, 4).toString();
    const textRect = {
      x: position.x + 5 * sscale,
      y: position.y - 9 * sscale,
      w: (3 + priceText.length * 8) * sscale,
      h: 18 * sscale,
    };

    ctx.fillStyle = 'Linen';
    ctx.myFillRect(textRect);
    ctx.myStrokeRect(textRect);
    ctx.font = `${Math.round(12 * sscale)}px Verdana`;
    ctx.fillStyle = '#333';
    ctx.fillText(priceText, position.x + 8, position.y);
  }


  abstract draw(
    parent: FootPrintComponent,    
    view: Rectangle,
    mtx: Matrix
  ): void;

  drawVertical() {
    var parent = this.parent;
    if (
      /*FPsettings.ToolTip +++ &&*/ !parent.hiddenHint &&
      'selectedPoint' in parent.mouseAndTouchManager
    ) {
      var e = parent.mouseAndTouchManager.selectedPoint;
      this.ctx.strokeStyle = 'rgba(200, 200, 200, 0.7)';
      this.ctx.myLine(e.x, this.view.y, e.x, this.view.y + this.view.h);
      this.ctx.stroke();
    }
  }

  drawCanvas() {
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.myRect(this.view);
    this.ctx.clip();
    if ('draw' in this) {
      this.draw(this.parent, this.view, this.mtx);
    }
    this.ctx.restore();
  }
  checkPoint(point: Point) {
    var view = this.view;
    return (
      point.x >= view.x &&
      point.y >= view.y &&
      point.x <= view.x + view.w &&
      point.y <= view.y + view.h
    );
  }

  checkDraggable(point: Point) {
    if (this.draggable == null) return false;
    var view: Rectangle;
    const v = this.view;
    switch (this.draggable) {
      case DraggableEnum.Left:
        view = new Rectangle(v.x - 3, v.y, 6, v.h);
        break;
      case DraggableEnum.Right:
        view = new Rectangle(v.x + v.w - 3, v.y, 6, v.h);
        break;
      case DraggableEnum.Top:
        view = new Rectangle(v.x, v.y - 3, v.w, 6);
        break;
      case DraggableEnum.Bottom:
        view = new Rectangle(v.x, v.h + v.y - 3, v.w, 6);
        break;
      default:
        return false;
    }
    let b =
      point.x >= view.x &&
      point.y >= view.y &&
      point.x <= view.x + view.w &&
      point.y <= view.y + view.h;

    return b;
  }

  DrawZebra(
    ctx: any,
    Left: number,
    Top: number,
    Width: number,
    Height: number,
    minPrice: number,
    maxPrice: number
  ) {
    if (Height <= 0) return;
    var d = Height / (minPrice - maxPrice);
    var f = Top - d * maxPrice;
    var period = maxPrice - minPrice;
    var h = Height;
    var r = rounder((period * 25) / h);
    var s = rrounder(minPrice, r);
    var y = 0;
    ctx.font = '12px sans-serif';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = ColorsService.lineColor;
    ctx.lineWidth = 1;
    ctx.fillStyle = ColorsService.Gray1;
    var odd = 0;
    for (let y = s + r; y < maxPrice + r * 2; y += r * 2) {
      var yy = Math.floor(y * d + f) + 0.5;
      var y1 = yy;
      var y2 = yy + Math.abs(r * d);
      if (y1 < Top) y1 = Top;
      if (y2 > Top) {
        if (y2 > Height + Top) y2 = Height + Top;
        ctx.fillRect(0.5 + Left, y1, Width, y2 - y1);
      }
    }
    ctx.fillStyle = '#000000';
    for (let y = s + r; y < maxPrice; y += r) {
      var yy = Math.floor(y * d + f) + 0.5;
      ctx.moveTo(Width + Left - 7, yy);
      ctx.lineTo(Width + Left + 7, yy);
      ctx.fillText(MoneyToStr(y), Width + Left + 10, yy);
      ctx.stroke();
    }
  }
}



