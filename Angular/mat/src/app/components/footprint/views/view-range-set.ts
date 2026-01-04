import { Matrix, Point, Rectangle } from '../models/matrix';
import { canvasPart } from './canvas-part';
import { FootPrintComponent } from '../components/footprint/footprint.component';
import { CandlesRangeSetValue } from 'src/app/models/candles-range-set';
import { MyMouseEvent } from 'src/app/models/MyMouseEvent';
import * as Hammer from 'hammerjs';
import { drob } from 'src/app/service/FootPrint/utils';


const SERIES_COLORS = {
  price1: '#f2d53c',
  price2: '#2b6cb0',
};

export class viewRangeSet extends canvasPart {
  private frame: number;
  private startTime: number;
  private v0: number;
  private damping: number;
  private isScrolling: boolean;

  constructor(parent: FootPrintComponent, view: Rectangle, mtx: Matrix) {
    super(parent, view, mtx);

    this.frame = 0;
    this.startTime = 0;
    this.v0 = 0;
    this.damping = 1500.0; // коэффициент затухания скорости
    this.isScrolling = false;
  }

  stopSwipe() {
    if (this.parent.translateMatrix != null) {
      if (!this.parent.markupEnabled || this.parent.markupManager.allowPan()) {
        this.parent.viewsManager.mtx = this.parent.alignMatrix(
          this.parent.translateMatrix.multiply(this.parent.viewsManager.mtx)
        );
        this.parent.translateMatrix = null;
      }
      cancelAnimationFrame(this.frame);
      this.isScrolling = false;
    }
  }

  calculateElapsed(): number {
    return (Date.now() - this.startTime) / 1000; // переводим миллисекунды в секунды
  }

  calculateStopTime(): number {
    return Math.abs(this.v0) / this.damping;
  }

  calculateDisplacement(t: number, t_stop: number): number {
    if (t <= t_stop) {
      return this.v0 * t - 0.5 * this.damping * t * t;
    } else {
      return this.v0 * t_stop - 0.5 * this.damping * t_stop * t_stop;
    }
  }

  applyDisplacement(dx: number) {
    if (Math.abs(dx) > 1) {
      this.parent.translateMatrix = new Matrix().translate(dx, 0);
      this.parent.drawClusterView();
    } else {
      this.stopSwipe();
    }
  }

  onSwipe = (event: Hammer.HammerInput): void => {
    this.interruptSwipe();

    this.v0 = event.velocityX * 1000; // начальная скорость в пикселях/секунду
    this.startTime = Date.now();
    this.isScrolling = true;

    const t_stop = this.calculateStopTime();

    const inertiaScroll = () => {
      const elapsed = this.calculateElapsed();
      const dx = this.calculateDisplacement(elapsed, t_stop);

      this.applyDisplacement(dx);

      if (elapsed <= t_stop && Math.abs(dx) > 1) {
        this.frame = requestAnimationFrame(inertiaScroll);
      } else {
        this.stopSwipe();
      }
    };

    this.frame = requestAnimationFrame(inertiaScroll);
  };

  interruptSwipe() {
    if (this.isScrolling) {
      const elapsed = this.calculateElapsed();
      const t_stop = this.calculateStopTime();
      const dx = this.calculateDisplacement(elapsed, t_stop);

      this.applyDisplacement(dx);
      this.stopSwipe();
    }
  }

  onTap(e: any) {
    this.interruptSwipe();
  }

  onPanEnd(e: any) {
    if (this.parent.translateMatrix != null)
      if (!this.parent.markupEnabled || this.parent.markupManager.allowPan()) {
        this.parent.viewsManager.mtx = this.parent.alignMatrix(
          this.parent.translateMatrix.multiply(this.parent.viewsManager.mtx)
        );
        this.parent.translateMatrix = null;
      }
  }

  onMouseDown(e: Point) {
    this.interruptSwipe();
    if (this.parent.markupEnabled) this.parent.markupManager.onMouseDown(e);
  }

  onMouseMovePressed(e: Point) {
    if (this.parent.markupEnabled) this.parent.markupManager.onMouseDownMove(e);

    if (!this.parent.markupEnabled || this.parent.markupManager.allowPan())
      this.parent.translateMatrix = new Matrix().translate(
        -(this.parent.mouseAndTouchManager.pressd.x - e.x),
        -(this.parent.mouseAndTouchManager.pressd.y - e.y)
      );

    this.parent.drawClusterView();
  }

  onMouseMove(e: MyMouseEvent) {
    this.drawHint(e);
  }

  drawHint(event: MyMouseEvent) {
    const rangeSetLines = this.parent.data?.rangeSetLines;

    if (!rangeSetLines?.length) {
      this.parent.hideHint();
      return;
    }

    const point = this.mtx.inverse().applyToPoint1(event.position);
    const index = Math.floor(point.x);

    if (index < 0 || index >= rangeSetLines.length) {
      this.parent.hideHint();
      return;
    }

    const line = rangeSetLines[index];

    const price1 = line.Price1;
    const price2 = line.Price2;
    const income1 = (line.Price1normalized - 1) * 100;
    const income2 = (line.Price2normalized - 1) * 100;
    const delta = income1 - income2;

    if (!Number.isFinite(price1) || !Number.isFinite(price2)) {
      this.parent.hideHint();
      return;
    }

    const formatPercent = (value: number) => `${drob(value, 2)}%`;
    const signedColor = (value: number) =>
      value > 0 ? 'green' : value < 0 ? 'red' : 'black';

    const item = (label: string, value: string, color?: string) => {
      const colorStyle = color ? ` style="color:${color}"` : '';
      return `<li style='font-size: 12px;'><b${colorStyle}>${label}: </b>${value}</li>`;
    };

    const content = [
      item('Портф1', drob(price1, 2).toString(), 'DarkGoldenRod'),
      item('Портф2', drob(price2, 2).toString(), 'DarkBlue'),
      item('Доход 1', formatPercent(income1), signedColor(income1)),
      item('Доход 2', formatPercent(income2), signedColor(income2)),
      item('Дельта', formatPercent(delta), signedColor(delta)),
      item('Date', this.formatService.toStr(line.Date)),
      item('Time', this.formatService.TimeFormat2(line.Date)),
    ].join('');

    const hintContent = `<ul style='font-size: 10px;margin: 0; padding: 0px;list-style-type:none'>${content} </ul>`;

    const position = {
      x: event.screen.x / window.devicePixelRatio + 5,
      y: event.screen.y / window.devicePixelRatio + 5,
    };

    this.parent.showHint(hintContent, position);
  }

