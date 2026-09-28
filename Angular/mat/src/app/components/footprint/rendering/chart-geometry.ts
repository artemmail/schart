import type { Matrix, Rectangle } from '../models/matrix';

export function barRectangle(matrix: Matrix, priceScale: number): Rectangle {
  const start = matrix.applyToPoint(0, 0), end = matrix.applyToPoint(1, priceScale);
  return { x: 0, y: 0, w: end.x - start.x, h: end.y - start.y };
}
export function clusterRectangle(matrix: Matrix, priceScale: number, price: number, column: number, width = 1): Rectangle {
  const start = matrix.applyToPoint(column, price - priceScale / 2);
  const end = matrix.applyToPoint(column + width, price + priceScale / 2);
  return { x: start.x, y: start.y, w: end.x - start.x, h: end.y - start.y };
}
export function clusterFontSize(rect: Rectangle, textLength: number, maxFontSize: number): number {
  return Math.min(Math.abs(rect.h) - 1, Math.abs(rect.w) / textLength, maxFontSize);
}
