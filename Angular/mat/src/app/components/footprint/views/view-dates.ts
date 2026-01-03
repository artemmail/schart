import { canvasPart } from './canvas-part';
import { Matrix, Point } from '../models/matrix';
import { Rectangle } from '../models/matrix';

import { DraggableEnum } from 'src/app/models/Draggable';
import { FootPrintComponent } from '../components/footprint/footprint.component';
import { LevelMarksService, MarkLineLevel } from 'src/app/service/FootPrint/LevelMarks/level-marks.service';
import { MyMouseEvent } from 'src/app/models/MyMouseEvent';

export class viewDates extends canvasPart {
  constructor(
    parent: FootPrintComponent,

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
    var x =  this.parent.mouseAndTouchManager.eventToPoint(this.parent.mouseAndTouchManager.panStartInfo.event.center).x;
    this.parent.translateMatrix = Matrix.fromTriangles(
      [x, y + 1, x + 1, y - 2, x + 2, y],
      [x, y + 1, x + s, y - 2, x + 2 * s, y]
    );
    this.parent.drawClusterView();
  }
  onPanEnd(e: any) {
    if (this.parent.translateMatrix != null)
      this.parent.viewsManager.mtx = this.parent.alignMatrix(
        this.parent.translateMatrix.multiply(this.parent.viewsManager.mtx)
      );
    this.parent.translateMatrix = null;
    this.parent.mouseAndTouchManager.panStartInfo = null;
  }
  
  onMouseWheel(ev: MyMouseEvent, wheelDistance: number) {
    const s = Math.pow(1.05, wheelDistance);
    const [x, y] = [ev.position.x, ev.position.y];

    var m = Matrix.fromTriangles(
      [x, y + 1, x + 1, y - 2, x + 2, y],
      [x, y + 1, x + s, y - 2, x + 2 * s, y]
    );
    this.parent.viewsManager.mtx = this.parent.alignMatrix(m.multiply(this.parent.viewsManager.mtx));
    this.parent.drawClusterView();
  }

  getDateKey(e: Point)
  {
    var p = Math.floor(this.mtx.inverse().applyToPoint(e.x, e.y).x);
    var val = this.parent.data.clusterData[p].x;
    return val.toISOString();
  }

  onTap(e: Point) {
    var sv: LevelMarksService = this.parent.levelMarksService;    
    sv.toggleDate(this.getDateKey(e));
    this.parent.drawClusterView();
  }


  onRightClick(e: Point) {
    const date = this.getDateKey(e);    
    const level = this.parent.levelMarksService.getDateMark( date);

    if(level)
     this.parent.dialogService.openLevelSettings(level).subscribe((result: MarkLineLevel) => {
      if (result) {
        
      }
    });



    //alert(JSON.stringify(priceMark));
  }

  onMouseMove(e: MyMouseEvent) {
    if (this.parent.canvas !== null)
      this.parent.canvas.style.cursor = 'pointer'; // 'w-resize';
    // this.ctx.style.cursor = 'pointer'; // 'w-resize';
  }

  draw(parent: FootPrintComponent, view: Rectangle, mtx: Matrix): void {
    var data = parent.data.clusterData;
    const ctx = this.parent.ctx;
    var fontSize = Math.max(
      9 * this.colorsService.sscale(),
      Math.min(12 * this.colorsService.sscale(), parent.getBar(mtx).w / 8)
    );

    var textDrawStride = Math.max(
      1,
      Math.floor((12 * fontSize) / parent.getBar(mtx).w)
    );
    var textDrawStride2 = Math.max(
      1,
      Math.floor(
        ((parent.params.period >= 1 ? 7 : 12) * fontSize) / parent.getBar(mtx).w
      )
    );
    ctx.fillStyle = '#333';
    ctx.font = '' + fontSize + 'px Verdana';
    ctx.textAlign = 'left';
    for (let i = parent.minIndex; i <= parent.maxIndex; i++) {
      var r = parent.clusterRect(0, i, mtx);
      var v = this.formatService.MoscowTimeShift(data[i].x);
      var drawtime = parent.params.period < 1440;
      if (i % textDrawStride2 == 0 && drawtime)
        ctx.fillText(
          parent.params.period >= 1
            ? this.formatService.TimeFormat(v)
            : this.formatService.TimeFormat2(v),
          r.x,
          view.y + fontSize + 2
        );
      if (i % textDrawStride == 0)
        ctx.fillText(
          this.formatService.toStr(v),
          r.x,
          view.y + (fontSize + 2) * (drawtime ? 2 : 1)
        );
    }
  }
}




