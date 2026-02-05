import { Matrix, Rectangle } from '../models/matrix';

import { ClusterColumnContext, ClusterColumnBase, ColumnEx } from './cluster-column-base';

export class CandleColumn extends ClusterColumnBase {
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
    const minPx = Math.max(1, Math.round(this.colorsService.sscale()));
    const isDown = column.o > column.c;
    const isSelected = column === this.getSelectedColumn();
    const candleColor = isDown
      ? isSelected
        ? this.palette.downStrong
        : this.palette.down
      : isSelected
      ? this.palette.upStrong
      : this.palette.up;
    ctx.fillStyle = candleColor;
    ctx.strokeStyle = candleColor;
    ctx.beginPath();
    var r1 = mtx.price2Height(column.h, number);
    var r2 = mtx.price2Height(column.l, number);
    const wickRange = this.normalizeYRange(r1.y, r2.y, minPx);
    let w = this.getBar(mtx).w;
    ctx.myLine(r1.x + w / 2, wickRange.y1, r1.x + w / 2, wickRange.y2);
    ctx.stroke();
    var r1 = mtx.price2Height(column.o, number);
    w = this.getBar(mtx).w;
    var r2 = mtx.price2Height(column.c, number);
    ctx.strokeStyle =
      column.o > column.c
        ? this.palette.downBorder
        : this.palette.upBorder;
    const bodyRange = this.normalizeYRange(r1.y, r2.y, minPx);
    const top = Math.min(bodyRange.y1, bodyRange.y2);
    const height = Math.abs(bodyRange.y2 - bodyRange.y1);
    var nr = { x: r1.x + w * 0.15, w: w * 0.7, y: top, h: height };
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



