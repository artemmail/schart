import { ColumnEx } from 'src/app/models/Column';
import { Matrix, Rectangle, Point } from '../matrix';
import { ColorsService } from '../service/Colors/color.service';
import { FormattingService } from '../service/Formating/formatting.service';
import { ClusterCoumnBase } from './ClusterCoumnBase';
import { FootPrintComponent } from '../footprint.component';

export class DensityDeltaColumn extends ClusterCoumnBase {
  constructor(parent: FootPrintComponent,  view: Rectangle, mtx: Matrix) {
    super(parent,  view, mtx);
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
        r.w = (column.cl[i].q * bar.w) / this.data.maxClusterQnt;
        r.w *= this.clusterWidthScale;
        var ds = column.cl[i].q / column.cl[i].ct;
        ds = Math.min(ds, this.data.maxDens);
        ds = Math.max(ds, this.data.minDens);
        if (this.data.maxDens - this.data.minDens < 0.1)
          ctx.fillStyle = '#6495ed';
        else
          ctx.fillStyle = this.colorsService.getGradientColor(
            '#ffffff',
            '#6495ed',
            (ds - this.data.minDens) / (this.data.maxDens - this.data.minDens)
          );
        ctx.strokeStyle = '#c0c0c0';
        ctx.myFillRect(r);
        if (drawBorder) {
          ctx.myFillRect(r);
          ctx.myStrokeRect(r);
        } else ctx.myFillRectSmoothX(r);
        this.drawMaxVolumeRect(r, column, i);
      }
    }
    var bar = this.getBar(mtx);
    var fontSize = this.clusterFontSize(mtx, 9);
    if (fontSize > 7) {
      ctx.font = '' + fontSize + 'px Verdana';
      ctx.textBaseline = 'middle';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = ColorsService.WhiteText;
      for (let i = 0; i < column.cl.length; i++) {
        var r = this.clusterRect(column.cl[i].p, number, mtx);
        var w = (column.cl[i].q * r.w) / this.data.maxClusterQnt;
        var text = Math.round(column.cl[i].q) + ''; //
        if (Math.abs(column.cl[i].mx) > this.data.maxt2)
          text += '/' + Math.round(column.cl[i].mx);
        ctx.fillText(text, r.x + 1.5, r.y + bar.h / 2);
      }
    }
  }
}
