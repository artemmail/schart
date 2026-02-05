import { Matrix, Rectangle } from '../models/matrix';
import { ClusterColumnContext, ClusterColumnBase, ColumnEx } from './cluster-column-base';

export class BarColumn extends ClusterColumnBase {
  constructor(context: ClusterColumnContext, view: Rectangle, mtx: Matrix) {
    super(context, view, mtx);
  }

  draw(column: ColumnEx, number: number, mtx: Matrix) {
    var ctx = this.ctx;
    const minPx = Math.max(1, Math.round(this.colorsService.sscale()));
    var r1 = mtx.price2Height(column.h, number);
    var r2 = mtx.price2Height(column.l, number);
    const wickRange = this.normalizeYRange(r1.y, r2.y, minPx);
    let w = this.getBar(mtx).w;
    ctx.strokeStyle =
      column.o > column.c ? this.palette.down : this.palette.up;
    let ww = Math.max(1, Math.min(5, 1 + (w - 5) / 10.0));
    if (ww > 3 || ww < 1.4) ww = Math.round(ww);
    ctx.lineWidth = ww;
    ctx.beginPath();
    let cent = r1.x + w / 2;
    ctx.myLine(cent, wickRange.y1, cent, wickRange.y2);
    var r1 = mtx.price2Height(column.o, number);
    var r2 = mtx.price2Height(column.c, number);
    const bodyRange = this.normalizeYRange(r1.y, r2.y, minPx);
    ctx.myLine(r1.x, bodyRange.y1, cent, bodyRange.y1);
    ctx.myLine(r1.x + w, bodyRange.y2, cent, bodyRange.y2);
    ctx.stroke();
    ctx.lineWidth = 1;
    if (!!column.cl)
      for (let i = 0; i < column.cl.length; i++) {
        var r = this.clusterRect(column.cl[i].p, number, mtx);
        r.x += r.w / 2 - ww / 2;
        this.drawMaxVolumeRect(r, column, i);
      }
  }
}



