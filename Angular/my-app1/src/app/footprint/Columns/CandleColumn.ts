import { Matrix, Rectangle, Point } from '../matrix';
import { ColorsService } from '../service/Colors/color.service';
import { FormattingService } from '../service/Formating/formatting.service';
import { ClusterCoumnBase, ColumnEx } from './ClusterCoumnBase';
import { FootPrintComponent } from '../footprint.component';

export class CandleColumn extends ClusterCoumnBase {
  constructor(parent: FootPrintComponent,  view: Rectangle, mtx: Matrix) {
    super(parent,  view, mtx);
  }

  draw(column: ColumnEx, number: number, mtx: Matrix) {
    var ctx = this.ctx;
    //  var Max = Math.max.apply(0, column.p);
    // var Min = Math.min.apply(0, column.p);
    ctx.fillStyle =
      column.o > column.c
        ? column == this.parent.selectedCoumn
          ? ColorsService.redcandlesat
          : ColorsService.redcandle
        : column == this.parent.selectedCoumn
        ? ColorsService.greencandlesat
        : ColorsService.greencandle;
    ctx.beginPath();
    var r1 = mtx.price2Height(column.h, number);
    var r2 = mtx.price2Height(column.l, number);
    let w = this.getBar(mtx).w;
    ctx.myLine(r1.x + w / 2, r1.y, r1.x + w / 2, r2.y);
    ctx.stroke();
    var r1 = mtx.price2Height(column.o, number);
    w = this.getBar(mtx).w;
    var r2 = mtx.price2Height(column.c, number);
    ctx.strokeStyle =
      column.o > column.c
        ? ColorsService.redCandleBorder
        : ColorsService.greenCandleBorder;
    var nr = { x: r1.x + w * 0.15, w: w * 0.7, y: r2.y, h: r1.y - r2.y };
    ctx.myFillRect(nr);
    ctx.myStrokeRect(nr);
    if (!!column.cl)
      for (let i = 0; i < column.cl.length; i++) {
        var r = this.clusterRect(column.cl[i].p, number, mtx);
        r.x += r.w / 2;
        this.drawMaxVolumeRect(r, column, i);
      }
  }
}
