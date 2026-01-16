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

    for (const s of series) {
      if (s.visual === 'Histogram') {
        this.drawHistogram(ctx, parent, panelMtx, view, s, range);
      } else if (s.visual === 'Line') {
        this.drawLine(ctx, parent, panelMtx, s);
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

    for (const s of series) {
      for (let i = from; i <= to; i++) {
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
    ctx.strokeStyle = s.color ?? '#2c3e50';
    ctx.lineWidth = Math.max(1, s.width ?? 1);
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
    ctx.fillStyle = s.color ?? '#3498db';
    ctx.strokeStyle = 'rgba(0,0,0,0.04)';

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
}
