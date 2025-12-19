import { Matrix, Rectangle} from './../matrix';
import { viewVolumesSeparated } from './viewVolumesSeparated';
import { DraggableEnum } from 'src/app/models/Draggable';
import { ColumnEx } from '../Columns/ClusterCoumnBase';
import { ChartSettings } from 'src/app/models/ChartSettings';
import { FootPrintComponent } from '../footprint.component';

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
    //   this.DrawZebra(ctx, view.x, view.y, view.w, view.h, this.minOI, this.maxOI);

    this.DrawZebra(ctx, view.x, view.y, view.w, view.h, 0, maxOI - minOI);
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
    return { Text: 'OI', Value: this.parent.selectedCoumn.oi };
  }

  drawVolumeColumnOI(column: ColumnEx, number: number, mtx: Matrix) {
    var ctx = this.ctx;
    ctx.fillStyle = column == this.parent.selectedCoumn ? '#0A2D6D' : '#2050A8';
    ctx.mFillRectangle(number + 0.1, 0, 0.8, column.oi);
  }
}
