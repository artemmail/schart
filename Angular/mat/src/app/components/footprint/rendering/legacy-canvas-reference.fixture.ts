// Reference arithmetic from CanvasExt before stage 5, scoped to a test context.
// No eval or prototype changes are needed for the pixel comparison.
export function installLegacyCanvasReference(ctx: any): void {
  const bounds = (r: any) => ({
    dw: Math.round(Math.round(r.w + r.x) - Math.round(r.x) - Math.round(r.w)),
    dh: Math.round(Math.round(r.h + r.y) - Math.round(r.y) - Math.round(r.h)),
  });
  ctx.setMatrix = (matrix: any) => { ctx.mtx = matrix; };
  ctx.myFillRect = (r: any) => { const { dw, dh } = bounds(r); ctx.fillRect(Math.round(r.x), Math.round(r.y), Math.round(r.w) + dw, Math.round(r.h) + dh); };
  ctx.myStrokeRect = (r: any) => { const { dw, dh } = bounds(r); ctx.strokeRect(Math.round(r.x) + 0.5, Math.round(r.y) + 0.5, Math.round(r.w) + dw, Math.round(r.h) + dh); };
  ctx.myRect = (r: any) => { const { dw, dh } = bounds(r); ctx.rect(Math.round(r.x) + 0.5, Math.round(r.y) + 0.5, Math.round(r.w) + dw, Math.round(r.h) + dh); };
  ctx.myFillRectSmoothX = (r: any) => { const { dh } = bounds(r); ctx.fillRect(Math.round(r.x), Math.round(r.y), r.w, Math.round(r.h) + dh); };
  ctx.myFillRectSmooth = (r: any) => ctx.fillRect(r.x, r.y, r.w, r.h);
  const between = (p1: any, p2: any) => ({ x: p1.x, y: p1.y, w: p2.x - p1.x, h: p2.y - p1.y });
  ctx.myStrokeRectXY = (p1: any, p2: any) => ctx.myStrokeRect(between(p1, p2));
  ctx.myFillRectXY = (p1: any, p2: any) => ctx.myFillRect(between(p1, p2));
  ctx.myRectXY = (p1: any, p2: any) => ctx.myRect(between(p1, p2));
  ctx.mFillRect = (x1: number, y1: number, x2: number, y2: number) => ctx.myFillRect(between(ctx.mtx.applyToPoint(x1, y1), ctx.mtx.applyToPoint(x2, y2)));
  ctx.mFillRectangle = (x: number, y: number, w: number, h: number) => ctx.mFillRect(x, y, x + w, y + h);
  ctx.myMoveTo = (x: number, y: number) => ctx.moveTo(Math.round(x) + 0.5, Math.round(y) + 0.5);
  ctx.myLineTo = (x: number, y: number) => ctx.lineTo(Math.round(x) + 0.5, Math.round(y) + 0.5);
  ctx.myLine = (x1: number, y1: number, x2: number, y2: number) => { ctx.myMoveTo(x1, y1); ctx.myLineTo(x2, y2); };
  ctx.ArrowHead = (x1: number, y1: number, x2: number, y2: number, h: number, w: number) => {
    const v = { x: x2 - x1, y: y2 - y1 }, len = Math.sqrt(v.x * v.x + v.y * v.y);
    if (len === 0) return;
    const norm = { x: v.x / len, y: v.y / len }, c = { x: x2 - norm.x * h, y: y2 - norm.y * h };
    const l = { x: c.x + norm.y * w, y: c.y - norm.x * w }, r = { x: c.x - norm.y * w, y: c.y + norm.x * w };
    ctx.moveTo(l.x, l.y); ctx.lineTo(x2, y2); ctx.lineTo(r.x, r.y);
  };
}
