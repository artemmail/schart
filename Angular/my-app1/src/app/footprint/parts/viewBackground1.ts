import { canvasPart } from './canvasPart';
import { Matrix, Rectangle} from './../matrix';
import { ColorsService } from './../service/Colors/color.service';
import { DraggableEnum } from 'src/app/models/Draggable';
import { ChartSettings } from 'src/app/models/ChartSettings';
import { FootPrintComponent } from '../footprint.component';
import { MyMouseEvent } from 'src/app/models/MyMouseEvent';

export class viewBackground1 extends canvasPart {
  constructor(parent: FootPrintComponent,  view: Rectangle, mtx: Matrix) {
    super(parent,  view, mtx, DraggableEnum.No);
  }

  override draw(parent: FootPrintComponent,  view: Rectangle, mtx: Matrix): void {
    this.parent.ctx;
    var FPsettings: ChartSettings = this.parent.FPsettings; let ctx = this.parent.ctx;

    //return;
    var maxx = parent.data.totalColumn.qntMax / parent.clusterWidthScale;

    if (!FPsettings.Contracts)
      maxx = parent.data.totalColumn.volMax / parent.clusterWidthScale;

    mtx = mtx.reassignX(
      { x1: 0, x2: maxx },
      { x1: view.x, x2: view.x + view.w }
    );
    var parts = view.w / 25;
    var step = this.formatService.rounder(maxx / parts);
    ctx.beginPath();
    var x = 0;
    for (let i = 0; i < maxx; i += step) {
      ctx.fillStyle = x++ % 2 == 0 ? ColorsService.Gray1 : 'white';
      var p1 = mtx.applyToPoint(i, 0);
      var p2 = mtx.applyToPoint(i + step, 0);
      ctx.myFillRect({ x: p1.x, y: view.y, w: p2.x - p1.x, h: view.h });
    }
    ctx.stroke();
    ctx.clip();
    ctx.restore();
    ctx.strokeStyle = '#aaa';
    ctx.beginPath();

    for (let i = 0; i < maxx; i += step) {
      var p1 = mtx.applyToPoint(i, 0);
      ctx.myMoveTo(p1.x, view.y + view.h - 3);
      ctx.myLineTo(p1.x, view.y + view.h + 5);
      ctx.myLineTo(p1.x - 3, view.y + view.h + 8);
      ctx.save();
      ctx.translate(p1.x, view.y + view.h + 5);
      ctx.rotate(-Math.PI / 3.5);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#222';
      ctx.fillText(this.formatService.MoneyToStr(i), -10, 0);
      ctx.restore();
    }

    ctx.stroke();
    //ctx.restore();
  }

  

  onMouseMove(e: MyMouseEvent ) {

    let point = e.position;

    if (this.parent.markupEnabled)
      this.parent.markupManager.onMouseMove(point);
    var p: number = this.mtx.inverse().applyToPoint1(point).y;
    p =
      Math.round(p / this.parent.data.priceScale) * this.parent.data.priceScale;
    var pp = this.formatService.drob(p, 4);

    if (e.button == 0 && this.parent.selectedPrice !== pp) {
      this.parent.selectedPrice = pp;
      this.parent.drawClusterView();
    }
  }
}
