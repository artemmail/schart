import { canvasPart } from './canvas-part';
import { Matrix, Rectangle} from '../models/matrix';
import { ColorsService } from 'src/app/service/FootPrint/Colors/color.service';
import { DraggableEnum } from 'src/app/models/Draggable';
import { ChartSettings } from 'src/app/models/ChartSettings';
import { FootPrintComponent } from '../components/footprint/footprint.component';
import { MyMouseEvent } from 'src/app/models/MyMouseEvent';
import { rounder } from 'src/app/service/FootPrint/Formating/formatting.service';
import { drob, MoneyToStr } from 'src/app/service/FootPrint/utils';

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
    var step = rounder(maxx / parts);
    ctx.fillStyle = ColorsService.Gray2;
    ctx.myFillRect({ x: view.x, y: view.y, w: view.w, h: view.h });
    const prevStrokeStyle = ctx.strokeStyle;
    const prevLineWidth = ctx.lineWidth;
    const prevLineDash = ctx.getLineDash ? ctx.getLineDash() : null;
    ctx.setLineDash([5, 3, 5]);
    ctx.strokeStyle = 'rgba(0,0,0,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= maxx; i += step) {
      var p1 = mtx.applyToPoint(i, 0);
      ctx.myLine(p1.x, view.y, p1.x, view.y + view.h);
    }
    ctx.stroke();
    if (prevLineDash) ctx.setLineDash(prevLineDash);
    else ctx.setLineDash([]);
    ctx.strokeStyle = prevStrokeStyle;
    ctx.lineWidth = prevLineWidth;
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
      ctx.fillText(MoneyToStr(i), -10, 0);
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
    var pp = drob(p, 4);

    if (e.button == 0 && this.parent.selectedPrice !== pp) {
      this.parent.selectedPrice = pp;
      this.parent.drawClusterView();
    }
  }
}




