
import { Point } from '../models/matrix';

import { Brush } from './brush';
import { MarkUpManager } from './markup-manager';

export class Line extends Brush {
  constructor(manager: MarkUpManager, params: Record<string, any>) {
    super(manager, params);
    this.type = 'Line';
  }
  override onMouseDownMove(point: Point) {
    let p = this.screenToBase(point);
    if (this.pointArray.length < 2) this.pointArray.push(p);
    else this.pointArray[1] = p;
  }
  override drawShape() {
    super.drawShape();
    const arrow = !!this.params?.arrow;
    const width = typeof this.params?.width === 'number' ? this.params.width : 1;
    const color = typeof this.params?.color === 'string' ? this.params.color : this.getSelectionColor();
    if (arrow && this.pointArray.length == 2) {
      let w1 = width + 3;
      let p = this.baseToScreen(this.pointArray[0]);
      let p2 = this.baseToScreen(this.pointArray[1]);
      this.footprint.ctx.beginPath();
      this.footprint.ctx.ArrowHead(p.x, p.y, p2.x, p2.y, w1 * 2, w1);
      this.footprint.ctx.closePath();
      this.footprint.ctx.fillStyle = color;
      this.footprint.ctx.fill();
      this.footprint.ctx.stroke();
    }
  }
}


