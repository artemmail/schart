import { Matrix, Rectangle } from './matrix';

export function getBar(mtx: Matrix): Rectangle {
  var p1 = mtx.applyToPoint(0, 0);
  var p2 = mtx.applyToPoint(1, this.data.priceScale);
  return { x: 0, y: 0, w: p2.x - p1.x, h: p2.y - p1.y };
}
export function clusterRect(price: number, columnNumber: number, mtx: Matrix) {
  var p1 = mtx.applyToPoint(columnNumber, price - this.data.priceScale / 2);
  var p2 = mtx.applyToPoint(columnNumber + 1, price + this.data.priceScale / 2);
  return { x: p1.x, y: p1.y, w: p2.x - p1.x, h: p2.y - p1.y };
}
export function clusterRect2(
  price: number,
  columnNumber: number,
  w: number,
  mtx: Matrix
) {
  var p1 = mtx.applyToPoint(columnNumber, price - this.data.priceScale / 2);
  var p2 = mtx.applyToPoint(columnNumber + w, price + this.data.priceScale / 2);
  return { x: p1.x, y: p1.y, w: p2.x - p1.x, h: p2.y - p1.y };
}
export function clusterFontSize(mtx: Matrix, textLen: number) {
  return clusterRectFontSize(clusterRect(0, 0, mtx), textLen);
}
export function clusterRectFontSize(rect: Rectangle, textLen: number) {
  var w = Math.abs(rect.w);
  var h = Math.abs(rect.h);
  return Math.min(h - 1, w / textLen, this.colorsService.maxFontSize());
}
