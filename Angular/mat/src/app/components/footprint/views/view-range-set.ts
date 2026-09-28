import { Matrix, Point, Rectangle } from '../models/matrix';
import { canvasPart } from './canvas-part';
import type { ChartViewContext } from '../models/chart-runtime-context';
import { CandlesRangeSetValue } from 'src/app/models/candles-range-set';
import { MyMouseEvent } from 'src/app/models/MyMouseEvent';
import * as Hammer from 'hammerjs';
import { drob } from 'src/app/service/FootPrint/utils';


export class viewRangeSet extends canvasPart<ChartViewContext> {
  private cancelSwipeAnimation?: () => void;
  private startTime: number;
  private v0: number;
  private damping: number;
  private isScrolling: boolean;

  constructor(parent: ChartViewContext, view: Rectangle, mtx: Matrix) {
    super(parent, view, mtx);

    this.startTime = 0;
    this.v0 = 0;
    this.damping = 1500.0; // коэффициент затухания скорости
    this.isScrolling = false;
  }

  override dispose(): void {
    if (this.isDisposed) return;
    this.cancelSwipeAnimation?.();
    this.cancelSwipeAnimation = undefined;
    this.isScrolling = false;
    super.dispose();
  }

  stopSwipe() {
    this.cancelSwipeAnimation?.();
    this.cancelSwipeAnimation = undefined;
    this.isScrolling = false;
    if (this.isDisposed) return;
    if (this.parent.translateMatrix != null) {
      if (!this.parent.markupEnabled || this.parent.markup.allowPan()) {
        this.parent.viewport.mtx = this.parent.alignMatrix(
          this.parent.translateMatrix.multiply(this.parent.viewport.mtx)
        );
        this.parent.translateMatrix = null;
      }
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
      this.parent.requestRender();
    } else {
      this.stopSwipe();
    }
  }

  onSwipe = (event: Hammer.HammerInput): void => {
    if (this.isDisposed) return;
    this.interruptSwipe();

    this.v0 = event.velocityX * 1000; // начальная скорость в пикселях/секунду
    this.startTime = Date.now();
    this.isScrolling = true;

    const t_stop = this.calculateStopTime();

    this.cancelSwipeAnimation = this.parent.animations.animate(() => {
      if (this.isDisposed || !this.isScrolling) return false;
      const elapsed = this.calculateElapsed();
      const dx = this.calculateDisplacement(elapsed, t_stop);
      this.applyDisplacement(dx);
      if (elapsed <= t_stop && Math.abs(dx) > 1 && this.isScrolling) return true;
      this.stopSwipe();
      return false;
    });
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
      if (!this.parent.markupEnabled || this.parent.markup.allowPan()) {
        this.parent.viewport.mtx = this.parent.alignMatrix(
          this.parent.translateMatrix.multiply(this.parent.viewport.mtx)
        );
        this.parent.translateMatrix = null;
      }
  }

  onMouseDown(e: Point) {
    this.interruptSwipe();
    if (this.parent.markupEnabled) this.parent.markup.onMouseDown(e);
  }

  onMouseMovePressed(e: Point) {
    if (this.parent.markupEnabled) this.parent.markup.onMouseDownMove(e);

    if (!this.parent.markupEnabled || this.parent.markup.allowPan())
      this.parent.translateMatrix = new Matrix().translate(
        -(this.parent.input.pressd.x - e.x),
        -(this.parent.input.pressd.y - e.y)
      );

    this.parent.requestRender();
  }

  onMouseMove(e: MyMouseEvent) {
    if (!this.parent.data) {
      this.hideHintKeepSelection();
      return;
    }

    const point = this.mtx.inverse().applyToPoint1(e.position);
    const p =
      Math.round(point.y / this.parent.data.priceScale) *
      this.parent.data.priceScale;
    this.parent.selectedPrice = drob(p, 4);

    this.drawHint(e);
    this.parent.requestRender();
  }