  onMouseUp(e: Point) {
    if (this.parent.markupEnabled) this.parent.markupManager.onMouseUp(e);

    if (!this.parent.markupEnabled || this.parent.markupManager.allowPan()) {
      if (this.parent.translateMatrix != null)
        this.parent.viewsManager.mtx = this.parent.alignMatrix(
          this.parent.translateMatrix.multiply(this.parent.viewsManager.mtx)
        );
      this.parent.translateMatrix = null;
    }

    this.parent.drawClusterView();
  }

  onPinchEnd(e: any) {
    if (this.parent.translateMatrix != null)
      this.parent.viewsManager.mtx = this.parent.alignMatrix(
        this.parent.translateMatrix.multiply(this.parent.viewsManager.mtx)
      );
    this.parent.translateMatrix = null;
  }

  onPinchStart(e: any) {
    //alert('pinch');
    var s = e.scale;
    var sx = Math.abs(Math.cos((e.angle * 3.14159) / 180));
    var sy = Math.abs(Math.sin((e.angle * 3.14159) / 180));
    sx = sy = s;
    var x = e.center.x;
    var y = e.center.y;
    var m = Matrix.fromTriangles(
      [x, y, x + 1, y + 1, x + 1, y - 1],
      [x, y, x + sx, y + sy, x + sx, y - sy]
    );
    this.parent.translateMatrix = m;
    this.parent.drawClusterView();
  }

  onPinchMove(e: any) {
    this.onPinchStart(e);
  }

  onMouseWheel(ev: MyMouseEvent, wheelDistance: number) {
    var s = Math.pow(1.05, wheelDistance);
    const [x, y] = [ev.position.x, ev.position.y];

    this.parent.hideHint();

    var m = Matrix.fromTriangles(
      [x, y, x + 1, y + 1, x + 1, y - 1],
      [x, y, x + s, y + s, x + s, y - s]
    );
    this.parent.viewsManager.mtx = this.parent.alignMatrix(
      m.multiply(this.parent.viewsManager.mtx),
      this.parent.isPriceVisible()
    );
    this.parent.drawClusterView();
  }

  draw(parent: FootPrintComponent, view: Rectangle, mtx: Matrix): void {

    debugger
    const rangeSetLines = parent.data?.rangeSetLines ?? [];
    if (!rangeSetLines.length) {
      return;
    }

    const hasRawPrices = rangeSetLines.some(
      (point) => Number.isFinite(point.Price1) || Number.isFinite(point.Price2)
    );
/*
    if (hasRawPrices) {
      this.drawSeries(rangeSetLines, mtx, (p) => p.Price1, SERIES_COLORS.price1);
      this.drawSeries(rangeSetLines, mtx, (p) => p.Price2, SERIES_COLORS.price2);
      return;
    }
*/
    let min = parent.data.minPrice;
    let max = parent.data.maxPrice;

    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      return;
    }

    if (max === min) {
      const pad = parent.data.priceScale || 1;
      max += pad;
      min -= pad;
    } else {
      const pad = (max - min) / 10;
      max += pad;
      min -= pad;
    }

    const percentMatrix = mtx.reassignY(
      { y1: min, y2: max },
      { y1: view.y + view.h, y2: view.y }
    );

    this.drawZeroLine(percentMatrix, view);
    this.drawSeries(rangeSetLines, percentMatrix, (p) => p.Price1normalized, SERIES_COLORS.price1);
    this.drawSeries(rangeSetLines, percentMatrix, (p) => p.Price2normalized, SERIES_COLORS.price2);
  }

  private drawZeroLine(mtx: Matrix, view: Rectangle) {
    const ctx = this.parent.ctx;
    const zero = mtx.applyToPoint(0, 0);

    ctx.save();
    ctx.strokeStyle = '#bcbcbc';
    ctx.beginPath();
    ctx.myLine(view.x, zero.y, view.x + view.w, zero.y);
    ctx.stroke();
    ctx.restore();
  }

  private drawSeries(
    points: CandlesRangeSetValue[],
    mtx: Matrix,
    selector: (point: CandlesRangeSetValue) => number | undefined,
    color: string
  ) {
    const ctx = this.parent.ctx;
    const ordered = [...points]
      .map((point) => ({ point, value: selector(point) }))
      .filter((item) => Number.isFinite(item.value))
      .sort((a, b) => a.point.columnIndex - b.point.columnIndex);

    if (!ordered.length) {
      return;
    }

    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();

    ordered.forEach(({ point, value }, index) => {
      const position = mtx.applyToPoint(point.columnIndex + 0.5, value as number);
      if (index === 0) {
        ctx.moveTo(position.x, position.y);
      } else {
        ctx.lineTo(position.x, position.y);
      }
    });

    ctx.stroke();

    ordered.forEach(({ point, value }) => {
      const position = mtx.applyToPoint(point.columnIndex + 0.5, value as number);
      ctx.beginPath();
      ctx.arc(position.x, position.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  }
}
