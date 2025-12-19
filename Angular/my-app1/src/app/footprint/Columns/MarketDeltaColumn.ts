import { ColumnEx } from 'src/app/models/Column';
import { Matrix, Rectangle, Point } from '../matrix';
import { ColorsService } from '../service/Colors/color.service';
import { FormattingService } from '../service/Formating/formatting.service';
import { ClusterCoumnBase } from './ClusterCoumnBase';
import { ChartSettings } from 'src/app/models/ChartSettings';
import { FootPrintComponent } from '../footprint.component';

export class MarketDeltaColumn extends ClusterCoumnBase {
  constructor(parent: FootPrintComponent,  view: Rectangle, mtx: Matrix) {
    super(parent,  view, mtx);
  }

  draw(column: ColumnEx, number: number, mtx: Matrix) {
   var FPsettings: ChartSettings = this.parent.FPsettings; 
    var ctx = this.ctx;
    this.drawOpenClose(ctx, column, number, mtx);
    var z = this.getZIndexDelta(column);
    let shift: number = 0;
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
        shift = FPsettings.OpenClose ? 2 : 0;
        var r = this.clusterRect(column.cl[i].p, number, mtx);
        r.x += shift;
        r.w -= shift;
        r.w -= 1;
        ctx.myFillRect(r);
        if (column.maxDelta == Math.abs(delta))
          ctx.strokeStyle =
            delta > 0
              ? ColorsService.greencandlesat
              : ColorsService.redcandlesat;
        else ctx.strokeStyle = '#c0c0c0';
        ctx.myStrokeRect(r);
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
        var text =
          Math.round(column.cl[i].q - column.cl[i].bq) +
          'x' +
          Math.round(column.cl[i].bq);
        r.x += shift;
        ctx.fillText(text, r.x + 1.5, r.y + bar.h / 2);
      }
    }
  }
}
