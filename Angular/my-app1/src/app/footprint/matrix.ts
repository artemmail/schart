import { Point } from '../models/Point';
import { Rectangle } from '../models/Rectangle';

class Matrix {
  private _t: any;
  private a: number;
  private b: number;
  private c: number;
  private d: number;
  private e: number;
  private f: number;
  private context: any;

  constructor(a?: any) {
    this._t = this.transform;
    this.a = this.d = 1;
    this.b = this.c = this.e = this.f = 0;
    if (a) {
      (this.context = a).setTransform(1, 0, 0, 1, 0, 0);
    }
  }

  static fromTriangles(t1: any, t2: any): Matrix {
    var m1 = new Matrix(),
      m2 = new Matrix(),
      r1: Array<number>,
      r2,
      rx1,
      ry1,
      rx2,
      ry2;

    if (Array.isArray(t1)) {
      if (typeof t1[0] === 'number') {
        rx1 = t1[4];
        ry1 = t1[5];
        rx2 = t2[4];
        ry2 = t2[5];
        r1 = [t1[0] - rx1, t1[1] - ry1, t1[2] - rx1, t1[3] - ry1, rx1, ry1];
        r2 = [t2[0] - rx2, t2[1] - ry2, t2[2] - rx2, t2[3] - ry2, rx2, ry2];
      } else {
        rx1 = t1[2].x;
        ry1 = t1[2].y;
        rx2 = t2[2].x;
        ry2 = t2[2].y;
        r1 = [
          t1[0].x - rx1,
          t1[0].y - ry1,
          t1[1].x - rx1,
          t1[1].y - ry1,
          rx1,
          ry1,
        ];
        r2 = [
          t2[0].x - rx2,
          t2[0].y - ry2,
          t2[1].x - rx2,
          t1[1].y - ry2,
          rx2,
          ry2,
        ];
      }
    } else {
      r1 = [
        t1.px - t1.rx,
        t1.py - t1.ry,
        t1.qx - t1.rx,
        t1.qy - t1.ry,
        t1.rx,
        t1.ry,
      ];
      r2 = [
        t2.px - t2.rx,
        t2.py - t2.ry,
        t2.qx - t2.rx,
        t2.qy - t2.ry,
        t2.rx,
        t2.ry,
      ];
    }

    m1.setTransform(r1[0], r1[1], r1[2], r1[3], r1[4], r1[5]);
    m2.setTransform(r2[0], r2[1], r2[2], r2[3], r2[4], r2[5]);

    return m2.multiply(m1.inverse());
  }

  static fromSVGMatrix(b: any, a: any): Matrix {
    console.warn('Obsolete. Use Matrix.from()');
    return new Matrix(a).multiply(b);
  }

  static fromDOMMatrix(b: any, a: any): Matrix {
    console.warn('Obsolete. Use Matrix.from()');
    if (!b.is2D) {
      throw 'Cannot use 3D matrix.';
    }
    return new Matrix(a).multiply(b);
  }

  static fromSVGTransformList(d: any, a: any): Matrix {
    const c = new Matrix(a);
    let b = 0;
    while (b < d.length) {
      c.multiply(d[b++].matrix);
    }
    return c;
  }

  static from(
    g: number | any,
    h: any,
    i: any,
    k: any,
    l: any,
    n: any,
    j: any
  ): Matrix {
    const o = new Matrix(j);
    if (typeof g === 'number') {
      o.setTransform(g, h, i, k, l, n);
    } else {
      if (typeof g.is2D === 'boolean' && !g.is2D) {
        throw 'Cannot use 3D DOMMatrix.';
      }
      if (h) {
        o.context = h;
      }
      o.multiply(g);
    }
    return o;
  }

  concat(a: any): Matrix {
    return this.clone().multiply(a);
  }

  flipX(): Matrix {
    return this._t(-1, 0, 0, 1, 0, 0);
  }

