import { Point } from '../models/matrix';
import { MarkUpManager } from './markup-manager';
import { Shape, ShapePoint } from './shape';

const FIB_LEVELS: number[] = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];

export class Fibonacci extends Shape {
  private dragMode: 'p0' | 'p1' | 'p2' | 'p3' | 'move' | null = null;
  private drawPhase: 'base' | 'height' | null = null;

  constructor(manager: MarkUpManager, params: Record<string, any>) {
    super(manager, params);
    this.type = 'Fibonacci';
  }

  override supportsMultiPointDraw(): boolean {
    return true;
  }

  override isComplete(): boolean {
    return this.pointArray.length >= 3 && this.drawPhase === null;
  }

  override sortPoints(): boolean {
    if (this.pointArray.length < 3) return false;
    this.enforceVerticalSide();
    return true;
  }

  override onStartDraw(point: Point): void {
    super.onStartDraw(point);
    this.drawPhase = 'base';
  }

  override onStartNextPoint(point: Point): void {
    if (this.drawPhase === 'height') {
      this.updateHeightPoint(this.screenToBase(point));
      this.enforceVerticalSide();
      this.drawPhase = null;
      return;
    }

    super.onStartNextPoint(point);
  }

  override selectedPoint(point: Point): ShapePoint | null {
    const hit = this.hitTest(point);
    if (!hit) return null;

    const pts = this.getParallelogramPoints();
    if (!pts) return null;

    if (hit === 'p0') return { shape: this, point: pts.p0 };
    if (hit === 'p1') return { shape: this, point: pts.p1 };
    if (hit === 'p2') return { shape: this, point: pts.p2 };
    if (hit === 'p3') return { shape: this, point: pts.p3 };

    return { shape: this, point: null };
  }

  override onMouseDownMove(point: Point) {
    const p = this.screenToBase(point);
    if (this.drawPhase === 'base') {
      if (this.pointArray.length === 0) {
        this.pointArray.push(p);
        return;
      }
      if (this.pointArray.length === 1) {
        this.pointArray.push(p);
        return;
      }
      this.pointArray[1] = p;
      return;
    }

    if (this.drawPhase === 'height') {
      this.updateHeightPoint(p);
      return;
    }
  }

  override onMouseUp(point: Point): void {
    this.dragMode = null;
    if (this.drawPhase === 'base' && this.pointArray.length >= 2) {
      const bottomLeft = this.pointArray[0];
      const bottomRight = this.pointArray[1];
      if (!bottomLeft || !bottomRight) return;
      if (bottomLeft.x > bottomRight.x) {
        this.pointArray[0] = bottomRight;
        this.pointArray[1] = bottomLeft;
      }
      const bl = this.pointArray[0];
      const br = this.pointArray[1];
      this.pointArray = [{ x: bl.x, y: bl.y }, bl, br];
      this.drawPhase = 'height';
    }
  }

  override onStartMovePoint(point: Point): void {
    this.mouseDown = point;
    this.sortPoints();
    this.dragMode = this.hitTest(point) ?? 'move';
  }

  override onMovePoint(point: Point): void {
    if (!this.mouseDown || this.pointArray.length < 3) {
      this.mouseDown = point;
      return;
    }

    const p0 = this.pointArray[0];
    const p1 = this.pointArray[1];
    const p2 = this.pointArray[2];

    if (!p0 || !p1 || !p2) return;

    if (this.dragMode === 'move') {
      const delta = this.screenToBaseDelta(this.mouseDown, point);
      for (const p of this.pointArray) {
        p.x += delta.x;
        p.y += delta.y;
      }
      this.mouseDown = point;
      return;
    }

    const next = this.screenToBase(point);

    if (this.dragMode === 'p0') {
      p0.x = next.x;
      p0.y = next.y;
      p1.x = p0.x;
    } else if (this.dragMode === 'p1') {
      p1.x = next.x;
      p1.y = next.y;
      p0.x = p1.x;
    } else if (this.dragMode === 'p2') {
      p2.x = next.x;
      p2.y = next.y;
    } else if (this.dragMode === 'p3') {
      const side = { x: p0.x - p1.x, y: p0.y - p1.y };
      p2.x = next.x - side.x;
      p2.y = next.y - side.y;
    }
    this.mouseDown = point;
  }

  override onMouseMove(point: Point): void {
    if (this.drawPhase === 'height') {
      this.updateHeightPoint(this.screenToBase(point));
    }
  }

