import { Matrix, Rectangle} from '../models/matrix';
import { viewVolumesSeparated } from './view-volumes-separated';
import { DraggableEnum } from 'src/app/models/Draggable';
import { ColumnEx } from '../columns/cluster-column-base';
import { ChartSettings } from 'src/app/models/ChartSettings';
import { FootPrintComponent } from '../components/footprint/footprint.component';
import { drob } from 'src/app/service/FootPrint/utils';

export class viewOI extends viewVolumesSeparated {
  constructor(parent: FootPrintComponent,  view: Rectangle, mtx: Matrix) {
    super(parent,  view, mtx, DraggableEnum.Top);
  }

  override draw(
    parent: FootPrintComponent,
    
    view: Rectangle,
    mtx: Matrix
  ): void {
    var FPsettings: ChartSettings = this.parent.FPsettings; let ctx = this.parent.ctx;
    if (FPsettings.ShrinkY) {
      this.data.maxOI = this.data.local.maxOI;
      this.data.minOI = this.data.local.minOI;
    }

    let maxOI = this.data.maxOI;
    let minOI = this.data.minOI;
    var d = (maxOI - minOI) / 10;
    maxOI += d;
    minOI -= d;

    ctx.restore();
    this.DrawZebra(ctx, view.x, view.y, view.w, view.h, minOI, maxOI);
    ctx.save();
    this.ctx.beginPath();
    this.ctx.myRect(this.view);
    this.ctx.clip();

    mtx = mtx.reassignY(
      { y1: minOI, y2: maxOI },
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
    const label = this.parent.FPsettings.OIDeltaDivideBy2 ? 'OI/2' : 'OI';
    return { Text: label, Value: drob(this.parent.selectedColumn.oi, 3) };
  }

  drawVolumeColumnOI(column: ColumnEx, number: number, mtx: Matrix) {
    var ctx = this.ctx;
    const baseOi = this.data.minOI ?? 0;
    ctx.fillStyle = column == this.parent.selectedColumn ? '#0A2D6D' : '#2050A8';
    ctx.mFillRectangle(number + 0.1, baseOi, 0.8, column.oi - baseOi);
  }
}





