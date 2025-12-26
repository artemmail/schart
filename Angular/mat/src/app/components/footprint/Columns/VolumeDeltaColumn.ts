import { ChartSettings } from 'src/app/models/ChartSettings';
import { Matrix, Rectangle } from '../matrix';

import { ClusterColumnContext, ClusterCoumnBase, ColumnEx } from './ClusterCoumnBase';
import { ColorsService } from 'src/app/service/FootPrint/Colors/color.service';
import { drob } from 'src/app/service/FootPrint/utils';

export class VolumeDeltaColumn extends ClusterCoumnBase {
  constructor(context: ClusterColumnContext, view: Rectangle, mtx: Matrix) {
    super(context, view, mtx);
  }

  draw(column: ColumnEx, number: number, mtx: Matrix) {
    var settings: ChartSettings = this.settings;
    let ctx = this.ctx;

    this.drawOpenClose(ctx, column, number, mtx);
    let z = this.getZIndexDelta(column);
    let ww = 0;
    var shift = settings.OpenClose ? 2 : 0;
    for (let j = 0; j < column.cl.length; j++) {
      var i = z[j];
      if (
        column.cl[i].p >= this.startPrice &&
        column.cl[i].p <= this.finishPrice
      ) {
        var delta = 2 * column.cl[i].bq - column.cl[i].q;
        ctx.fillStyle = this.colorsService.getGradientColorEx(
          '#d61800',
          '#ffffff',
          '#04a344',
          this.data.maxDelta,
          delta
        );
        var r = this.clusterRect(column.cl[i].p, number, mtx);
        r.x += shift;
        r.w -= shift;
        r.w -= 1;
        r.w /= 2;
        r.x += r.w;
        ww = r.w;
        ctx.myFillRect(r);
        ctx.fillStyle = this.colorsService.getGradientColorEx(
          '#d61800',
          '#ffffff',
          '#6495ED',
          this.data.maxClusterQnt,
          column.cl[i].q
        );
        r.x -= r.w;
        ctx.myFillRect(r);
        r.w--;
        ctx.strokeStyle = '#c0c0c0';
        ctx.myStrokeRect(r);
        r.w++;
        r.x += r.w;
        if (column.maxDelta == Math.abs(delta))
          ctx.strokeStyle =
            delta > 0
              ? ColorsService.greencandlesat
              : ColorsService.redcandlesat;
        else ctx.strokeStyle = '#c0c0c0';
        ctx.myStrokeRect(r);
        this.drawMaxVolumeRect(
          this.clusterRect(column.cl[i].p, number, mtx),
          column,
          i
        );
      }
    }
    z = this.getZIndexVolume(column);
    let zz = z[z.length - 1];
    var r = this.clusterRect(column.cl[zz].p, number, mtx);
    r.x += shift;
    r.w = ww - 1;
    ctx.strokeStyle = 'DodgerBlue';
    ctx.myStrokeRect(r);
    var bar = this.getBar(mtx);
    var fontSize = this.clusterFontSize(mtx, 9);
    if (fontSize > 7) {
      ctx.font = '' + fontSize + 'px Verdana';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = ColorsService.WhiteText;
      for (let i = 0; i < column.cl.length; i++) {
        var r = this.clusterRect(column.cl[i].p, number, mtx);
        var w = (column.cl[i].q * r.w) / this.data.maxClusterQnt;
        r.x += shift;
        var delta = 2 * column.cl[i].bq - column.cl[i].q;
        ctx.fillText(drob(column.cl[i].q, 3).toString(), r.x + 1.5, r.y + bar.h / 2);
        r.x += ww;
        ctx.fillText(drob(delta, 3).toString(), r.x + 1.5, r.y + bar.h / 2);
      }
    }
  }
}
