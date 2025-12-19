import { DraggableEnum } from 'src/app/models/Draggable';
import { Matrix } from './../matrix';
import { Point } from './../matrix';
import { Rectangle } from './../matrix';
import { ColorsService } from './../service/Colors/color.service';
import { FormattingService } from './../service/Formating/formatting.service';
import { FootPrintComponent } from '../footprint.component';

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

  abstract draw(
    parent: FootPrintComponent,    
    view: Rectangle,
    mtx: Matrix
  ): void;

  drawVertical() {
    var parent = this.parent;
    if (
      /*FPsettings.ToolTip +++ &&*/ !parent.hiddenHint &&
      'selectedPoint' in parent
    ) {
      var e = parent.selectedPoint;
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
    var r = this.formatService.rounder((period * 25) / h);
    var s = this.formatService.rrounder(minPrice, r);
    var y = 0;
    ctx.font = '12px sans-serif';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = ColorsService.lineColor;
    ctx.lineWidth = 1;
    ctx.fillStyle = '#f5f5f5';
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
      ctx.fillText(this.formatService.MoneyToStr(y), Width + Left + 10, yy);
      ctx.stroke();
    }
  }
}
