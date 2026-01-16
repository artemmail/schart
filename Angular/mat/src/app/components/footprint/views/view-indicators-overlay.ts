import { canvasPart } from './canvas-part';
import { Matrix, Rectangle } from '../models/matrix';
import { FootPrintComponent } from '../components/footprint/footprint.component';
import { DataSeries } from '../indicators/indicator-api';

export class viewIndicatorsOverlay extends canvasPart {
  constructor(parent: FootPrintComponent, view: Rectangle, mtx: Matrix) {
    super(parent, view, mtx);
  }

  override draw(parent: FootPrintComponent, view: Rectangle, mtx: Matrix): void {
    const engine = parent.indicatorEngine;
    if (!engine) return;

    const series = engine.getChartSeries();
    if (!series.length) return;

    const ctx = parent.ctx;
    if (!ctx) return;

    for (const s of series) {
      if (s.visual !== 'Line') continue;
      this.drawLineSeries(ctx, parent, mtx, s);
    }
  }

  private drawLineSeries(
    ctx: CanvasRenderingContext2D,
    parent: FootPrintComponent,
    mtx: Matrix,
    s: DataSeries
  ): void {
    const from = parent.minIndex ?? 0;
    const to = parent.maxIndex ?? Math.max(0, parent.data?.clusterData.length ?? 0);

    ctx.save();
    ctx.strokeStyle = s.color ?? '#f1c40f';
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
}

