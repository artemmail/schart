import { Point } from '../models/matrix';
import { MarkUpManager } from './markup-manager';
import { Shape, ShapePoint } from './shape';

const FIB_LEVELS: number[] = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];

export class Fibonacci extends Shape {
  private dragMode: 'p0' | 'p1' | 'offset' | 'move' | null = null;
  private dragOffsetPx: number = 0;

  constructor(manager: MarkUpManager, params: Record<string, any>) {
    super(manager, params);
    this.type = 'Fibonacci';
  }

  override sortPoints(): boolean {
    if (this.pointArray.length < 2) return false;
    if (this.pointArray.length === 2) {
      const p0 = this.pointArray[0];
      const p1 = this.pointArray[1];

      const s0 = this.baseToScreen(p0);
      const s1 = this.baseToScreen(p1);
      const offset = 30;
      const s2 = this.buildScreenOffsetPoint(s0, s1, offset);
      const b2 = this.screenToBase(s2);
      this.pointArray.push(b2);
    }
    return true;
  }

  override selectedPoint(point: Point): ShapePoint | null {
    const hit = this.hitTest(point);
    if (!hit) return null;

    if (hit === 'p0' && this.pointArray[0]) return { shape: this, point: this.pointArray[0] };
    if (hit === 'p1' && this.pointArray[1]) return { shape: this, point: this.pointArray[1] };
    if (hit === 'offset' && this.pointArray[2]) return { shape: this, point: this.pointArray[2] };

    return { shape: this, point: null };
  }

  override onMouseDownMove(point: Point) {
    let p = this.screenToBase(point);
    if (this.pointArray.length < 2) {
      this.pointArray.push(p);
    } else {
      this.pointArray[1] = p;
      if (this.pointArray.length >= 3) {
        const p0 = this.pointArray[0];
        const p2 = this.pointArray[2];
        const s0 = this.baseToScreen(p0);
        const s1 = this.baseToScreen(p);
        const s2 = this.baseToScreen(p2);
        const offsetPx = this.getScreenOffsetPx(s0, s1, s2) || 30;
        const nextS2 = this.buildScreenOffsetPoint(s0, s1, offsetPx);
        this.pointArray[2] = this.screenToBase(nextS2);
      }
    }
  }

  override onMouseUp(point: Point): void {
    this.dragMode = null;
  }

  override onStartMovePoint(point: Point): void {
    this.mouseDown = point;
    this.sortPoints();
    this.dragMode = this.hitTest(point) ?? 'move';

    if (this.pointArray.length >= 3) {
      const s0 = this.baseToScreen(this.pointArray[0]);
      const s1 = this.baseToScreen(this.pointArray[1]);
      const s2 = this.baseToScreen(this.pointArray[2]);
      this.dragOffsetPx = this.getScreenOffsetPx(s0, s1, s2);
    } else {
      this.dragOffsetPx = 0;
    }
  }

  override onMovePoint(point: Point): void {
    if (!this.mouseDown || this.pointArray.length < 2) {
      this.mouseDown = point;
      return;
    }

    const p0 = this.pointArray[0];
    const p1 = this.pointArray[1];

    if (!p0 || !p1) return;

    if (this.dragMode === 'move') {
      const delta = this.screenToBaseDelta(this.mouseDown, point);
      for (const p of this.pointArray) {
        p.x += delta.x;
        p.y += delta.y;
      }
      this.mouseDown = point;
      return;
    }

    if (this.dragMode === 'p0') {
      this.pointArray[0] = this.screenToBase(point);
    } else if (this.dragMode === 'p1') {
      this.pointArray[1] = this.screenToBase(point);
    } else if (this.dragMode === 'offset') {
      const s0 = this.baseToScreen(this.pointArray[0]);
      const s1 = this.baseToScreen(this.pointArray[1]);
      const normal = this.screenNormal(s0, s1);
      const offsetPx = (point.x - s0.x) * normal.x + (point.y - s0.y) * normal.y;
      const s2 = { x: s0.x + normal.x * offsetPx, y: s0.y + normal.y * offsetPx };
      this.pointArray[2] = this.screenToBase(s2);
      this.dragOffsetPx = offsetPx;
      this.mouseDown = point;
      return;
    }

    const s0 = this.baseToScreen(this.pointArray[0]);
    const s1 = this.baseToScreen(this.pointArray[1]);
    const s2 = this.buildScreenOffsetPoint(s0, s1, this.dragOffsetPx || 30);
    this.pointArray[2] = this.screenToBase(s2);
    this.mouseDown = point;
  }

