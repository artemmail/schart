import { MoscowTimeShift, inttodate } from 'src/app/service/FootPrint/utils';
import { Rect } from './rect';
import { MarkUpManager } from './markup-manager';
import { Point } from '../models/matrix';


export class Strength extends Rect {
  constructor(manager: MarkUpManager, params: Record<string, any>) {
    super(manager, params);
    this.type = 'Strength';
  }

  dock() {
    this.pointArray[0].x = Math.round(this.pointArray[0].x);
    this.pointArray[1].x = Math.round(this.pointArray[1].x);
    if (this.pointArray[1].x == this.pointArray[0].x)
      this.pointArray[1].x = this.pointArray[0].x + 1;
    let ps = this.footprint.data.priceScale;
    this.pointArray[0].y = Math.round(this.pointArray[0].y / ps) * ps - ps / 2;
    this.pointArray[1].y = Math.round(this.pointArray[1].y / ps) * ps - ps / 2;
    if (this.pointArray[1].y == this.pointArray[0].y)
      this.pointArray[1].y = this.pointArray[0].y + ps;
  }
  override onMouseUp(point: Point) {
    const dockable = !!this.params?.dockable;
    if (dockable && this.pointArray.length == 2) {
      this.dock();

      let pt1 = this.baseToScreen(this.vPoints[0]);
      let pt2 = this.baseToScreen(this.vPoints[2]);

      /*
      var v1 = MoscowTimeShift(
        inttodate(
          this.footprint.viewsManager.viewMain.pointFromDevice(pt1).x
        )
      );
      var v1 = MoscowTimeShift(
        inttodate(
          this.footprint.viewsManager.viewMain.pointFromDevice(pt2).x
        )
      );
*/
      //alert(v);
    }
  }
  override drawShape() {
    let ctx = this.footprint.ctx;
    this.footprint.ctx.lineWidth = 1;
    if (this.sortPoints()) {
      let pt1 = this.baseToScreen(this.vPoints[0]);
      let pt2 = this.baseToScreen(this.vPoints[2]);

      ctx.myStrokeRect({
        x: pt1.x,
        y: pt1.y,
        w: pt2.x - pt1.x,
        h: pt2.y - pt1.y,
      });
    }
  }
}


