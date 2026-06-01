import { canvasPart } from './canvas-part';
import { Matrix, Rectangle } from '../models/matrix';
import { FootPrintComponent } from '../components/footprint/footprint.component';
import { DataSeries } from '../indicators/indicator-api';
import { DraggableEnum } from 'src/app/models/Draggable';

export class viewIndicatorPanel extends canvasPart {
  constructor(
    parent: FootPrintComponent,
    view: Rectangle,
    mtx: Matrix,
    public readonly panelId: string
  ) {
    super(parent, view, mtx, DraggableEnum.Top);
  }

  override drawCanvas(): void {
    const rightScaleWidth = this.getRightScaleWidth();

    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.myRect({
      x: this.view.x,
      y: this.view.y,
      w: this.view.w + rightScaleWidth,
      h: this.view.h,
    } as Rectangle);
    this.ctx.clip();
    this.draw(this.parent, this.view, this.mtx);
    this.ctx.restore();
  }

  override draw(parent: FootPrintComponent, view: Rectangle, mtx: Matrix): void {
    const engine = parent.indicatorEngine;
    if (!engine) return;

    const series = engine.getPanelSeries(this.panelId);
    if (!series.length) return;

    const ctx = parent.ctx;
    if (!ctx) return;

    const range = this.computeMinMax(parent, series);
    if (!range) {
      const panelMessage = this.resolvePanelMessage(series);
      if (panelMessage) {
        this.drawPanelMessage(ctx, view, panelMessage);
      }
      return;
    }

    // draw zebra background + scale like built-in footprint panels
    this.drawRightScaleBackground(ctx, view);
    this.DrawZebra(ctx, view.x, view.y, view.w, view.h, range.min, range.max);
    this.drawVertical();

    ctx.save();
    ctx.beginPath();
    ctx.myRect(this.view);
    ctx.clip();

    const panelMtx = mtx.reassignY(
      { y1: range.min, y2: range.max },
      { y1: view.y + view.h, y2: view.y }
    );

    const barsCount = Math.max(
      parent.data?.clusterData.length ?? 0,
      ...series.map((s) => s.values.length)
    );
    const stackBases = new Map<string, Float64Array>();
    for (const s of series) {
      if (s.visual === 'Histogram' && s.histogramStackId) {
        if (!stackBases.has(s.histogramStackId)) {
          stackBases.set(s.histogramStackId, new Float64Array(barsCount));
        }
      }
    }

    for (const s of series) {
      if (s.visual === 'Histogram') {
        if (s.histogramStackId) {
          const base = stackBases.get(s.histogramStackId);
          if (base) {
            this.drawHistogramStacked(ctx, parent, panelMtx, view, s, range, base);
            this.accumulateStackBase(parent, s, base);
          } else {
            this.drawHistogram(ctx, parent, panelMtx, view, s, range);
          }
        } else {
          this.drawHistogram(ctx, parent, panelMtx, view, s, range);
        }
      } else if (s.visual === 'Line') {
        this.drawLine(ctx, parent, panelMtx, s);
      } else if (s.visual === 'Points') {
        this.drawPoints(ctx, parent, panelMtx, s);
      }
    }

    ctx.restore();
    this.drawOpenPositionsLegend(ctx, parent, view, series);
  }

  onMouseDown(_point: any): void {
    this.parent.viewsManager?.viewMain?.interruptSwipe?.();
  }

  onMouseMovePressed(point: any): void {
    const manager = this.parent.mouseAndTouchManager;
    if (!manager) return;

    this.parent.hideHint();
    this.parent.translateMatrix = new Matrix().translate(
      -(manager.pressd.x - point.x),
      0
    );
    this.parent.drawClusterView();
  }

  onMouseUp(_point: any): void {
    this.commitHorizontalMove();
    this.parent.drawClusterView();
  }

  onMouseWheel(ev: any, wheelDistance: number): void {
    const view = this.parent.viewsManager?.clusterView;
    if (!view) return;

    const s = Math.pow(1.05, wheelDistance);
    const x = ev.position.x;
    const y = view.y + view.h / 2;
    const m = Matrix.fromTriangles(
      [x, y, x + 1, y + 1, x + 1, y - 1],
      [x, y, x + s, y + s, x + s, y - s]
    );

    this.parent.viewsManager.mtx = this.parent.alignMatrix(
      m.multiply(this.parent.viewsManager.mtx),
      this.parent.isPriceVisible()
    );
    this.parent.drawClusterView();
  }

  onPanStart(event: any): void {
    this.parent.viewsManager?.viewMain?.interruptSwipe?.();
    this.parent.translateMatrix = new Matrix().translate(event.deltaX ?? 0, 0);
    this.parent.drawClusterView();
  }

  onPan(event: any): void {
    this.onPanStart(event);
  }

