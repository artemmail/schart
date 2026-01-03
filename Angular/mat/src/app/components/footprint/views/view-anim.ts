import { canvasPart } from './canvas-part';
import { Matrix } from './../matrix';
import { Rectangle } from './../matrix';
import { DraggableEnum } from 'src/app/models/Draggable';
import { FootPrintComponent } from '../footprint.component';
import { Point } from './../matrix';

export class viewAnim extends canvasPart {
  imgToEnd: any;
  constructor(parent: FootPrintComponent,  view: Rectangle, mtx: Matrix) {
    super(parent,  view, mtx, DraggableEnum.No);
    this.imgToEnd = new Image();
    this.imgToEnd.src = 'assets/images/toend.webp';
  }

  draw(parent: FootPrintComponent,  view: Rectangle, mtx: Matrix): void {    
    var h = (view.h - this.imgToEnd.height) / 2;
    var w = (view.w - this.imgToEnd.width) / 4;
    this.parent.ctx.drawImage(this.imgToEnd, view.x + w, view.y + h);
  }

  onTap(e: Point) {
    this.animation();
  }

  private animation(): void {
    const c = this.parent.viewsManager.mtx.clone();
    const init = this.parent.getInitMatrix(this.parent.viewsManager.clusterView, this.parent.data);
    const me = this.parent.viewsManager;
    const stime = Date.now();

    const myTimer = setInterval(() => {
      let t = (Date.now() - stime) / 800;
      t = Math.min(t, 1);
      me.mtx = c.interpolateAnim(init, t);
      me.drawClusterView();
      if (t === 1) clearInterval(myTimer);
    }, 25);
  }
}

