import { canvasPart } from './canvas-part';
import { Matrix, Rectangle } from '../models/matrix';
import { FootPrintComponent } from '../components/footprint/footprint.component';
import {
  ClusterOverlayItem,
  ClusterOverlaySeries,
  DataSeries,
} from '../indicators/indicator-api';

export class viewIndicatorsOverlay extends canvasPart {
  constructor(parent: FootPrintComponent, view: Rectangle, mtx: Matrix) {
    super(parent, view, mtx);
  }

  override draw(parent: FootPrintComponent, view: Rectangle, mtx: Matrix): void {
    const engine = parent.indicatorEngine;
    if (!engine) return;

    const series = engine.getChartSeries();
    const overlays = engine.getClusterOverlays?.() ?? [];
    if (!series.length && !overlays.length) return;

    const ctx = parent.ctx;
    if (!ctx) return;

    if (overlays.length) {
      this.drawClusterOverlays(ctx, parent, mtx, overlays);
    }

    for (const s of series) {
      if (s.visual === 'Line') {
        this.drawLineSeries(ctx, parent, mtx, s);
      } else if (s.visual === 'Points') {
        this.drawPointSeries(ctx, parent, mtx, s);
      }
    }
  }

  private drawClusterOverlays(
    ctx: CanvasRenderingContext2D,
    parent: FootPrintComponent,
    mtx: Matrix,
    overlays: ClusterOverlaySeries[]
  ): void {
    const data = parent.data;
    if (!data?.ableCluster?.()) return;

    const from = Math.max(0, Math.floor(parent.minIndex ?? 0) - 1);
    const to = Math.min(
      data.clusterData.length - 1,
      Math.ceil(parent.maxIndex ?? data.clusterData.length - 1) + 1
    );

    ctx.save();

    for (const overlay of overlays) {
      if (overlay.visible === false) continue;

      for (const item of overlay.items) {
        if (item.bar < from || item.bar > to) continue;

        const rect = this.clusterOverlayRect(parent, mtx, item);
        if (!rect || rect.w <= 0 || rect.h <= 0) continue;
        if (rect.x > this.view.x + this.view.w || rect.x + rect.w < this.view.x) continue;
        if (rect.y > this.view.y + this.view.h || rect.y + rect.h < this.view.y) continue;

        ctx.fillStyle = item.selectionColor ?? 'rgba(178,34,34,.35)';
        ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

        if (item.objectShape !== 'selectionOnly') {
          this.drawOverlayShape(ctx, rect, item);
        }
      }
    }

    ctx.restore();
  }

  private clusterOverlayRect(
    parent: FootPrintComponent,
    mtx: Matrix,
    item: ClusterOverlayItem
  ): Rectangle | null {
    const scale = parent.data?.priceScale;
    if (!Number.isFinite(scale) || scale <= 0) return null;

    const low = Math.min(item.priceLow, item.priceHigh);
    const high = Math.max(item.priceLow, item.priceHigh);
    const p1 = mtx.applyToPoint(item.bar, low - scale / 2);
    const p2 = mtx.applyToPoint(item.bar + 1, high + scale / 2);

    return {
      x: Math.min(p1.x, p2.x),
      y: Math.min(p1.y, p2.y),
      w: Math.abs(p2.x - p1.x),
      h: Math.abs(p2.y - p1.y),
    } as Rectangle;
  }

  private drawOverlayShape(
    ctx: CanvasRenderingContext2D,
    rect: Rectangle,
    item: ClusterOverlayItem
  ): void {
    const cx = rect.x + rect.w / 2;
    const cy = rect.y + rect.h / 2;
    const requestedSize = Math.max(2, item.objectSize ?? 16);
    const maxReasonableSize = Math.max(4, Math.max(rect.w, rect.h) * 1.8);
    const size = Math.min(requestedSize, maxReasonableSize);
    const half = size / 2;

    ctx.save();
    ctx.fillStyle = item.objectFillColor ?? 'rgba(30,144,255,.45)';
    ctx.strokeStyle = item.objectBorderColor ?? 'rgba(30,144,255,.95)';
    ctx.lineWidth = 1;

    switch (item.objectShape) {
      case 'rectangle':
        ctx.fillRect(cx - half, cy - half, size, size);
        ctx.strokeRect(cx - half, cy - half, size, size);
        break;
      case 'triangle': {
        const direction = item.value < 0 ? -1 : 1;
        ctx.beginPath();
        ctx.moveTo(cx, cy - direction * half);
        ctx.lineTo(cx - half, cy + direction * half);
        ctx.lineTo(cx + half, cy + direction * half);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      }
      case 'circle':
        ctx.beginPath();
        ctx.arc(cx, cy, half, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        break;
      case 'diamond':
      default:
        ctx.beginPath();
        ctx.moveTo(cx, cy - half);
        ctx.lineTo(cx + half, cy);
        ctx.lineTo(cx, cy + half);
        ctx.lineTo(cx - half, cy);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
    }

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