  flipY(): Matrix {
    return this._t(1, 0, 0, -1, 0, 0);
  }

  reflectVector(c: any, e: any): Point {
    const b = this.applyToPoint(0, 1);
    const a = (b.x * c + b.y * e) * 2;
    c -= a * b.x;
    e -= a * b.y;
    return { x: c, y: e };
  }

  reset(): Matrix {
    return this.setTransform(1, 0, 0, 1, 0, 0);
  }

  rotate(a: number): Matrix {
    const b = Math.cos(a);
    const c = Math.sin(a);
    return this._t(b, c, -c, b, 0, 0);
  }

  rotateFromVector(a: number, b: number): Matrix {
    return this.rotate(Math.atan2(b, a));
  }

  rotateDeg(a: number): Matrix {
    return this.rotate((a * Math.PI) / 180);
  }

  scaleU(a: number): Matrix {
    return this._t(a, 0, 0, a, 0, 0);
  }

  scale(a: number, b: number): Matrix {
    return this._t(a, 0, 0, b, 0, 0);
  }

  scaleX(a: number): Matrix {
    return this._t(a, 0, 0, 1, 0, 0);
  }

  scaleY(a: number): Matrix {
    return this._t(1, 0, 0, a, 0, 0);
  }

  shear(a: number, b: number): Matrix {
    return this._t(1, b, a, 1, 0, 0);
  }

  shearX(a: number): Matrix {
    return this._t(1, 0, a, 1, 0, 0);
  }

  shearY(a: number): Matrix {
    return this._t(1, a, 0, 1, 0, 0);
  }

  skew(a: number, b: number) {
    return this.shear(Math.tan(a), Math.tan(b));
  }

  skewDeg(a: number, b: number): Matrix {
    return this.shear(
      Math.tan((a / 180) * Math.PI),
      Math.tan((b / 180) * Math.PI)
    );
  }

  skewX(a: number): Matrix {
    return this.shearX(Math.tan(a));
  }

  skewY(a: number): Matrix {
    return this.shearY(Math.tan(a));
  }

  setTransform(
    g: number,
    h: number,
    i: number,
    j: number,
    k: number,
    l: number
  ): Matrix {
    const m = this;
    m.a = g;
    m.b = h;
    m.c = i;
    m.d = j;
    m.e = k;
    m.f = l;
    return m._x();
  }

  translate(a: number, b: number): Matrix {
    return this._t(1, 0, 0, 1, a, b);
  }

  translateX(a: number): Matrix {
    return this._t(1, 0, 0, 1, a, 0);
  }

  translateY(a: number): Matrix {
    return this._t(1, 0, 0, 1, 0, a);
  }

  transform(b: any, d: any, f: any, h: any, j: any, l: any): Matrix {
    const m = this;
    const a = m.a;
    const c = m.b;
    const e = m.c;
    const g = m.d;
    const i = m.e;
    const k = m.f;
    m.a = a * b + e * d;
    m.b = c * b + g * d;
    m.c = a * f + e * h;
    m.d = c * f + g * h;
    m.e = a * j + e * l + i;
    m.f = c * j + g * l + k;
    return m._x();
  }

  multiply(a: any): Matrix {
    return this._t(a.a, a.b, a.c, a.d, a.e, a.f);
  }

  divide(a: any): Matrix {
    if (!a.isInvertible()) {
      throw 'Matrix not invertible';
    }
    return this.multiply(a.inverse());
  }

  divideScalar(a: number): Matrix {
    const b = this;
    b.a /= a;
    b.b /= a;
    b.c /= a;
    b.d /= a;
    b.e /= a;
    b.f /= a;
    return b._x();
  }

  inverse(a?: any): Matrix {
    const d = this;
    const c = new Matrix(a ? d.context : null);
    const b = d.determinant();
    if (d._q(b, 0)) {
      throw 'Matrix not invertible.';
    }
    c.a = d.d / b;
    c.b = -d.b / b;
    c.c = -d.c / b;
    c.d = d.a / b;
    c.e = (d.c * d.f - d.d * d.e) / b;
    c.f = -(d.a * d.f - d.b * d.e) / b;
    return c;
  }

