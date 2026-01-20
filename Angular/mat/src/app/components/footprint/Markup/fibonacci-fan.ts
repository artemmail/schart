import { Point, Rectangle } from '../models/matrix';
import { MarkUpManager } from './markup-manager';
import { Shape, ShapePoint } from './shape';

const FAN_LEVELS: number[] = [0.382, 0.5, 0.618, 1];

export class FibonacciFan extends Shape {
  constructor(manager: MarkUpManager, params: Record<string, any>) {
    super(manager, params);
    this.type = 'FibonacciFan';
  }

  override onMouseDownMove(point: Point): void {
    const p = this.screenToBase(point);
    if (this.pointArray.length < 2) this.pointArray.push(p);
    else this.pointArray[1] = p;
  }

  override onMouseUp(point: Point): void {
    const dockable = this.params?.dockable !== false;
    if (dockable && this.pointArray.length >= 2) {
      this.snapToGrid();
    }
  }

  override selectedPoint(point: Point): ShapePoint | null {
    if (this.pointArray.length < 2) return null;
    const handle = this.selectedPoint_(point, this.pointArray);
    if (handle) return handle;
    const view = this.footprint.viewsManager.viewMain?.view;
    if (!view) return null;
    const lines = this.getFanLines(view);
    for (const line of lines) {
      if (this.commonSectionCircle(line.start, line.end, point, 4)) {
        return { shape: this, point: null };
      }
    }
    return null;
  }

  override drawShape(): void {
    if (this.pointArray.length < 2) return;
    const ctx = this.footprint.ctx;
    if (!ctx) return;
    const view = this.footprint.viewsManager.viewMain?.view;
    if (!view) return;
    const width = typeof this.params?.width === 'number' ? this.params.width : 1;
    const color = typeof this.params?.color === 'string' ? this.params.color : this.getSelectionColor();
    const showLabels = this.params?.showLabels !== false;

    ctx.lineWidth = width;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.font = '12px Verdana';

    const lines = this.getFanLines(view);
    for (const line of lines) {
      ctx.beginPath();
      ctx.moveTo(line.start.x, line.start.y);
      ctx.lineTo(line.end.x, line.end.y);
      ctx.stroke();

      if (showLabels) {
        const label = `${Math.round(line.level * 1000) / 10}%`;
        const labelPos = this.getLabelPoint(line.start, line.end, view);
        ctx.fillText(label, labelPos.x, labelPos.y);
      }
    }
  }

  private getFanLines(view: Rectangle): Array<{ start: Point; end: Point; level: number }> {
    if (this.pointArray.length < 2) return [];
    const p0 = this.pointArray[0];
    const p1 = this.pointArray[1];
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    if (Math.abs(dx) < 1e-9 && Math.abs(dy) < 1e-9) return [];

    const start = this.baseToScreen(p0);
    const out: Array<{ start: Point; end: Point; level: number }> = [];

    for (const level of FAN_LEVELS) {
      const endBase = { x: p0.x + dx, y: p0.y + dy * level };
      const endScreen = this.baseToScreen(endBase);
      const dir = { x: endScreen.x - start.x, y: endScreen.y - start.y };
      const end = this.intersectRayWithView(start, dir, view) ?? endScreen;
      out.push({ start, end, level });
    }

    return out;
  }

  private intersectRayWithView(start: Point, dir: Point, view: Rectangle): Point | null {
    const eps = 1e-6;
    const left = view.x;
    const right = view.x + view.w;
    const top = view.y;
    const bottom = view.y + view.h;
    const candidates: { t: number; x: number; y: number }[] = [];

    const addCandidate = (t: number, x: number, y: number) => {
      if (t < 0) return;
      candidates.push({ t, x, y });
    };

    if (Math.abs(dir.x) > eps) {
      const tLeft = (left - start.x) / dir.x;
      const yLeft = start.y + tLeft * dir.y;
      if (yLeft >= top - eps && yLeft <= bottom + eps) {
        addCandidate(tLeft, left, yLeft);
      }

      const tRight = (right - start.x) / dir.x;
      const yRight = start.y + tRight * dir.y;
      if (yRight >= top - eps && yRight <= bottom + eps) {
        addCandidate(tRight, right, yRight);
      }
    }

    if (Math.abs(dir.y) > eps) {
      const tTop = (top - start.y) / dir.y;
      const xTop = start.x + tTop * dir.x;
      if (xTop >= left - eps && xTop <= right + eps) {
        addCandidate(tTop, xTop, top);
      }

      const tBottom = (bottom - start.y) / dir.y;
      const xBottom = start.x + tBottom * dir.x;
      if (xBottom >= left - eps && xBottom <= right + eps) {
        addCandidate(tBottom, xBottom, bottom);
      }
    }

    if (!candidates.length) return null;
    candidates.sort((a, b) => a.t - b.t);
    return { x: candidates[0].x, y: candidates[0].y };
  }

  private getLabelPoint(start: Point, end: Point, view: Rectangle): Point {
    const dir = { x: end.x - start.x, y: end.y - start.y };
    const len = Math.hypot(dir.x, dir.y);
    if (len < 1e-6) return { x: end.x, y: end.y };
    const normal = { x: -dir.y / len, y: dir.x / len };
    const inset = 12;
    const offset = 6;
    let x = end.x - (dir.x / len) * inset + normal.x * offset;
    let y = end.y - (dir.y / len) * inset + normal.y * offset;

    x = Math.min(Math.max(x, view.x + 4), view.x + view.w - 40);
    y = Math.min(Math.max(y, view.y + 4), view.y + view.h - 4);
    return { x, y };
  }

  private snapToGrid(): void {
    const data = this.footprint.data;
    if (!data) return;
    const ps = data.priceScale || 1;
    const maxIndex = Math.max(0, data.clusterData.length - 1);
    for (const pt of this.pointArray) {
      const x = Math.round(pt.x);
      pt.x = Math.max(0, Math.min(maxIndex, x));
      pt.y = Math.round(pt.y / ps) * ps;
    }
  }
}
