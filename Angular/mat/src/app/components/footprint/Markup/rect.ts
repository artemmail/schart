import { Point } from '../models/matrix';

import { MarkUpManager } from './markup-manager';
import { Line } from './line';

export class Rect extends Line {
  vPoints: { x: number; y: number }[];
  selPointX: Point;
  selPointY: Point;
  constructor(manager: MarkUpManager) {
    super(manager);
    this.type = 'Rect';
    this.controlMap = {
      color: true,
      width: true,
      font: false,
      id: false,
      text: false,
      arrow: false,
      toolbar: false,
      profile: false,
    };
    this.getFromModel();
  }
  override getFromModel() {
    this.color = this.model.color;
    this.width = this.model.width;
  }
  override setToModel() {
    this.model.color= this.color;
    this.model.width= this.width;
  }
  override sortPoints() {
    let ps = this.pointArray;
    if (ps.length == 2) {
      let p1 = { x: Math.min(ps[0].x, ps[1].x), y: Math.min(ps[0].y, ps[1].y) };
      let p2 = { x: Math.max(ps[0].x, ps[1].x), y: Math.max(ps[0].y, ps[1].y) };
      this.vPoints = [p1, { x: p2.x, y: p1.y }, p2, { x: p1.x, y: p2.y }];
      ///optimization
      let pt = this.baseToScreen(p2);
      let v = this.footprint.viewsManager.viewMain.view;
      if (pt.x < v.x || pt.y > v.y + v.h) return false;
      pt = this.baseToScreen(p1);
      if (pt.x > v.x + v.w || pt.y < v.y) return false;
      ///optimization
      return true;
    }
    return false;
  }
  override selectedPoint(point: Point) {
    this.sortPoints();
    return this.selectedPoint_(point, this.vPoints);
  }
 strokeRect() {
    if (this.pointArray.length == 2) {
      let pt1 = this.baseToScreen(this.vPoints[0]);
      let pt2 = this.baseToScreen(this.vPoints[2]);
      this.footprint.ctx.myStrokeRect({
        x: pt1.x,
        y: pt1.y,
        w: pt2.x - pt1.x,
        h: pt2.y - pt1.y,
      });
    }
  }
  override drawShape() {
    if (this.sortPoints()) {
      this.footprint.ctx.lineWidth = this.width;
      this.footprint.ctx.strokeStyle = this.color;
      this.strokeRect();
    }
  }
  override drawSelection() {
    this.footprint.ctx.fillStyle = this.color;
    for (let px of this.vPoints) {
      let p = this.baseToScreen(px);
      this.footprint.ctx.fillRect(p.x - 4, p.y - 4, 8, 8);
    }
  }
  override onStartMovePoint(point: Point) {
    super.onStartMovePoint(point);
    if (this.selPoint != null) {
      this.selPointX =
        this.pointArray[0].x == this.selPoint.x
          ? this.pointArray[0]
          : this.pointArray[1];
      this.selPointY =
        this.pointArray[0].y == this.selPoint.y
          ? this.pointArray[0]
          : this.pointArray[1];
    }
    this.mouseDown = point;
  }
  override movePoint(mouseDown: Point, mouseMove: Point) {
    let p = this.screenToBaseDelta(mouseDown, mouseMove);
    this.selPointX.x += p.x;
    this.selPointY.y += p.y;
  }
  override onMovePoint(point: Point) {
    if (this.selPoint != null) this.movePoint(this.mouseDown, point);
    else this.movePoints(this.mouseDown, point);
    this.mouseDown = point;
  }
}