  override drawShape() {
    const ctx = this.footprint.ctx;
    const width = typeof this.params?.width === 'number' ? this.params.width : 1;
    const color = typeof this.params?.color === 'string' ? this.params.color : this.getSelectionColor();
    const showLabels = this.params?.showLabels !== false;

    ctx.lineWidth = width;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;

    if (this.pointArray.length < 2) return;

    if (this.pointArray.length < 3) {
      const p0 = this.pointArray[0];
      const p2 = this.pointArray[1];
      if (!p0 || !p2) return;
      const s0 = this.baseToScreen(p0);
      const s2 = this.baseToScreen(p2);
      ctx.beginPath();
      ctx.moveTo(s0.x, s0.y);
      ctx.lineTo(s2.x, s2.y);
      ctx.stroke();
      return;
    }

    if (!this.sortPoints()) return;

    const pts = this.getParallelogramPoints();
    if (!pts) return;

    const { p0, p1, p2 } = pts;
    const side = { x: p0.x - p1.x, y: p0.y - p1.y };
    const sideLen = Math.hypot(side.x, side.y);
    if (sideLen < 1e-6) return;

    const top = { x: p2.x - p1.x, y: p2.y - p1.y };
    const topLen = Math.hypot(top.x, top.y);
    if (topLen < 1e-6) return;

    const s0 = this.baseToScreen(p0);
    const s1 = this.baseToScreen(p1);
    const s2 = this.baseToScreen(p2);
    const angle = Math.atan2(s2.y - s1.y, s2.x - s1.x);
    const sn = this.screenNormal(s1, s2);
    const sideScreen = { x: s0.x - s1.x, y: s0.y - s1.y };
    const labelSide = sideScreen.x * sn.x + sideScreen.y * sn.y >= 0 ? 1 : -1;
    const labelOffset = 10 * labelSide;

    ctx.textBaseline = 'middle';
    ctx.font = '12px Verdana';

    for (const level of FIB_LEVELS) {
      const start = { x: p1.x + side.x * level, y: p1.y + side.y * level };
      const end = { x: p2.x + side.x * level, y: p2.y + side.y * level };
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

  private enforceVerticalSide(): void {
    if (this.pointArray.length >= 2) {
      this.pointArray[1].x = this.pointArray[0].x;
    }
  }

  private updateHeightPoint(p: Point): void {
    if (this.pointArray.length < 3) return;
    const bottomLeft = this.pointArray[1];
    const topLeft = this.pointArray[0];
    if (!bottomLeft || !topLeft) return;
    topLeft.x = bottomLeft.x;
    topLeft.y = p.y;
  }

  private getParallelogramPoints(): { p0: Point; p1: Point; p2: Point; p3: Point } | null {
    if (this.pointArray.length < 3) return null;
    this.enforceVerticalSide();
    const p0 = this.pointArray[0];
    const p1 = this.pointArray[1];
    const p2 = this.pointArray[2];
    if (!p0 || !p1 || !p2) return null;
    const p3 = this.getP3(p0, p1, p2);
    return { p0, p1, p2, p3 };
  }

  private getP3(p0: Point, p1: Point, p2: Point): Point {
    return { x: p2.x + (p0.x - p1.x), y: p2.y + (p0.y - p1.y) };
  }

  private screenNormal(p0: Point, p1: Point): { x: number; y: number } {
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const len = Math.hypot(dx, dy);
    if (len < 1e-6) return { x: 0, y: -1 };
    return { x: -dy / len, y: dx / len };
  }

  override drawSelection(): void {
    const pts = this.getParallelogramPoints();
    if (!pts) {
      super.drawSelection();
      return;
    }

    const ctx = this.footprint.ctx;
    ctx.fillStyle = this.getSelectionColor();
    const size = 10;
    const half = size / 2;

    const vertices = [pts.p0, pts.p1, pts.p2, pts.p3];
    for (const px of vertices) {
      const p = this.baseToScreen(px);
      ctx.fillRect(p.x - half, p.y - half, size, size);
    }
  }

  private hitTest(point: Point): 'p0' | 'p1' | 'p2' | 'p3' | 'move' | null {
    const pts = this.getParallelogramPoints();
    if (!pts) return null;

    const radius = 6;
    const s0 = this.baseToScreen(pts.p0);
    const s1 = this.baseToScreen(pts.p1);
    const s2 = this.baseToScreen(pts.p2);
    const s3 = this.baseToScreen(pts.p3);

    if (this.isHit(point, s0, radius)) return 'p0';
    if (this.isHit(point, s1, radius)) return 'p1';
    if (this.isHit(point, s2, radius)) return 'p2';
    if (this.isHit(point, s3, radius)) return 'p3';

    if (
      this.commonSectionCircle(s0, s1, point, 4) ||
      this.commonSectionCircle(s1, s2, point, 4) ||
      this.commonSectionCircle(s2, s3, point, 4) ||
      this.commonSectionCircle(s3, s0, point, 4)
    )
      return 'move';

    return null;
  }

  private isHit(point: Point, center: Point, radius: number): boolean {
    return Math.abs(center.x - point.x) <= radius && Math.abs(center.y - point.y) <= radius;
  }
}
