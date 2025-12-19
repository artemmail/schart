
import { Brush } from './brush';

export class Line extends Brush {
  arrow: any;
  constructor(manager) {
    super(manager);
    this.type = 'Line';
    this.controlMap = {
      color: true,
      width: true,
      font: false,
      id: false,
      text: false,
      arrow: true,
      toolbar: false,
      profile: false,
    };
  }
  override getFromModel() {
    super.getFromModel();
    this.arrow = this.model.arrow;
  }
  override setToModel() {
    super.setToModel();
    this.model.arrow= this.arrow;
  }
  override onMouseDownMove(point) {
    let p = this.screenToBase(point);
    if (this.pointArray.length < 2) this.pointArray.push(p);
    else this.pointArray[1] = p;
  }
  override drawShape() {
    super.drawShape();
    if (this.arrow && this.pointArray.length == 2) {
      let w1 = this.width + 3;
      let p = this.baseToScreen(this.pointArray[0]);
      let p2 = this.baseToScreen(this.pointArray[1]);
      this.footprint.ctx.beginPath();
      this.footprint.ctx.ArrowHead(p.x, p.y, p2.x, p2.y, w1 * 2, w1);
      this.footprint.ctx.closePath();
      this.footprint.ctx.fillStyle = this.color;
      this.footprint.ctx.fill();
      this.footprint.ctx.stroke();
    }
  }
}
