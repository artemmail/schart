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

  override draw(parent: FootPrintComponent, view: Rectangle, mtx: Matrix): void {
    const engine = parent.indicatorEngine;
    if (!engine) return;

    const series = engine.getPanelSeries(this.panelId);
    if (!series.length) return;

    const ctx = parent.ctx;
    if (!ctx) return;

    const range = this.computeMinMax(parent, series);
    if (!range) return;

    // draw zebra background + scale like built-in footprint panels
    ctx.restore();
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
  }

  private computeMinMax(parent: FootPrintComponent, series: DataSeries[]): { min: number; max: number } | null {
    const from = parent.minIndex ?? 0;
    const to = parent.maxIndex ?? Math.max(0, parent.data?.clusterData.length ?? 0);

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
