import { DraggableEnum } from 'src/app/models/Draggable';
import { ColumnEx } from '../Columns/ClusterCoumnBase';
import { Matrix, Rectangle} from './../matrix';
import { viewVolumesSeparated } from './viewVolumesSeparated';
import { ChartSettings } from 'src/app/models/ChartSettings';
import { FootPrintComponent } from '../footprint.component';

export class viewOIDelta extends viewVolumesSeparated {
  constructor(parent: FootPrintComponent,  view: Rectangle, mtx: Matrix) {
    super(parent,  view, mtx, DraggableEnum.Top);
  }

  override draw(parent: FootPrintComponent,  view: Rectangle, mtx: Matrix): void {
   var FPsettings: ChartSettings = this.parent.FPsettings; let ctx = this.parent.ctx;
    if (FPsettings.ShrinkY) {
      this.data.maxOIDelta = this.data.local.maxOIDelta;
      this.data.minOIDelta = this.data.local.minOIDelta;
    }

    let maxOIDelta = this.data.maxOIDelta;
    let minOIDelta = this.data.minOIDelta;
    var d = (maxOIDelta - minOIDelta) / 10;
    maxOIDelta += d;
    minOIDelta -= d;

    ctx.restore();
    this.DrawZebra(ctx, view.x, view.y, view.w, view.h, minOIDelta, maxOIDelta);
    ctx.save();
    this.ctx.beginPath();
    this.ctx.myRect(this.view);
    this.ctx.clip();

    mtx = mtx.reassignY(
      { y1: minOIDelta, y2: maxOIDelta },
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
    return { Text: 'OIDelta', Value: this.parent.selectedCoumn.oiDelta };
  }

  drawVolumeColumnOI(column: ColumnEx, number: number, mtx: Matrix) {
    var ctx = this.ctx;
    ctx.fillStyle = column == this.parent.selectedCoumn ? '#0A2D6D' : '#2050A8';
    ctx.mFillRectangle(number + 0.1, 0, 0.8, column.oiDelta);
  }
}
