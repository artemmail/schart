import { ColumnEx } from 'src/app/models/Column';
import { Matrix, Rectangle, Point } from '../matrix';

import { ClusterCoumnBase } from './ClusterCoumnBase';
import { ChartSettings } from 'src/app/models/ChartSettings';
import { FootPrintComponent } from '../footprint.component';

export class VolumeColumnTotal extends ClusterCoumnBase {
  constructor(parent: FootPrintComponent,  view: Rectangle, mtx: Matrix) {
    super(parent,  view, mtx);
  }

  draw(column: ColumnEx, number: number, mtx: Matrix) {
   var FPsettings: ChartSettings = this.parent.FPsettings; let ctx = this.parent.ctx;
    
    var z = this.getZIndexVolume(column);
    for (let j = 0; j < column.cl.length; j++) {
      var i = z[j];
      var isMaxVol = column.cl[i].q == column.qntMax;
      ctx.strokeStyle = isMaxVol ? '#e45200' : 'DodgerBlue';
      ctx.fillStyle = isMaxVol ? 'Coral' : 'CornflowerBlue';
      var r = this.clusterRect(column.cl[i].p, number, mtx);

      var mul = FPsettings.Contracts
        ? 1
        : this.data.volumePerQuantity * column.cl[i].p;

      if (FPsettings.Contracts) r.w = (column.cl[i].q * r.w) / column.qntMax;
      else r.w = (mul * column.cl[i].q * r.w) / column.volMax;

      r.w *= this.clusterWidthScale;
      ctx.myFillRect(r);
      ctx.myStrokeRect(r);
    }
    this.drawColumnText(ctx, column, number, mtx);
  }
}
