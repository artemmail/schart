import { Point } from '../models/matrix';
import { MarkUpManager } from './markup-manager';
import { Line } from './line';
import { ShapePoint } from './shape';

export class VerticalLine extends Line {
  constructor(manager: MarkUpManager, params: Record<string, any>) {
    super(manager, params);
    this.type = 'VerticalLine';
  }

  override onMouseDownMove(point: Point): void {
    super.onMouseDownMove(point);
    this.alignX();
  }

  override onMovePoint(point: Point): void {
    super.onMovePoint(point);
    this.alignX();
  }

  override onMouseUp(point: Point): void {
    const dockable = this.params?.dockable !== false;
    if (dockable && this.pointArray.length >= 2) {
      this.snapToBar();
    }
  }

  override selectedPoint(point: Point): ShapePoint | null {
    if (this.pointArray.length < 2) return null;
    const handle = this.selectedPoint_(point, this.pointArray);
    if (handle) return handle;
    const view = this.footprint.viewsManager.viewMain?.view;
    if (!view) return null;
    const x = this.baseToScreen(this.pointArray[0]).x;
    const p1 = { x, y: view.y };
    const p2 = { x, y: view.y + view.h };
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

    const x = this.baseToScreen(this.pointArray[0]).x;
    ctx.lineWidth = width;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.myLine(x, view.y, x, view.y + view.h);
    ctx.stroke();
  }

  private alignX(): void {
    if (this.pointArray.length < 2) return;
    const x = this.selPoint ? this.selPoint.x : this.pointArray[0].x;
    this.pointArray[0].x = x;
    this.pointArray[1].x = x;
  }

  private snapToBar(): void {
    const data = this.footprint.data;
    if (!data || this.pointArray.length < 2) return;
    const maxIndex = Math.max(0, data.clusterData.length - 1);
    const x = Math.round(this.pointArray[0].x);
    const clamped = Math.max(0, Math.min(maxIndex, x));
    this.pointArray[0].x = clamped;
    this.pointArray[1].x = clamped;
  }
}
