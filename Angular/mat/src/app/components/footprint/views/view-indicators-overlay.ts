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
      if (s.visual === 'Line') {
        this.drawLineSeries(ctx, parent, mtx, s);
      } else if (s.visual === 'Points') {
        this.drawPointSeries(ctx, parent, mtx, s);
      }
    }
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

  private drawLineSeries(
    ctx: CanvasRenderingContext2D,
    parent: FootPrintComponent,
    mtx: Matrix,
    s: DataSeries
  ): void {
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

  private drawPointSeries(
    ctx: CanvasRenderingContext2D,
    parent: FootPrintComponent,
    mtx: Matrix,
    s: DataSeries
  ): void {
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
}
