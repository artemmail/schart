import { takeUntil } from 'rxjs';
import { canvasPart } from './canvas-part';
import { Matrix, Point } from '../models/matrix';
import { Rectangle } from '../models/matrix';

import { DraggableEnum } from 'src/app/models/Draggable';
import type { ChartViewContext } from '../models/chart-runtime-context';
import { MarkLineLevel } from 'src/app/service/FootPrint/LevelMarks/level-marks.service';
import { MyMouseEvent } from 'src/app/models/MyMouseEvent';

export class viewDates extends canvasPart<ChartViewContext> {
  constructor(
    parent: ChartViewContext,

    view: Rectangle,
    mtx: Matrix
  ) {
    super(parent, view, mtx, DraggableEnum.No);
  }

  onPanStart(e: any) {



  }
  onPan(e: any) {
    
    var s = Math.pow(1.03, -e.deltaX / 4);
    var y = 0;
    var x =  this.parent.input.eventToPoint(this.parent.input.panStartInfo.event.center).x;
    this.parent.translateMatrix = Matrix.fromTriangles(
      [x, y + 1, x + 1, y - 2, x + 2, y],
      [x, y + 1, x + s, y - 2, x + 2 * s, y]
    );
    this.parent.requestRender();
  }
  onPanEnd(e: any) {
    if (this.parent.translateMatrix != null)
      this.parent.viewport.mtx = this.parent.alignMatrix(
        this.parent.translateMatrix.multiply(this.parent.viewport.mtx)
      );
    this.parent.translateMatrix = null;
    this.parent.input.panStartInfo = null;
  }
  
  onMouseWheel(ev: MyMouseEvent, wheelDistance: number) {
    const s = Math.pow(1.05, wheelDistance);
    const [x, y] = [ev.position.x, ev.position.y];

    var m = Matrix.fromTriangles(
      [x, y + 1, x + 1, y - 2, x + 2, y],
      [x, y + 1, x + s, y - 2, x + 2 * s, y]
    );
    this.parent.viewport.mtx = this.parent.alignMatrix(m.multiply(this.parent.viewport.mtx));
    this.parent.requestRender();
  }

  getDateKey(e: Point)
  {
    var p = Math.floor(this.mtx.inverse().applyToPoint(e.x, e.y).x);
    var val = this.parent.data.clusterData[p].x;
    return val.toISOString();
  }

  onTap(e: Point) {
    const sv = this.parent.marks;
    sv.toggleDate(this.getDateKey(e));
    this.parent.requestRender();
  }


  onRightClick(e: Point) {
    if (this.isDisposed) return;
    const date = this.getDateKey(e);    
    const level = this.parent.marks.getDateMark( date);

    if(level)
     {
      const original = new MarkLineLevel(level.comment, level.color);
      this.parent.editLevel(level, () => {
          if (this.isDisposed) return;
          this.parent.requestRender();
        })
        .pipe(takeUntil(this.disposed$))
        .subscribe((result: MarkLineLevel) => {
          if (!result) {
            level.comment = original.comment;
            level.color = original.color;
          }
          this.parent.requestRender();
        });
     }



    //alert(JSON.stringify(priceMark));
  }

  onMouseMove(e: MyMouseEvent) {
    if (this.parent.canvas !== null)
      this.parent.canvas.style.cursor = 'pointer'; // 'w-resize';
    // this.ctx.style.cursor = 'pointer'; // 'w-resize';
  }

  draw(parent: ChartViewContext, view: Rectangle, mtx: Matrix): void {
    var data = parent.data.clusterData;
    const ctx = this.parent.ctx;
    const axis = this.getTimeAxisLayout(parent, mtx);
    ctx.fillStyle = this.palette.textMuted;
    ctx.font = '' + axis.fontSize + 'px Verdana';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    for (let i = parent.minIndex; i <= parent.maxIndex; i++) {
      var r = parent.clusterRect(0, i, mtx);
      var v = this.formatService.MoscowTimeShift(data[i].x);
      if (i % axis.timeLabelStride == 0 && axis.drawTimeLabels)
        ctx.fillText(
          (parent.params?.period ?? 0) >= 1
            ? this.formatService.TimeFormat(v)
            : this.formatService.TimeFormat2(v),
          r.x,
          Math.round(view.y + axis.lineHeight)
        );
      if (i % axis.dateLabelStride == 0)
        ctx.fillText(
          this.formatService.toStr(v),
          r.x,
          Math.round(view.y + axis.lineHeight * (axis.drawTimeLabels ? 2 : 1))
        );
    }
  }
}