  override drawShape() {
    if (this.pointArray.length < 2) return;
    if (!this.sortPoints()) return;

    const ctx = this.footprint.ctx;
    const width = typeof this.params?.width === 'number' ? this.params.width : 1;
    const color = typeof this.params?.color === 'string' ? this.params.color : this.getSelectionColor();
    const showLabels = this.params?.showLabels !== false;

    const p0 = this.pointArray[0];
    const p1 = this.pointArray[1];
    const p2 = this.pointArray[2];

    if (!p0 || !p1 || !p2) return;

    const dir = { x: p1.x - p0.x, y: p1.y - p0.y };
    const dirLen = Math.hypot(dir.x, dir.y);
    if (dirLen < 1e-6) return;

    const normal = { x: -dir.y / dirLen, y: dir.x / dirLen };
    const offset = this.getOffsetVector(p0, p1, p2);
    const offsetLen = offset.x * normal.x + offset.y * normal.y;

    const s0 = this.baseToScreen(p0);
    const s1 = this.baseToScreen(p1);
    const angle = Math.atan2(s1.y - s0.y, s1.x - s0.x);
    const sn = this.screenNormal(s0, s1);
    const labelSide = offsetLen >= 0 ? 1 : -1;
    const labelOffset = 10 * labelSide;

    ctx.lineWidth = width;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.textBaseline = 'middle';
    ctx.font = '12px Verdana';

    for (const level of FIB_LEVELS) {
      const k = offsetLen * level;
      const start = { x: p0.x + normal.x * k, y: p0.y + normal.y * k };
      const end = { x: p1.x + normal.x * k, y: p1.y + normal.y * k };
      const from = this.baseToScreen(start as Point);
      const to = this.baseToScreen(end as Point);

      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();

      if (showLabels) {
        const label = `${Math.round(level * 1000) / 10}%`;
        ctx.save();
        ctx.translate(from.x + sn.x * labelOffset, from.y + sn.y * labelOffset);
        ctx.rotate(angle);
        ctx.textAlign = 'left';
        ctx.fillText(label, 4, 0);
        ctx.restore();
      }
    }
  }

  private getOffsetVector(p0: Point, p1: Point, p2: Point): { x: number; y: number } {
    return { x: p2.x - p0.x, y: p2.y - p0.y };
  }

  private buildScreenOffsetPoint(p0: Point, p1: Point, offsetPx: number): Point {
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const len = Math.hypot(dx, dy);
    const nx = len > 0 ? -dy / len : 0;
    const ny = len > 0 ? dx / len : -1;
    return { x: p0.x + nx * offsetPx, y: p0.y + ny * offsetPx };
  }

  private getScreenOffsetPx(p0: Point, p1: Point, p2: Point): number {
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const len = Math.hypot(dx, dy);
    if (len < 1e-6) return 0;
    const nx = -dy / len;
    const ny = dx / len;
    const vx = p2.x - p0.x;
    const vy = p2.y - p0.y;
    return vx * nx + vy * ny;
  }

  private screenNormal(p0: Point, p1: Point): { x: number; y: number } {
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const len = Math.hypot(dx, dy);
    if (len < 1e-6) return { x: 0, y: -1 };
    return { x: -dy / len, y: dx / len };
  }

  override drawSelection(): void {
    if (this.pointArray.length < 2) {
      super.drawSelection();
      return;
    }

    const ctx = this.footprint.ctx;
    ctx.fillStyle = this.getSelectionColor();
    const size = 10;
    const half = size / 2;

    for (const px of this.pointArray) {
      const p = this.baseToScreen(px);
      ctx.fillRect(p.x - half, p.y - half, size, size);
    }

    if (this.pointArray.length >= 3) {
      const s0 = this.baseToScreen(this.pointArray[0]);
      const s1 = this.baseToScreen(this.pointArray[1]);
      const s2 = this.baseToScreen(this.pointArray[2]);
      const normal = this.screenNormal(s0, s1);
      const offsetPx = this.getScreenOffsetPx(s0, s1, s2);
      const handle = { x: s1.x + normal.x * offsetPx, y: s1.y + normal.y * offsetPx };
      ctx.fillRect(handle.x - half, handle.y - half, size, size);
    }
  }

  private hitTest(point: Point): 'p0' | 'p1' | 'offset' | 'move' | null {
    if (!this.sortPoints()) return null;
    if (this.pointArray.length < 2) return null;

    const radius = 6;
    const p0 = this.pointArray[0];
    const p1 = this.pointArray[1];
    const p2 = this.pointArray[2];

    const s0 = this.baseToScreen(p0);
    const s1 = this.baseToScreen(p1);

    if (this.isHit(point, s0, radius)) return 'p0';
    if (this.isHit(point, s1, radius)) return 'p1';

    if (p2) {
      const s2 = this.baseToScreen(p2);
      if (this.isHit(point, s2, radius + 2)) return 'offset';

      const normal = this.screenNormal(s0, s1);
      const offsetPx = this.getScreenOffsetPx(s0, s1, s2);
      const handle = { x: s1.x + normal.x * offsetPx, y: s1.y + normal.y * offsetPx };
      if (this.isHit(point, handle, radius + 2)) return 'offset';

      const s0o = { x: s0.x + normal.x * offsetPx, y: s0.y + normal.y * offsetPx };
      const s1o = { x: s1.x + normal.x * offsetPx, y: s1.y + normal.y * offsetPx };
      if (this.commonSectionCircle(s0o, s1o, point, 4)) return 'offset';
    }

    if (this.commonSectionCircle(s0, s1, point, 4)) return 'move';

    return null;
  }

  private isHit(point: Point, center: Point, radius: number): boolean {
    return Math.abs(center.x - point.x) <= radius && Math.abs(center.y - point.y) <= radius;
  }
}
