import { canvasPart } from './canvasPart';
import { Matrix } from './../matrix';
import { Rectangle } from './../matrix';
import { DraggableEnum } from 'src/app/models/Draggable';
import { FootPrintComponent } from '../footprint.component';
import { Point } from 'transformation-matrix';

export class viewAnim extends canvasPart {
  imgToEnd: any;
  constructor(parent: FootPrintComponent,  view: Rectangle, mtx: Matrix) {
    super(parent,  view, mtx, DraggableEnum.No);
    this.imgToEnd = new Image();
    this.imgToEnd.src = 'assets/images/toend.png';
  }

  draw(parent: FootPrintComponent,  view: Rectangle, mtx: Matrix): void {    
    var h = (view.h - this.imgToEnd.height) / 2;
    var w = (view.w - this.imgToEnd.width) / 4;
    this.parent.ctx.drawImage(this.imgToEnd, view.x + w, view.y + h);
  }

  onTap(e: Point) {
    this.animation();
  }

  animation() {
    var c = this.parent.mtx.clone();
    var init = this.parent.getInitMatrix(
      this.parent.clusterView,
      this.parent.data
    );
    var me = this.parent;
    var stime = new Date().getTime();
    var myTimer = setInterval(function () {
      var t = (new Date().getTime() - stime) / 800;
      t = t > 1 ? 1 : t;
      me.mtx = c.interpolateAnim(init, t);
      me.drawClusterView();
      if (t == 1) clearInterval(myTimer);
      t += 0.01;
    }, 25);
  }
}
