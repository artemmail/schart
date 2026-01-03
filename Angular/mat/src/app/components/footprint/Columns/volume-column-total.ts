import { ColumnEx } from 'src/app/models/Column';
import { Matrix, Rectangle } from '../matrix';

import { ClusterColumnContext, ClusterColumnBase } from './cluster-column-base';
import { ChartSettings } from 'src/app/models/ChartSettings';

export class VolumeColumnTotal extends ClusterColumnBase {
  constructor(context: ClusterColumnContext, view: Rectangle, mtx: Matrix) {
    super(context, view, mtx);
  }

  draw(column: ColumnEx, number: number, mtx: Matrix) {
    var settings: ChartSettings = this.settings;
    let ctx = this.ctx;

    var z = this.getZIndexVolume(column);
    for (let j = 0; j < column.cl.length; j++) {
      var i = z[j];
      var isMaxVol = column.cl[i].q == column.qntMax;
      ctx.strokeStyle = isMaxVol ? '#e45200' : 'DodgerBlue';
      ctx.fillStyle = isMaxVol ? 'Coral' : 'CornflowerBlue';
      var r = this.clusterRect(column.cl[i].p, number, mtx);

      var mul = settings.Contracts
        ? 1
        : this.data.volumePerQuantity * column.cl[i].p;

      if (settings.Contracts) r.w = (column.cl[i].q * r.w) / column.qntMax;
      else r.w = (mul * column.cl[i].q * r.w) / column.volMax;

      r.w *= this.clusterWidthScale;
      ctx.myFillRect(r);
      ctx.myStrokeRect(r);
    }
    this.drawColumnText(ctx, column, number, mtx);
  }
}