  onPanEnd(_event: any): void {
    this.commitHorizontalMove();
  }

  onSwipe(event: any): void {
    this.parent.viewsManager?.viewMain?.onSwipe?.(event);
  }

  private commitHorizontalMove(): void {
    if (this.parent.translateMatrix == null) return;
    this.parent.viewsManager.mtx = this.parent.alignMatrix(
      this.parent.translateMatrix.multiply(this.parent.viewsManager.mtx)
    );
    this.parent.translateMatrix = null;
  }

  private getRightScaleWidth(): number {
    const canvasWidth = this.parent.canvas?.width ?? 0;
    const viewRight = this.view.x + this.view.w;
    if (canvasWidth > viewRight) {
      return canvasWidth - viewRight;
    }

    return Math.max(
      0,
      this.parent.viewsManager?.clusterPricesView?.w ??
        this.colorsService.LegendPriceWidth(this.parent.minimode)
    );
  }

  private drawRightScaleBackground(ctx: CanvasRenderingContext2D, view: Rectangle): void {
    const w = this.getRightScaleWidth();
    if (w <= 0) return;

    ctx.fillStyle = this.palette.bg;
    ctx.fillRect(view.x + view.w, view.y, w, view.h);
  }

  private drawOpenPositionsLegend(
    ctx: CanvasRenderingContext2D,
    parent: FootPrintComponent,
    view: Rectangle,
    series: DataSeries[]
  ): void {
    const from = Math.max(0, Math.floor(parent.minIndex ?? 0));
    const to = Math.max(from, Math.floor(parent.maxIndex ?? Math.max(0, parent.data?.clusterData.length ?? 0)));

    const hasVisiblePoint = (s: DataSeries): boolean => {
      for (let i = from; i <= to; i++) {
        if (isFinite(s.values[i])) {
          return true;
        }
      }
      return false;
    };

    const items = series
      .filter((s) => hasVisiblePoint(s))
      .map((s) => {
        switch (s.id) {
          case 'OPI_PL':
            return { color: s.color ?? this.palette.up, text: 'Физ Long' };
          case 'OPI_PS':
            return { color: s.color ?? this.palette.down, text: 'Физ Short' };
          case 'OPI_JL':
            return { color: s.color ?? this.palette.accent, text: 'Юр Long' };
          case 'OPI_JS':
            return { color: s.color ?? this.palette.gridZero, text: 'Юр Short' };
          case 'OPI_VSJ':
            return { color: s.color ?? this.palette.accentSoft, text: 'Позиции Юр-Позиции Физ' };
          default:
            return null;
        }
      })
      .filter((x): x is { color: string; text: string } => !!x);

    if (!items.length) {
      return;
    }

    const unique = new Map<string, { color: string; text: string }>();
    for (const item of items) {
      unique.set(item.text, item);
    }
    const legendItems = [...unique.values()];
    if (!legendItems.length) {
      return;
    }

    const top = Math.round(view.y + 6);
    const left = Math.round(view.x + 8);
    const rowH = Math.max(12, Math.round(12 * this.colorsService.sscale()));
    const box = Math.max(8, Math.round(8 * this.colorsService.sscale()));
    const gap = 10;
    let x = left;
    let y = top;

    ctx.save();
    ctx.font = `${Math.max(10, Math.round(10 * this.colorsService.sscale()))}px sans-serif`;
    ctx.textBaseline = 'top';

    for (const item of legendItems) {
      const textW = Math.ceil(ctx.measureText(item.text).width);
      const itemW = box + 4 + textW + gap;
      if (x + itemW > view.x + view.w - 8) {
        x = left;
        y += rowH;
      }

      ctx.fillStyle = item.color;
      ctx.fillRect(x, y + 2, box, box);
      ctx.strokeStyle = this.palette.grid;
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y + 2, box, box);

      ctx.fillStyle = this.palette.text;
      ctx.fillText(item.text, x + box + 4, y);
      x += itemW;
    }

