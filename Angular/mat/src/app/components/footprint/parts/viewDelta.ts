import { Matrix, Rectangle} from './../matrix';
import { ColorsService } from 'src/app/service/FootPrint/Colors/color.service';
import { viewVolumesSeparated } from './viewVolumesSeparated';
import { DraggableEnum } from 'src/app/models/Draggable';
import { ChartSettings } from 'src/app/models/ChartSettings';
import { FootPrintComponent } from '../footprint.component';
import { drob } from 'src/app/service/FootPrint/utils';

export class viewDelta extends viewVolumesSeparated {
  constructor(parent: FootPrintComponent,  view: Rectangle, mtx: Matrix) {
    super(parent,  view, mtx, DraggableEnum.Top);
  }

  drawDelta(parent: FootPrintComponent,  view: Rectangle, mtx: Matrix) {
    const ctx = this.parent.ctx;
    var d = (parent.data.maxCumDelta - parent.data.minCumDelta) / 10;
    var m = mtx.reassignY(
      { y1: parent.data.minCumDelta - d, y2: d + parent.data.maxCumDelta },
      { y1: view.h + view.y, y2: view.y }
    );
    function dr() {
      
      ctx.beginPath();
      for (let i = parent.minIndex; i <= parent.maxIndex; i++) {
        var y = parent.data.clusterData[i].cumDelta;
        var p = m.applyToPoint(i + 0.5, y);
        if (i != parent.minIndex) ctx.lineTo(p.x, p.y);
        else ctx.moveTo(p.x, p.y);
      }
      ctx.stroke();
    }
    var p1 = m.applyToPoint(parent.minIndex + 0.5, 0);
    var p2 = m.applyToPoint(parent.maxIndex + 0.5, 0);
    ctx.strokeStyle = '#ddd';
    ctx.beginPath();
    ctx.myLine(p1.x, p1.y, p2.x, p2.y);
    ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = ColorsService.greencandle;
    ctx.beginPath();
    ctx.myRectXY({ x: view.x, y: view.y }, { x: view.x + view.w, y: p1.y });
    ctx.clip();
    dr();
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = ColorsService.redcandle;
    ctx.beginPath();
    ctx.myRectXY(
      { x: view.x, y: p1.y },
      { x: view.x + view.w, y: view.h + view.y }
    );
    ctx.clip();
    dr();
    ctx.restore();
  }

  getLegendLine() {
    return { Text: 'Delta', Value: drob(this.parent.selectedColumn.cumDelta, 3) };
  }

  override draw(parent: FootPrintComponent,  view: Rectangle, mtx: Matrix): void {
   var FPsettings: ChartSettings = this.parent.FPsettings; let ctx = this.parent.ctx;
    var maxCumDelta = this.data.maxCumDelta;
    var minCumDelta = this.data.minCumDelta;

    if (FPsettings.ShrinkY) {
      minCumDelta = this.data.local.minCumDelta;
      maxCumDelta = this.data.local.maxCumDelta;
    }

    var d = (maxCumDelta - minCumDelta) / 10;
    maxCumDelta += d;
    minCumDelta -= d;
    ctx.restore();
    this.DrawZebra(
      ctx,
      view.x,
      view.y,
      view.w,
      view.h,
      minCumDelta,
      maxCumDelta
    );
    this.drawVertical();
    ctx.save();
    this.ctx.beginPath();
    this.ctx.myRect(this.view);
    this.ctx.clip();
    var m = mtx.reassignY(
      { y1: minCumDelta, y2: maxCumDelta },
      { y1: view.h + view.y, y2: view.y }
    );
    function dr() {
      ctx.beginPath();
      for (let i = parent.minIndex; i <= parent.maxIndex; i++) {
        var y = parent.data.clusterData[i].cumDelta;
        var p = m.applyToPoint(i + 0.5, y);
        if (i != parent.minIndex) ctx.lineTo(p.x, p.y);
        else ctx.moveTo(p.x, p.y);
      }
      ctx.stroke();
    }
    var p1 = m.applyToPoint(parent.minIndex + 0.5, 0);
    var p2 = m.applyToPoint(parent.maxIndex + 0.5, 0);
    ctx.strokeStyle = '#ddd';
    ctx.beginPath();
    ctx.myLine(p1.x, p1.y, p2.x, p2.y);
    ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = ColorsService.greencandle;
    ctx.beginPath();
    ctx.myRectXY({ x: view.x, y: view.y }, { x: view.x + view.w, y: p1.y });
    ctx.clip();
    dr();
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = ColorsService.redcandle;
    ctx.beginPath();
    ctx.myRectXY(
      { x: view.x, y: p1.y },
      { x: view.x + view.w, y: view.h + view.y }
    );
    ctx.clip();
    dr();
    ctx.restore();
  }
}
