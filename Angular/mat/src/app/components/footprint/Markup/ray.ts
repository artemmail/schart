import { Point, Rectangle } from '../models/matrix';
import { MarkUpManager } from './markup-manager';
import { Line } from './line';
import { ShapePoint } from './shape';

export class Ray extends Line {
  constructor(manager: MarkUpManager, params: Record<string, any>) {
    super(manager, params);
    this.type = 'Ray';
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
    const segment = this.getRaySegment();
    if (segment && this.commonSectionCircle(segment.start, segment.end, point, 4)) {
      return { shape: this, point: null };
    }
    return null;
  }

  override drawShape(): void {
    if (this.pointArray.length < 2) return;
    const ctx = this.footprint.ctx;
    if (!ctx) return;
    const segment = this.getRaySegment();
    if (!segment) return;
    const width = typeof this.params?.width === 'number' ? this.params.width : 1;
    const color = typeof this.params?.color === 'string' ? this.params.color : this.getSelectionColor();
    const arrow = this.params?.arrow !== false;

    ctx.lineWidth = width;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(segment.start.x, segment.start.y);
    ctx.lineTo(segment.end.x, segment.end.y);
    ctx.stroke();

    if (arrow) {
      const headLength = Math.max(6, width * 2.4);
      const headWidth = Math.max(3, width * 1.2);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ArrowHead(
        segment.start.x,
        segment.start.y,
        segment.end.x,
        segment.end.y,
        headLength,
        headWidth
      );
      ctx.closePath();
      ctx.fill();
    }
  }

  private getRaySegment(): { start: Point; end: Point } | null {
    if (this.pointArray.length < 2) return null;
    const view = this.footprint.viewsManager.viewMain?.view;
    if (!view) return null;

    const start = this.baseToScreen(this.pointArray[0]);
    const to = this.baseToScreen(this.pointArray[1]);
    const dir = { x: to.x - start.x, y: to.y - start.y };
    if (Math.abs(dir.x) < 1e-6 && Math.abs(dir.y) < 1e-6) return null;

    const end = this.intersectRayWithView(start, dir, view) ?? to;
    return { start, end };
  }

  private intersectRayWithView(
    start: Point,
    dir: Point,
    view: Rectangle
  ): Point | null {
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

  private snapToGrid(): void {
    const data = this.footprint.data;
    if (!data || this.pointArray.length < 2) return;
    const ps = data.priceScale || 1;
    const maxIndex = Math.max(0, data.clusterData.length - 1);
    for (const pt of this.pointArray) {
      const x = Math.round(pt.x);
      pt.x = Math.max(0, Math.min(maxIndex, x));
      pt.y = Math.round(pt.y / ps) * ps;
    }
  }
}
