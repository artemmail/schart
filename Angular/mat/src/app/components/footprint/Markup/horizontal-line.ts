import { Point } from '../models/matrix';
import { MarkUpManager } from './markup-manager';
import { Line } from './line';
import { ShapePoint } from './shape';

export class HorizontalLine extends Line {
  constructor(manager: MarkUpManager, params: Record<string, any>) {
    super(manager, params);
    this.type = 'HorizontalLine';
  }

  override onMouseDownMove(point: Point): void {
    super.onMouseDownMove(point);
    this.alignY();
  }

  override onMovePoint(point: Point): void {
    super.onMovePoint(point);
    this.alignY();
  }

  override onMouseUp(point: Point): void {
    const dockable = this.params?.dockable !== false;
    if (dockable && this.pointArray.length >= 2) {
      this.snapToPrice();
    }
  }

  override selectedPoint(point: Point): ShapePoint | null {
    if (this.pointArray.length < 2) return null;
    const handle = this.selectedPoint_(point, this.pointArray);
    if (handle) return handle;
    const view = this.footprint.viewsManager.viewMain?.view;
    if (!view) return null;
    const y = this.baseToScreen(this.pointArray[0]).y;
    const p1 = { x: view.x, y };
    const p2 = { x: view.x + view.w, y };
    if (this.commonSectionCircle(p1, p2, point, 4)) {
      return { shape: this, point: null };
    }
    return null;
  }

  override drawShape(): void {
    if (this.pointArray.length < 2) return;
    const ctx = this.footprint.ctx;
    const view = this.footprint.viewsManager.viewMain?.view;
    if (!view || !ctx) return;
    const width = typeof this.params?.width === 'number' ? this.params.width : 1;
    const color = typeof this.params?.color === 'string' ? this.params.color : this.getSelectionColor();

    const y = this.baseToScreen(this.pointArray[0]).y;
    ctx.lineWidth = width;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.myLine(view.x, y, view.x + view.w, y);
    ctx.stroke();
  }

  private alignY(): void {
    if (this.pointArray.length < 2) return;
    const y = this.selPoint ? this.selPoint.y : this.pointArray[0].y;
    this.pointArray[0].y = y;
    this.pointArray[1].y = y;
  }

  private snapToPrice(): void {
    const data = this.footprint.data;
    if (!data || this.pointArray.length < 2) return;
    const ps = data.priceScale || 1;
    const y = Math.round(this.pointArray[0].y / ps) * ps;
    this.pointArray[0].y = y;
    this.pointArray[1].y = y;
  }
}
