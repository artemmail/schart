import { ColumnEx } from 'src/app/models/Column';
import { Matrix, Rectangle } from '../matrix';

import { ClusterColumnContext, ClusterColumnBase } from './cluster-column-base';
import { ColorsService } from 'src/app/service/FootPrint/Colors/color.service';

export class DeltaVolumeColumn extends ClusterColumnBase {
  constructor(context: ClusterColumnContext, view: Rectangle, mtx: Matrix) {
    super(context, view, mtx);
  }
  draw(column: ColumnEx, number: number, mtx: Matrix, total: boolean) {
    var ctx = this.ctx;
    this.drawOpenClose(ctx, column, number, mtx);
    var maxVol = !total ? this.data.maxClusterQnt : column.qntMax;
    var maxDelta = !total ? this.data.maxDelta : column.maxDelta;
    var bar = this.getBar(mtx);
    var drawBorder = Math.abs(bar.w) > 20 && Math.abs(bar.h) > 6;
    var z = this.getZIndexVolume(column);
    for (let j = 0; j < column.cl.length; j++) {
      var i = z[j];
      if (
        column.cl[i].p >= this.startPrice &&
        column.cl[i].p <= this.finishPrice
      ) {
        var r = this.clusterRect(column.cl[i].p, number, mtx);
        var w = (column.cl[i].q * bar.w) / maxVol;
        w *= this.clusterWidthScale;
        ctx.fillStyle = 'DodgerBlue';
        ctx.myFillRect({ x: r.x + bar.w / 2, y: r.y, w: -w / 2, h: r.h });
        let qbq = 2 * column.cl[i].bq - column.cl[i].q;
        let absqbq = Math.abs(qbq);
        var w2 = (absqbq * bar.w) / Math.abs(maxDelta);
        w2 *= this.clusterWidthScale;
        ctx.fillStyle =
          qbq < 0 ? ColorsService.redcandle : ColorsService.greencandle;
        ctx.myFillRect({ x: r.x + bar.w / 2, y: r.y, w: w2 / 2, h: r.h });
        ctx.strokeStyle = '#aaa';
        if (drawBorder)
          ctx.myStrokeRect({
            x: r.x + bar.w / 2 - w / 2,
            y: r.y,
            w: (w + w2) / 2,
            h: r.h,
          });
        this.drawMaxVolumeRect(r, column, i);
      }
    }
    this.drawColumnTextDeltaTree(ctx, column, number, mtx);
  }
}


