import { describe, expect, it, jest } from '@jest/globals';
import { Matrix } from '../../models/matrix';
import { getVisibleBars } from '../visible-bars';

function scan(matrix: Matrix, x: number, width: number, count: number, scale = 1) {
  let minIndex = count - 1, maxIndex = 0;
  for (let i = 0; i < count; i++) {
    const p1 = matrix.applyToPoint(i, 1 - scale / 2), p2 = matrix.applyToPoint(i + 1, 1 + scale / 2);
    if (!(p2.x < x || p1.x > x + width)) { minIndex = Math.min(minIndex, i); maxIndex = Math.max(maxIndex, i); }
  }
  return { minIndex, maxIndex };
}

describe('Visible bars', () => {
  it('matches the previous scan across pan, zoom, inclusive edges and empty ranges', () => {
    for (const count of [0, 1, 100, 10000]) for (const zoom of [0.1, 1, 2.5, 10]) {
      for (const offset of [-2000, -11.25, 0, 20.5]) for (const width of [0, 20, 1000]) {
        const matrix = new Matrix().scale(zoom, -3).getTranslate(offset, 5);
        const view = { x: 10, y: 0, w: width, h: 100 };
        expect(getVisibleBars(matrix, view, count)).toEqual(scan(matrix, view.x, width, count));
      }
    }
  });
  it('keeps the scan predicate for mirrored, collapsed and sheared matrices', () => {
    for (const matrix of [new Matrix().scale(-2, -4), new Matrix().scale(0, 1), new Matrix().transform(2, 0, 0.5, 1, 0, 0)]) {
      expect(getVisibleBars(matrix, { x: 10, y: 0, w: 50, h: 100 }, 100, 0.25)).toEqual(scan(matrix, 10, 50, 100, 0.25));
    }
  });
  it('does constant geometry work for a large normal viewport', () => {
    const matrix = new Matrix().scale(5, -3).getTranslate(-30000, 0);
    const calls = jest.spyOn(matrix, 'applyToPoint');
    expect(getVisibleBars(matrix, { x: 100, y: 0, w: 500, h: 300 }, 1000000)).toEqual({ minIndex: 6019, maxIndex: 6120 });
    expect(calls).not.toHaveBeenCalled();
  });
});
