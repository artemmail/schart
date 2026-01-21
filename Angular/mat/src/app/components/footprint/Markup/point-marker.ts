import { Point } from '../models/matrix';
import { MarkUpManager } from './markup-manager';
import { Shape } from './shape';

export abstract class PointMarker extends Shape {
  constructor(manager: MarkUpManager, params: Record<string, any>) {
    super(manager, params);
    this.type = 'PointMarker';
  }

  override isComplete(): boolean {
    return this.pointArray.length >= 1;
  }

  override sortPoints(): boolean {
    return this.pointArray.length >= 1;
  }

  override onMouseDownMove(point: Point): void {
    const p = this.screenToBase(point);
    if (this.pointArray.length === 0) {
      this.pointArray.push(p);
    } else {
      this.pointArray[0] = p;
    }
  }

  override onMouseUp(point: Point): void {}
}