  drawHint(event: MyMouseEvent) {
    const rangeSetLines = this.parent.data?.rangeSetLines;
    const isScrolling = this.parent.translateMatrix !== null;

    if (!rangeSetLines?.length) {
      this.hideHintKeepSelection();
      return;
    }

    const point = this.mtx.inverse().applyToPoint1(event.position);
    const index = Math.floor(point.x);

    if (index < 0 || index >= rangeSetLines.length) {
      if (!isScrolling) this.hideHintKeepSelection();
      return;
    }

    const line = rangeSetLines[index];

    const price1 = line.Price1;
    const price2 = line.Price2;
    const income1 = (line.Price1normalized - 1) * 100;
    const income2 = (line.Price2normalized - 1) * 100;
    const delta = income1 - income2;

    if (!Number.isFinite(price1) || !Number.isFinite(price2)) {
      if (!isScrolling) this.hideHintKeepSelection();
      return;
    }

    const formatPercent = (value: number) => `${drob(value, 2)}%`;
    const signedColor = (value: number) =>
      value > 0 ? this.palette.upStrong : value < 0 ? this.palette.downStrong : this.palette.text;
    const price1Color = this.palette.bid;
    const price2Color = this.palette.ask;

    const item = (label: string, value: string, color?: string) => {
      const colorStyle = color ? ` style="color:${color}"` : '';
      return `<li style='font-size: 12px;'><b${colorStyle}>${label}: </b>${value}</li>`;
    };

    const content = [
      item('Портф1', price1.toString(), price1Color),
      item('Портф2', price2.toString(), price2Color),
      item('Доход 1', formatPercent(income1), signedColor(income1)),
      item('Доход 2', formatPercent(income2), signedColor(income2)),
      item('Дельта', formatPercent(delta), signedColor(delta)),
      item('Date', this.formatService.toStr(line.Date)),
      item('Time', this.formatService.TimeFormat2(line.Date)),
    ].join('');

    const hintContent = `<ul style='font-size: 10px;margin: 0; padding: 0px;list-style-type:none'>${content} </ul>`;

    const position = {
      x: event.screen.x + 5,
      y: event.screen.y + 5,
    };

    this.parent.showHint(hintContent, position);
  }

  private hideHintKeepSelection(): void {
    this.parent.hiddenHint = true;
    this.parent.hideHintElement();
  }

  onMouseUp(e: Point) {
    if (this.parent.markupEnabled) this.parent.markup.onMouseUp(e);

    if (!this.parent.markupEnabled || this.parent.markup.allowPan()) {
      if (this.parent.translateMatrix != null)
        this.parent.viewport.mtx = this.parent.alignMatrix(
          this.parent.translateMatrix.multiply(this.parent.viewport.mtx)
        );
      this.parent.translateMatrix = null;
    }

    this.parent.requestRender();
  }

  onPinchEnd(e: any) {
    if (this.parent.translateMatrix != null)
      this.parent.viewport.mtx = this.parent.alignMatrix(
        this.parent.translateMatrix.multiply(this.parent.viewport.mtx)
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
    this.parent.requestRender();
  }

  onPinchMove(e: any) {
    this.onPinchStart(e);
  }

  onMouseWheel(ev: MyMouseEvent, wheelDistance: number) {
    var s = Math.pow(1.05, wheelDistance);
    const [x, y] = [ev.position.x, ev.position.y];

    this.drawHint(ev);

    var m = Matrix.fromTriangles(
      [x, y, x + 1, y + 1, x + 1, y - 1],
      [x, y, x + s, y + s, x + s, y - s]
    );
    this.parent.viewport.mtx = this.parent.alignMatrix(
      m.multiply(this.parent.viewport.mtx),
      this.parent.isPriceVisible()
    );
    this.parent.requestRender();
  }

  draw(parent: ChartViewContext, view: Rectangle, mtx: Matrix): void {
    const rangeSetLines = parent.data?.rangeSetLines ?? [];
    if (!rangeSetLines.length) {
      return;
    }

    const stats = parent.data.getRenderStats(!!parent.FPsettings?.ShrinkY);
    let min = stats.minPrice;
    let max = stats.maxPrice;

    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      return;
    }

    if (max === min) {
      const base = Math.abs(min);
      const pad = Math.max(base * 0.001, 1e-6);
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
      this.drawSeries(rangeSetLines, percentMatrix, (p) => p.Price1normalized, this.palette.bid);
    this.drawSeries(rangeSetLines, percentMatrix, (p) => p.Price2normalized, this.palette.ask);
  }

  private drawZeroLine(mtx: Matrix, view: Rectangle) {
    const ctx = this.parent.ctx;
    const zero = mtx.applyToPoint(0, 0);

    ctx.save();
    ctx.strokeStyle = this.palette.gridSoft;
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
