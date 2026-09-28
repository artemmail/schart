import type { Matrix, Rectangle } from '../models/matrix';

export interface VisibleBars { minIndex: number; maxIndex: number }

/** Inclusive edge intersection, matching clusterRect's bar [i, i + 1]. */
export function getVisibleBars(matrix: Matrix, view: Rectangle, length: number, priceScale = 1): VisibleBars {
  const empty = { minIndex: length - 1, maxIndex: 0 };
  if (length <= 0) return empty;
  const step = matrix.xScale, offset = matrix.xOffset;
  if (step > 0 && matrix.xShear === 0 && Number.isFinite(step) && Number.isFinite(offset) &&
      Number.isFinite(view.x) && Number.isFinite(view.w)) {
    let minIndex = Math.max(0, Math.ceil((view.x - offset) / step) - 1);
    let maxIndex = Math.min(length - 1, Math.floor((view.x + view.w - offset) / step));
    const touches = (i: number) => !(step * (i + 1) + offset < view.x || step * i + offset > view.x + view.w);
    // Recheck adjacent edges in screen coordinates to retain IEEE-754 rounding
    // at inclusive boundaries, without scanning the historical bars.
    if (minIndex > 0 && minIndex <= length && touches(minIndex - 1)) minIndex--;
    if (minIndex < length && !touches(minIndex)) minIndex++;
    if (maxIndex < length - 1 && maxIndex >= -1 && touches(maxIndex + 1)) maxIndex++;
    if (maxIndex >= 0 && !touches(maxIndex)) maxIndex--;
    return minIndex <= maxIndex ? { minIndex, maxIndex } : empty;
  }
  // Nonstandard mirrored/sheared transforms retain the existing predicate.
  let { minIndex, maxIndex } = empty;
  for (let i = 0; i < length; i++) {
    const p1 = matrix.applyToPoint(i, 1 - priceScale / 2);
    const p2 = matrix.applyToPoint(i + 1, 1 + priceScale / 2);
    if (!(p2.x < view.x || p1.x > view.x + view.w)) {
      minIndex = Math.min(minIndex, i); maxIndex = Math.max(maxIndex, i);
    }
  }
  return { minIndex, maxIndex };
}
