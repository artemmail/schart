import { Matrix, Rectangle } from '../matrix';

import { ClusterColumnContext, ClusterCoumnBase, ColumnEx } from './ClusterCoumnBase';
import { ColorsService } from 'src/app/service/FootPrint/Colors/color.service';

export class CandleColumn extends ClusterCoumnBase {
  constructor(
    context: ClusterColumnContext,
    view: Rectangle,
    mtx: Matrix,
    private readonly getSelectedColumn: () => ColumnEx | null
  ) {
    super(context, view, mtx);
  }

  draw(column: ColumnEx, number: number, mtx: Matrix) {
    var ctx = this.ctx;
    ctx.fillStyle =
      column.o > column.c
        ? column === this.getSelectedColumn()
          ? ColorsService.redcandlesat
          : ColorsService.redcandle
        : column === this.getSelectedColumn()
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
