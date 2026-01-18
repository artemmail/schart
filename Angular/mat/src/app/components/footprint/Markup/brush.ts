import { Point } from '../models/matrix';

import { MarkUpManager } from './markup-manager';
import { Shape } from './shape';

export class Brush extends Shape {
  constructor(manager: MarkUpManager, params: Record<string, any>) {
    super(manager, params);
    this.type = 'Brush';
  }
  override onMouseDownMove(point: Point) {
    this.pointArray.push(this.screenToBase(point));
  }

  override onMouseUp(point: Point): void {}
  override drawShape() {
    const width = typeof this.params?.width === 'number' ? this.params.width : 1;
    const color = typeof this.params?.color === 'string' ? this.params.color : this.getSelectionColor();
    this.footprint.ctx.lineWidth = width;
    this.footprint.ctx.strokeStyle = color;
    this.footprint.ctx.beginPath();
    for (let i = 0; i < this.pointArray.length; i++) {
      let p = this.baseToScreen(this.pointArray[i]);
      if (i == 0) this.footprint.ctx.moveTo(p.x, p.y);
      else this.footprint.ctx.lineTo(p.x, p.y);
    }
    this.footprint.ctx.stroke();
  }
}