  interpolate(c: any, e: any, a?: any): Matrix {
    const d = this;
    const b = a ? new Matrix(a) : new Matrix();
    b.a = d.a + (c.a - d.a) * e;
    b.b = d.b + (c.b - d.b) * e;
    b.c = d.c + (c.c - d.c) * e;
    b.d = d.d + (c.d - d.d) * e;
    b.e = d.e + (c.e - d.e) * e;
    b.f = d.f + (c.f - d.f) * e;
    return b._x();
  }

  interpolateAnim(e: any, j: any, a?: any): Matrix {
    const d = new Matrix(a ? a : null);
    const b = this.decompose();
    const c = e.decompose();
    const k = b.translate;
    const l = c.translate;
    const g = b.scale;
    const f = b.rotation + (c.rotation - b.rotation) * j;
    const n = k.x + (l.x - k.x) * j;
    const o = k.y + (l.y - k.y) * j;
    const h = g.x + (c.scale.x - g.x) * j;
    const i = g.y + (c.scale.y - g.y) * j;
    d.translate(n, o);
    d.rotate(f);
    d.scale(h, i);
    return d._x();
  }

  decompose(w?: any) {
    const l = this;
    const e = l.a;
    const h = l.b;
    const i = l.c;
    const j = l.d;
    const f = Math.acos;
    const g = Math.atan;
    const u = Math.sqrt;
    const m = Math.PI;
    const v = { x: l.e, y: l.f };
    let o = 0;
    let q = { x: 1, y: 1 };
    let t = { x: 0, y: 0 };
    const k = e * j - h * i;
    if (w) {
      if (e) {
        t = { x: g(i / e), y: g(h / e) };
        q = { x: e, y: k / e };
      } else {
        if (h) {
          o = m * 0.5;
          q = { x: h, y: k / h };
          t.x = g(j / h);
        } else {
          q = { x: i, y: j };
        }
      }
    } else {
      if (e || h) {
        const n = u(e * e + h * h);
        o = h > 0 ? f(e / n) : -f(e / n);
        q = { x: n, y: k / n };
        t.x = g((e * i + h * j) / (n * n));
      } else {
        if (i || j) {
          const p = u(i * i + j * j);
          o = m * 0.5 - (j > 0 ? f(-i / p) : f(i / p));
          q = { x: k / p, y: p };
          t.y = g((e * i + h * j) / (p * p));
        } else {
          q = { x: 0, y: 0 };
        }
      }
    }
    return { translate: v, rotation: o, scale: q, skew: t };
  }

  determinant(): number {
    return this.a * this.d - this.b * this.c;
  }

  applyToPoint(x: number, y: number): Point {
    const a = this;
    return {
      x: x * a.a + y * a.c + a.e,
      y: x * a.b + y * a.d + a.f,
    };
  }

  
  applyToPoint1(point:Point): Point {
    return this.applyToPoint(point.x,point.y);
  }

  applyToArray(e: any) {
    let a = 0;
    let d,
      b,
      c = [];
    if (typeof e[0] === 'number') {
      b = e.length;
      while (a < b) {
        d = this.applyToPoint(e[a++], e[a++]);
        c.push(d.x, d.y);
      }
    } else {
      while ((d = e[a++])) {
        c.push(this.applyToPoint(d.x, d.y));
      }
    }
    return c;
  }

  applyToTypedArray(e: any, f: any) {
    let a = 0;
    let d,
      b,
      c = [];
    while (a < e.length) {
      d = this.applyToPoint(e[a], e[a + 1]);
      c[a++] = d.x;
      c[a++] = d.y;
    }
    return c;
  }

  applyToContext(a: any): Matrix {
    const b = this;
    a.setTransform(b.a, b.b, b.c, b.d, b.e, b.f);
    return b;
  }