    ctx.restore();
  }

  private resolvePanelMessage(series: DataSeries[]): string | null {
    for (const s of series) {
      const msg = s.panelMessage?.trim();
      if (msg) {
        return msg;
      }
    }

    return null;
  }

  private drawPanelMessage(ctx: CanvasRenderingContext2D, view: Rectangle, message: string): void {
    ctx.save();
    ctx.fillStyle = this.palette.textMuted ?? this.palette.text;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${Math.max(11, Math.round(11 * this.colorsService.sscale()))}px sans-serif`;
    ctx.fillText(message, view.x + view.w / 2, view.y + view.h / 2);
    ctx.restore();
  }

  private computeMinMax(parent: FootPrintComponent, series: DataSeries[]): { min: number; max: number } | null {
    const from = parent.minIndex ?? 0;
    const to = parent.maxIndex ?? Math.max(0, parent.data?.clusterData.length ?? 0);

    const fixedRanges = series
      .map((s) => s.fixedRange)
      .filter(
        (r): r is NonNullable<DataSeries['fixedRange']> =>
          !!r && isFinite(r.min) && isFinite(r.max)
      );

    if (fixedRanges.length > 0 && fixedRanges.length === series.length) {
      let fixedMin = Number.POSITIVE_INFINITY;
      let fixedMax = Number.NEGATIVE_INFINITY;
      for (const r of fixedRanges) {
        fixedMin = Math.min(fixedMin, r.min);
        fixedMax = Math.max(fixedMax, r.max);
      }

      if (!isFinite(fixedMin) || !isFinite(fixedMax)) return null;
      if (fixedMin === fixedMax) {
        fixedMin -= 1;
        fixedMax += 1;
      }

      return { min: fixedMin, max: fixedMax };
    }

    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    let any = false;

    const allHistBottom =
      series.length > 0 &&
      series.every((s) => s.visual === 'Histogram' && (s.histogramBaseline ?? 'bottom') === 'bottom');

    const stackGroups = new Map<string, DataSeries[]>();
    const stackedSeries = new Set<DataSeries>();
    for (const s of series) {
      if (s.visual === 'Histogram' && s.histogramStackId) {
        const list = stackGroups.get(s.histogramStackId) ?? [];
        list.push(s);
        stackGroups.set(s.histogramStackId, list);
        stackedSeries.add(s);
      }
    }

    for (let i = from; i <= to; i++) {
      for (const group of stackGroups.values()) {
        let sum = 0;
        let anyGroup = false;
        for (const s of group) {
          const v = s.values[i];
          if (!isFinite(v)) continue;
          sum += v;
          anyGroup = true;
        }
        if (anyGroup) {
          any = true;
          min = Math.min(min, sum);
          max = Math.max(max, sum);
        }
      }

      for (const s of series) {
        if (stackedSeries.has(s)) continue;
        const v = s.values[i];
        if (!isFinite(v)) continue;
        any = true;
        min = Math.min(min, v);
        max = Math.max(max, v);
      }
    }

    if (!any) return null;

    if (allHistBottom) {
      min = 0;
      if (max <= 0) max = 1;
      max = max * 1.1;
    } else {
      const d = (max - min) / 10;
      if (isFinite(d) && d > 0) {
        min -= d;
        max += d;
      } else {
        min -= 1;
        max += 1;
      }
    }

    if (min === max) {
      min -= 1;
      max += 1;
    }

    return { min, max };
  }

  private drawLine(ctx: CanvasRenderingContext2D, parent: FootPrintComponent, mtx: Matrix, s: DataSeries): void {
    const from = parent.minIndex ?? 0;
    const to = parent.maxIndex ?? Math.max(0, parent.data?.clusterData.length ?? 0);

    ctx.save();
    ctx.strokeStyle = s.color ?? this.palette.accent;
    ctx.lineWidth = Math.max(1, s.width ?? 1);
    this.applyLineStyle(ctx, s.lineStyle);
    ctx.beginPath();
    let started = false;
    for (let i = from; i <= to; i++) {
      const v = s.values[i];
      if (!isFinite(v)) {
        started = false;
        continue;
      }
      const p = mtx.applyToPoint(i + 0.5, v);
      if (!started) {
        ctx.moveTo(p.x, p.y);
        started = true;
      } else {
        ctx.lineTo(p.x, p.y);
      }
    }
    ctx.stroke();
    ctx.restore();
  }

  private applyLineStyle(ctx: CanvasRenderingContext2D, style?: string): void {
    switch (style) {
      case 'dashed':
        ctx.setLineDash([6, 4]);
        ctx.lineCap = 'butt';
        break;
      case 'dotted':
        ctx.setLineDash([2, 4]);
        ctx.lineCap = 'round';
        break;
      default:
        ctx.setLineDash([]);
        ctx.lineCap = 'butt';
    }
  }

  private drawPoints(ctx: CanvasRenderingContext2D, parent: FootPrintComponent, mtx: Matrix, s: DataSeries): void {
    const from = parent.minIndex ?? 0;
    const to = parent.maxIndex ?? Math.max(0, parent.data?.clusterData.length ?? 0);

    const size = Math.max(2, s.pointSize ?? 4);

    ctx.save();
    ctx.fillStyle = s.color ?? this.palette.accent;

    for (let i = from; i <= to; i++) {
      const v = s.values[i];
      if (!isFinite(v)) continue;

      const p = mtx.applyToPoint(i + 0.5, v);
      switch (s.pointStyle) {
        case 'triangleUp': {
          const h = size * 1.2;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y - h / 2);
          ctx.lineTo(p.x - size / 1.2, p.y + h / 2);
          ctx.lineTo(p.x + size / 1.2, p.y + h / 2);
          ctx.closePath();
          ctx.fill();
          break;
        }
        case 'triangleDown': {
          const h = size * 1.2;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y + h / 2);
          ctx.lineTo(p.x - size / 1.2, p.y - h / 2);
          ctx.lineTo(p.x + size / 1.2, p.y - h / 2);
          ctx.closePath();
          ctx.fill();
          break;
        }
        case 'diamond': {
          const r = size / 1.4;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y - r);
          ctx.lineTo(p.x + r, p.y);
          ctx.lineTo(p.x, p.y + r);
          ctx.lineTo(p.x - r, p.y);
          ctx.closePath();
          ctx.fill();
          break;
        }
        default: {
          ctx.beginPath();
          ctx.arc(p.x, p.y, size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    ctx.restore();
  }

  private drawHistogram(
    ctx: CanvasRenderingContext2D,
    parent: FootPrintComponent,
    mtx: Matrix,
    view: Rectangle,
    s: DataSeries,
    range: { min: number; max: number }
  ): void {
    const from = parent.minIndex ?? 0;
    const to = parent.maxIndex ?? Math.max(0, parent.data?.clusterData.length ?? 0);

    const baseline =
      (s.histogramBaseline ?? 'bottom') === 'zero'
        ? 0
        : range.min;

    const widthRatio = Math.max(0.05, Math.min(1, s.histogramWidthRatio ?? 1));

    ctx.save();
    ctx.fillStyle = s.color ?? this.palette.accentSoft;
    ctx.strokeStyle = this.palette.gridFaint;

    for (let i = from; i <= to; i++) {
      const v = s.values[i];
      if (!isFinite(v)) continue;

      const p0 = mtx.applyToPoint(i, baseline);
      const p1 = mtx.applyToPoint(i + 1, baseline);
      const barLeft = Math.min(p0.x, p1.x);
      const barRight = Math.max(p0.x, p1.x);
      const barW = barRight - barLeft;
      if (barW <= 0.25) continue;

      const w = barW * widthRatio;
      const x = barLeft + (barW - w) / 2;

      const y0 = mtx.applyToPoint(i, baseline).y;
      const y1 = mtx.applyToPoint(i, v).y;
      const top = Math.min(y0, y1);
      const h = Math.abs(y1 - y0);
      if (h < 0.5) continue;

      if (top > view.y + view.h || top + h < view.y) continue;

      ctx.myFillRect({ x, y: top, w, h } as Rectangle);
    }

    ctx.restore();
  }

  private drawHistogramStacked(
    ctx: CanvasRenderingContext2D,
    parent: FootPrintComponent,
    mtx: Matrix,
    view: Rectangle,
    s: DataSeries,
    range: { min: number; max: number },
    stackBase: Float64Array
  ): void {
    const from = parent.minIndex ?? 0;
    const to = parent.maxIndex ?? Math.max(0, parent.data?.clusterData.length ?? 0);

    const widthRatio = Math.max(0.05, Math.min(1, s.histogramWidthRatio ?? 1));
    const baselineMode = s.histogramBaseline ?? 'bottom';
    const baseOffset = baselineMode === 'zero' ? 0 : range.min;

    ctx.save();
    ctx.fillStyle = s.color ?? this.palette.accentSoft;
    ctx.strokeStyle = this.palette.gridFaint;

    for (let i = from; i <= to; i++) {
      const v = s.values[i];
      if (!isFinite(v)) continue;

      const base = baseOffset + (stackBase[i] ?? 0);
      const topValue = base + v;

      const p0 = mtx.applyToPoint(i, base);
      const p1 = mtx.applyToPoint(i + 1, base);
      const barLeft = Math.min(p0.x, p1.x);
      const barRight = Math.max(p0.x, p1.x);
      const barW = barRight - barLeft;
      if (barW <= 0.25) continue;

      const w = barW * widthRatio;
      const x = barLeft + (barW - w) / 2;

      const y0 = mtx.applyToPoint(i, base).y;
      const y1 = mtx.applyToPoint(i, topValue).y;
      const top = Math.min(y0, y1);
      const h = Math.abs(y1 - y0);
      if (h < 0.5) continue;

      if (top > view.y + view.h || top + h < view.y) continue;

      ctx.myFillRect({ x, y: top, w, h } as Rectangle);
    }

    ctx.restore();
  }

  private accumulateStackBase(parent: FootPrintComponent, s: DataSeries, stackBase: Float64Array): void {
    const from = parent.minIndex ?? 0;
    const to = parent.maxIndex ?? Math.max(0, parent.data?.clusterData.length ?? 0);

    for (let i = from; i <= to; i++) {
      const v = s.values[i];
      if (!isFinite(v)) continue;
      stackBase[i] = (stackBase[i] ?? 0) + v;
    }
  }
}
