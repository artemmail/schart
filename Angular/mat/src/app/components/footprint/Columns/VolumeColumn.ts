import { ColumnEx } from 'src/app/models/Column';
import { Matrix, Rectangle } from '../matrix';

import { ClusterColumnContext, ClusterCoumnBase } from './ClusterCoumnBase';
import { ChartSettings } from 'src/app/models/ChartSettings';
import { LevelMarksService } from 'src/app/service/FootPrint/LevelMarks/level-marks.service';

export class VolumeColumn extends ClusterCoumnBase {
  private readonly filters: any;

  constructor(
    context: ClusterColumnContext,
    view: Rectangle,
    mtx: Matrix,
    levelMarksService: LevelMarksService | null
  ) {
    super(context, view, mtx);
    this.filters = levelMarksService?.getFilters() ?? null;
  }

  draw(column: ColumnEx, number: number, mtx: Matrix) {
    var settings: ChartSettings = this.settings;
    var ctx = this.ctx;
    this.drawOpenClose(ctx, column, number, mtx);
    var z = this.getZIndexVolume(column);
    var bar = this.getBar(mtx);
    var drawBorder = Math.abs(bar.w) > 20 && Math.abs(bar.h) > 6;

    for (let j = 0; j < column.cl.length; j++) {
      var i = z[j];
      if (
        column.cl[i].p >= this.startPrice &&
        column.cl[i].p <= this.finishPrice
      ) {
        var mul = settings.Contracts
          ? 1
          : this.data.volumePerQuantity * column.cl[i].p;

        if (
          this.filters !== null &&
          (this.filters.volume1 != 0 || this.filters.volume2 != 0)
        ) {
          const { volume1, volume2 } = this.filters;
          const volumeQ = column.cl[i].q;

          ctx.strokeStyle = 'DodgerBlue';
          ctx.fillStyle = 'CornflowerBlue';

          if (volume2 > volume1) {
            if (volumeQ >= volume2) {
              ctx.strokeStyle = 'GoldenRod';
              ctx.fillStyle = 'Gold';
            } else if (volume1 > 0 && volumeQ >= volume1) {
              ctx.strokeStyle = '#e45200';
              ctx.fillStyle = 'Coral';
            }
          } else {
            if (volumeQ >= volume1) {
              ctx.strokeStyle = '#e45200';
              ctx.fillStyle = 'Coral';
            } else if (volume2 > 0 && volumeQ >= volume2) {
              ctx.strokeStyle = 'GoldenRod';
              ctx.fillStyle = 'Gold';
            }
          }
        } else {
          var isMaxVol = column.cl[i].q == column.qntMax;
          ctx.strokeStyle = isMaxVol ? '#e45200' : 'DodgerBlue';
          ctx.fillStyle = isMaxVol ? 'Coral' : 'CornflowerBlue';
        }
        var r = this.clusterRect(column.cl[i].p, number, mtx);

        if (settings.Contracts)
          r.w = (column.cl[i].q * r.w) / this.data.maxClusterQnt;
        else r.w = (mul * column.cl[i].q * r.w) / this.data.maxClusterVol;

        r.w *= this.clusterWidthScale;
        if (drawBorder) {
          ctx.myFillRect(r);
          ctx.myStrokeRect(r);
        } else ctx.myFillRectSmoothX(r);
        this.drawMaxVolumeRect(r, column, i);
      }
    }
    this.drawColumnText(ctx, column, number, mtx);
  }
}