  isIdentity(): boolean {
    const a = this;
    return (
      a._q(a.a, 1) &&
      a._q(a.b, 0) &&
      a._q(a.c, 0) &&
      a._q(a.d, 1) &&
      a._q(a.e, 0) &&
      a._q(a.f, 0)
    );
  }

  isInvertible(): boolean {
    return !this._q(this.determinant(), 0);
  }

  isValid(): boolean {
    return !(this.a * this.d);
  }

  isEqual(a: any): boolean {
    const b = this;
    const c = b._q;
    return (
      c(b.a, a.a) &&
      c(b.b, a.b) &&
      c(b.c, a.c) &&
      c(b.d, a.d) &&
      c(b.e, a.e) &&
      c(b.f, a.f)
    );
  }

  clone(a?: any): Matrix {
    return new Matrix(a ? null : this.context).multiply(this);
  }

  toArray() {
    const a = this;
    return [a.a, a.b, a.c, a.d, a.e, a.f];
  }

  toTypedArray(d: any) {
    const b = d ? new Float64Array(6) : new Float32Array(6);
    const c = this;
    b[0] = c.a;
    b[1] = c.b;
    b[2] = c.c;
    b[3] = c.d;
    b[4] = c.e;
    b[5] = c.f;
    return b;
  }

  toCSS() {
    return 'matrix(' + this.toArray() + ')';
  }

  toCSS3D() {
    const a = this;
    return (
      'matrix3d(' +
      a.a +
      ',' +
      a.b +
      ',0,0,' +
      a.c +
      ',' +
      a.d +
      ',0,0,0,0,1,0,' +
      a.e +
      ',' +
      a.f +
      ',0,1)'
    );
  }

  toJSON() {
    const a = this;
    return (
      '{"a":' +
      a.a +
      ',"b":' +
      a.b +
      ',"c":' +
      a.c +
      ',"d":' +
      a.d +
      ',"e":' +
      a.e +
      ',"f":' +
      a.f +
      '}'
    );
  }

  toString(a?: any) {
    const b = this;
    a = a || 4;
    return (
      'a=' +
      b.a.toFixed(a) +
      ' b=' +
      b.b.toFixed(a) +
      ' c=' +
      b.c.toFixed(a) +
      ' d=' +
      b.d.toFixed(a) +
      ' e=' +
      b.e.toFixed(a) +
      ' f=' +
      b.f.toFixed(a)
    );
  }

  _q(a: number, b: number) {
    return Math.abs(a - b) < 1e-14;
  }

  _x() {
    const a = this;
    if (a.context) {
      a.context.setTransform(a.a, a.b, a.c, a.d, a.e, a.f);
    }
    return a;
  }

  getTranslate(x: any, y: any): Matrix {
    var m = new Matrix();
    m.translate(x, y);
    m.multiply(this);
    return m;
  }
  reassignX(from: any, to: any): Matrix {
    var m = Matrix.fromTriangles(
      [from.x1, 0, from.x2, 0, from.x1, 1],
      [to.x1, 0, to.x2, 0, to.x1, 1]
    );
    m.b = this.b;
    m.d = this.d;
    m.f = this.f;
    return m;
  }
  reassignY(from: any, to: any): Matrix {
    var m = Matrix.fromTriangles(
      [0, from.y1, 0, from.y2, 1, from.y1],
      [0, to.y1, 0, to.y2, 1, to.y1]
    );
    m.a = this.a;
    m.c = this.c;
    m.e = this.e;
    return m;
  }

  MapX(x: number): number {
    return this.inverse().applyToPoint(x, 0).x;
  }

  Height2Price(y: number): number {
    return this.inverse().applyToPoint(0, y).y;
  }

  price2Height(price: any, columnNumber: any): Point {
    return this.applyToPoint(columnNumber, price);
  }
}

export { Matrix, Point, Rectangle };
