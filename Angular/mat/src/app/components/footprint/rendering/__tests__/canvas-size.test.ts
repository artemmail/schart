import { it, describe, expect } from '@jest/globals';
import { applyCanvasSize } from '../canvas-size';

function canvasFixture() {
  let width = 0, height = 0, writes = 0;
  const canvas = { get width() { return width; }, set width(value: number) { width = value; writes++; },
    get height() { return height; }, set height(value: number) { height = value; writes++; }, style: { width: '', height: '' } };
  return { canvas: canvas as unknown as HTMLCanvasElement, writes: () => writes };
}
describe('Canvas backing-store ownership', () => {
  it.each([1, 1.25, 2])('sizes DPR %s and avoids repeated context resets', ratio => {
    const f = canvasFixture();
    expect(applyCanvasSize(f.canvas, 600, 400, ratio)).toBe(true);
    expect(f.canvas.width).toBe(600 * ratio); expect(f.canvas.height).toBe(400 * ratio);
    expect(f.canvas.style.width).toBe('600px'); expect(f.writes()).toBe(2);
    expect(applyCanvasSize(f.canvas, 600, 400, ratio)).toBe(false); expect(f.writes()).toBe(2);
  });
  it('handles monitor transitions, fractional dimensions and hidden containers', () => {
    const f = canvasFixture(); applyCanvasSize(f.canvas, 100.3, 80.2, 1.25);
    expect(f.canvas.width).toBe(125); expect(f.canvas.height).toBe(100);
    applyCanvasSize(f.canvas, 100.3, 80.2, 2); expect(f.canvas.width).toBe(201);
    applyCanvasSize(f.canvas, 0, 0, 2); expect(f.canvas.width).toBe(0); expect(f.canvas.height).toBe(0);
    applyCanvasSize(f.canvas, 100, 80, NaN); expect(f.canvas.width).toBe(100);
  });
});
