import type { FootprintCanvasContext } from './footprint-canvas';
import type { Matrix, Point, Rectangle } from '../models/matrix';

type DrawingMatrix = Pick<Matrix, 'applyToPoint'>;
const matrices = new WeakMap<CanvasRenderingContext2D, DrawingMatrix>();
const installed = new WeakSet<CanvasRenderingContext2D>();

export function alignedRectangle(r: Rectangle): Rectangle {
  const x = Math.round(r.x), y = Math.round(r.y);
  return { x, y, w: Math.round(r.x + r.w) - x, h: Math.round(r.y + r.h) - y };
}
export function fillAlignedRectangle(ctx: CanvasRenderingContext2D, rect: Rectangle): void {
  const r = alignedRectangle(rect); ctx.fillRect(r.x, r.y, r.w, r.h);
}
export function strokeAlignedRectangle(ctx: CanvasRenderingContext2D, rect: Rectangle): void {
  const r = alignedRectangle(rect); ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w, r.h);
}
export function drawArrowHead(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, h: number, w: number): void {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return;
  const nx = dx / len, ny = dy / len;
  const cx = x2 - nx * h, cy = y2 - ny * h;
  ctx.moveTo(cx + ny * w, cy - nx * w); ctx.lineTo(x2, y2); ctx.lineTo(cx - ny * w, cy + nx * w);
}
function rectangleBetween(p1: Point, p2: Point): Rectangle {
  return { x: p1.x, y: p1.y, w: p2.x - p1.x, h: p2.y - p1.y };
}
function transformedRectangle(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number): Rectangle {
  const matrix = matrices.get(ctx);
  if (!matrix) throw new Error('Call setMatrix before drawing transformed rectangles.');
  return rectangleBetween(matrix.applyToPoint(x1, y1), matrix.applyToPoint(x2, y2));
}

// Compatibility methods are installed on the owned context, never the browser prototype.
// New painters can call the exported functions directly.
const helpers = {
  setMatrix(this: FootprintCanvasContext, matrix: DrawingMatrix): void { matrices.set(this, matrix); },
  mStrokeRect(this: FootprintCanvasContext, x1: number, y1: number, x2: number, y2: number): void {
    strokeAlignedRectangle(this, transformedRectangle(this, x1, y1, x2, y2));
  },
  mFillRect(this: FootprintCanvasContext, x1: number, y1: number, x2: number, y2: number): void {
    fillAlignedRectangle(this, transformedRectangle(this, x1, y1, x2, y2));
  },
  mFillRectangle(this: FootprintCanvasContext, x: number, y: number, w: number, h: number): void {
    this.mFillRect(x, y, x + w, y + h);
  },
  ArrowHead(this: FootprintCanvasContext, x1: number, y1: number, x2: number, y2: number, h: number, w: number): void {
    drawArrowHead(this, x1, y1, x2, y2, h, w);
  },
  myStrokeRect(this: FootprintCanvasContext, r: Rectangle): void { strokeAlignedRectangle(this, r); },
  myFillRect(this: FootprintCanvasContext, r: Rectangle): void { fillAlignedRectangle(this, r); },
  myFillRectSmoothX(this: FootprintCanvasContext, r: Rectangle): void {
    const aligned = alignedRectangle(r); this.fillRect(aligned.x, aligned.y, r.w, aligned.h);
  },
  myStrokeRectXY(this: FootprintCanvasContext, p1: Point, p2: Point): void { this.myStrokeRect(rectangleBetween(p1, p2)); },
  myFillRectXY(this: FootprintCanvasContext, p1: Point, p2: Point): void { this.myFillRect(rectangleBetween(p1, p2)); },
  myRectXY(this: FootprintCanvasContext, p1: Point, p2: Point): void { this.myRect(rectangleBetween(p1, p2)); },
  myMoveTo(this: FootprintCanvasContext, x: number, y: number): void { this.moveTo(Math.round(x) + 0.5, Math.round(y) + 0.5); },
  myLineTo(this: FootprintCanvasContext, x: number, y: number): void { this.lineTo(Math.round(x) + 0.5, Math.round(y) + 0.5); },
  myLine(this: FootprintCanvasContext, x1: number, y1: number, x2: number, y2: number): void { this.myMoveTo(x1, y1); this.myLineTo(x2, y2); },
  myFillRectSmooth(this: FootprintCanvasContext, r: Rectangle): void { this.fillRect(r.x, r.y, r.w, r.h); },
  myRect(this: FootprintCanvasContext, r: Rectangle): void {
    const aligned = alignedRectangle(r); this.rect(aligned.x + 0.5, aligned.y + 0.5, aligned.w, aligned.h);
  },
};

export function installFootprintCanvas(ctx: CanvasRenderingContext2D): FootprintCanvasContext {
  if (!installed.has(ctx)) { Object.assign(ctx, helpers); installed.add(ctx); }
  return ctx as FootprintCanvasContext;
}
