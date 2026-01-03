import { DraggableEnum } from 'src/app/models/Draggable';
import { ColumnEx } from '../columns/cluster-column-base';
import { Matrix, Rectangle } from './../matrix';
import { ColorsService } from 'src/app/service/FootPrint/Colors/color.service';
import { viewVolumesSeparated } from './view-volumes-separated';
import { ChartSettings } from 'src/app/models/ChartSettings';
import { FootPrintComponent } from '../footprint.component';
import { drob } from 'src/app/service/FootPrint/utils';

export class viewDeltaBars extends viewVolumesSeparated {
  constructor(parent: FootPrintComponent, view: Rectangle, mtx: Matrix) {
    super(parent, view, mtx, DraggableEnum.Top);
  }

  override draw(
    parent: FootPrintComponent,
    view: Rectangle,
    mtx: Matrix
  ): void {
    var FPsettings: ChartSettings = this.parent.FPsettings;
    let ctx = this.parent.ctx;
    if (FPsettings.ShrinkY) {
      this.data.maxDeltaBar = this.data.local.maxDeltaBar;
      this.data.minDeltaBar = this.data.local.minDeltaBar;
    }

    let maxDeltaBar = this.data.maxDeltaBar;
    let minDeltaBar = this.data.minDeltaBar;
    var d = (maxDeltaBar - minDeltaBar) / 10;
    maxDeltaBar += d;
    minDeltaBar -= d;

    ctx.restore();
    this.DrawZebra(
      ctx,
      view.x,
      view.y,
      view.w,
      view.h,
      minDeltaBar,
      maxDeltaBar
    );
    ctx.save();
    this.ctx.beginPath();
    this.ctx.myRect(this.view);
    this.ctx.clip();
    mtx = mtx.reassignY(
      { y1: minDeltaBar, y2: maxDeltaBar },
      { y2: view.y, y1: view.y + view.h }
    );
    ctx.setMatrix(mtx);
    var data = parent.data.clusterData;
    this.drawVertical();
    for (let i = parent.minIndex; i <= parent.maxIndex; i++) {
      this.drawVolumeColumnOI(data[i], i, mtx);
    }
  }

  getLegendLine() {
    return {
      Text: 'Buy-Sell',
      Value: drob(2 * this.parent.selectedColumn.bq - this.parent.selectedColumn.q, 3),
    };
  }

  drawVolumeColumnOI(column: ColumnEx, number: number, mtx: Matrix) {
    var ctx = this.ctx;

    if (2 * column.bq - column.q > 0)
      ctx.fillStyle =
        column == this.parent.selectedColumn
          ? ColorsService.greencandlesat
          : ColorsService.greencandle;
    else
      ctx.fillStyle =
        column == this.parent.selectedColumn
          ? ColorsService.redcandlesat
          : ColorsService.redcandle;

    ctx.mFillRectangle(number + 0.1, 0, 0.8, 2 * column.bq - column.q);
  }
}


