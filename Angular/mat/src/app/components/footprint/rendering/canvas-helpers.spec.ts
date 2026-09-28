import type { FootprintCanvasContext } from './footprint-canvas';
import { installFootprintCanvas } from './canvas-helpers';
import { installLegacyCanvasReference } from './legacy-canvas-reference.fixture';
import { Matrix } from '../models/matrix';

function context() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 96;
  return canvas.getContext('2d')!;
}
function paint(ctx: FootprintCanvasContext, matrix: Matrix) {
  ctx.setMatrix(matrix); ctx.fillStyle = '#728adf'; ctx.strokeStyle = '#e85a39';
  for (const r of [
    { x: 1.1, y: 2.7, w: 20.4, h: 13.8 }, { x: 52.5, y: 63.5, w: -15.8, h: -23.2 },
    { x: -10.25, y: 31.1, w: 14.9, h: 21.75 }, { x: 7.5, y: 15.5, w: 0.1, h: 0.1 },
  ]) {
    ctx.myFillRect(r); ctx.myStrokeRect(r); ctx.myFillRectSmoothX(r); ctx.myFillRectSmooth(r);
    ctx.beginPath(); ctx.myRect(r); ctx.stroke();
  }
  const p1 = { x: 60.3, y: 16.6 }, p2 = { x: 82.8, y: 37.2 };
  ctx.myFillRectXY(p1, p2); ctx.myStrokeRectXY(p1, p2);
  ctx.beginPath(); ctx.myRectXY(p1, p2); ctx.stroke();
  ctx.mFillRect(1, 2, 6, 9); ctx.mFillRectangle(9, 4, 7, 5);
  ctx.beginPath(); ctx.myMoveTo(1.2, 2.8); ctx.myLineTo(10.8, 20.2); ctx.myLine(10, 20, 90, 80); ctx.stroke();
  ctx.beginPath(); ctx.ArrowHead(20, 70, 70, 50, 12, 5); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ArrowHead(30, 30, 30, 30, 12, 5); ctx.stroke();
}

describe('Typed Footprint canvas helpers', () => {
  for (const scale of [1, 1.5, -2]) {
    it(`keeps the legacy pixel result at matrix scale ${scale}`, () => {
      const actual = installFootprintCanvas(context()), reference = context();
      installLegacyCanvasReference(reference);
      const matrix = new Matrix().scale(scale, -scale).getTranslate(20, 40);
      paint(actual, matrix); paint(reference as FootprintCanvasContext, matrix);
      expect(Array.from(actual.getImageData(0, 0, 96, 96).data)).toEqual(Array.from(reference.getImageData(0, 0, 96, 96).data));
    });
  }
  it('installs only on an owned context, is idempotent and keeps matrices independent', () => {
    const prototypeBefore = Object.getOwnPropertyNames(CanvasRenderingContext2D.prototype);
    const a = installFootprintCanvas(context()), b = installFootprintCanvas(context()), untouched = context();
    const helper = a.setMatrix; installFootprintCanvas(a); expect(a.setMatrix).toBe(helper);
    expect(Object.getOwnPropertyNames(CanvasRenderingContext2D.prototype)).toEqual(prototypeBefore);
    expect((untouched as Partial<FootprintCanvasContext>).myFillRect).toBeUndefined();
    a.setMatrix(new Matrix().getTranslate(10, 0)); b.setMatrix(new Matrix().getTranslate(30, 0));
    a.mFillRectangle(0, 0, 5, 5); b.mFillRectangle(0, 0, 5, 5);
    expect(a.getImageData(10, 1, 1, 1).data[3]).toBe(255);
    expect(b.getImageData(10, 1, 1, 1).data[3]).toBe(0);
    expect(b.getImageData(30, 1, 1, 1).data[3]).toBe(255);
  });
  it('draws transformed stroke rectangles with the corrected typed signature', () => {
    const ctx = installFootprintCanvas(context()); ctx.setMatrix(new Matrix().getTranslate(10, 10));
    ctx.mStrokeRect(0, 0, 10, 10);
    expect(ctx.getImageData(10, 10, 1, 1).data[3]).toBeGreaterThan(0);
  });
});
