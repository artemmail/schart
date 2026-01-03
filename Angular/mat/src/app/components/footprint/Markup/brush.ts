import { Point } from '../models/matrix';

import { MarkUpManager } from './markup-manager';
import { Shape } from './shape';

export class Brush extends Shape {
  public width: number;

  constructor(manager: MarkUpManager) {
    super(manager);
    this.type = 'Brush';
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
  override onMouseDownMove(point: Point) {
    this.pointArray.push(this.screenToBase(point));
  }

  override onMouseUp(point: Point): void {}
  override drawShape() {
    this.footprint.ctx.lineWidth = this.width;
    this.footprint.ctx.strokeStyle = this.color;
    this.footprint.ctx.beginPath();
    for (let i = 0; i < this.pointArray.length; i++) {
      let p = this.baseToScreen(this.pointArray[i]);
      if (i == 0) this.footprint.ctx.moveTo(p.x, p.y);
      else this.footprint.ctx.lineTo(p.x, p.y);
    }
    this.footprint.ctx.stroke();
  }
}


