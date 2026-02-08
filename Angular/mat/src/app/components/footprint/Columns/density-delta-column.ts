import { ColumnEx } from 'src/app/models/Column';
import { Matrix, Rectangle } from '../models/matrix';

import { ClusterColumnContext, ClusterColumnBase } from './cluster-column-base';
import { drob } from 'src/app/service/FootPrint/utils';

export class DensityDeltaColumn extends ClusterColumnBase {
  constructor(context: ClusterColumnContext, view: Rectangle, mtx: Matrix) {
    super(context, view, mtx);
  }

  draw(column: ColumnEx, number: number, mtx: Matrix) {
    var ctx = this.ctx;
    this.drawOpenClose(ctx, column, number, mtx);
    var bar = this.getBar(mtx);
    var drawBorder = true; // Math.abs(bar.w) > 20 && Math.abs(bar.h) > 6;
    var z = this.getZIndexDensity(column);
    for (let j = 0; j < column.cl.length; j++) {
      var i = z[j];
      if (
        column.cl[i].p >= this.startPrice &&
        column.cl[i].p <= this.finishPrice
      ) {
        var r = this.clusterRect(column.cl[i].p, number, mtx);
        r.w = (column.cl[i].q * bar.w) / this.stats.qntMax;
        r.w *= this.clusterWidthScale;
        var ds =
          column.cl[i].ct !== 0 ? column.cl[i].q / column.cl[i].ct : 0;
        ds = Math.min(ds, this.stats.maxDens);
        ds = Math.max(ds, this.stats.minDens);
        if (this.stats.maxDens - this.stats.minDens < 0.1)
          ctx.fillStyle = this.palette.accentSoft;
        else
          ctx.fillStyle = this.colorsService.getGradientColor(
            this.palette.bg,
            this.palette.accentSoft,
            (ds - this.stats.minDens) / (this.stats.maxDens - this.stats.minDens)
          );
        ctx.strokeStyle = this.palette.gridSoft;
        if (drawBorder) {
          ctx.myFillRect(r);
          ctx.myStrokeRect(r);
        } else ctx.myFillRectSmoothX(r);
        this.drawMaxVolumeRect(r, column, i);
      }
    }
    var fontSize = this.clusterFontSize(mtx, 5);
    if (fontSize > 7) {
      ctx.font = '' + fontSize + 'px Verdana';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = this.palette.text;
      for (let i = 0; i < column.cl.length; i++) {
        var r = this.clusterRect(column.cl[i].p, number, mtx);
        var w = (column.cl[i].q * r.w) / this.stats.qntMax;
        ctx.fillText(
          drob(
            column.cl[i].ct !== 0 ? column.cl[i].q / column.cl[i].ct : 0,
            3
          ).toString(),
          r.x + 1.5,
          r.y + bar.h / 2
        );
      }
    }
  }
}



