import { drob } from 'src/app/service/FootPrint/utils';
import { Point } from '../models/matrix';
import { MarkUpManager } from './markup-manager';
import { Line } from './line';

export class Ruler extends Line {
  constructor(manager: MarkUpManager, params: Record<string, any>) {
    super(manager, params);
    this.type = 'Ruler';
  }

  override onMouseUp(point: Point): void {
    const dockable = this.params?.dockable !== false;
    if (dockable && this.pointArray.length >= 2) {
      this.snapToGrid();
    }
  }

  override drawShape(): void {
    if (this.pointArray.length < 2) return;
    super.drawShape();

    const ctx = this.footprint.ctx;
    const view = this.footprint.viewsManager.viewMain?.view;
    if (!ctx || !view) return;

    const label = this.buildLabel();
    if (!label) return;

    const sscale = this.footprint.colorsService.sscale();
    const fontSize = Math.round(Math.max(9 * sscale, Math.min(12 * sscale, view.h * 0.1)));
    ctx.font = `${fontSize}px Verdana`;

    const s0 = this.baseToScreen(this.pointArray[0]);
    const s1 = this.baseToScreen(this.pointArray[1]);
    const mid = { x: (s0.x + s1.x) / 2, y: (s0.y + s1.y) / 2 };
    const pad = Math.max(3, Math.round(4 * sscale));
    const textWidth = ctx.measureText(label).width;
    const rect = {
      x: mid.x - textWidth / 2 - pad,
      y: mid.y - fontSize / 2 - pad,
      w: textWidth + pad * 2,
      h: fontSize + pad * 2,
    };

    rect.x = Math.min(Math.max(rect.x, view.x), view.x + view.w - rect.w);
    rect.y = Math.min(Math.max(rect.y, view.y), view.y + view.h - rect.h);

    const palette = this.footprint.palette;
    ctx.save();
    ctx.fillStyle = palette.labelBg;
    ctx.strokeStyle = palette.axis;
    ctx.lineWidth = 1;
    ctx.myFillRect(rect);
    ctx.myStrokeRect(rect);
    ctx.fillStyle = palette.labelText;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2);
    ctx.restore();
  }

  private buildLabel(): string {
    if (this.pointArray.length < 2) return '';
    const start = this.pointArray[0];
    const end = this.pointArray[1];
    const delta = end.y - start.y;
    const pct = start.y !== 0 ? (delta / start.y) * 100 : 0;
    const barDelta = Math.abs(Math.round(end.x) - Math.round(start.x));
    const parts = [
      `Delta: ${this.formatSigned(delta, 4)}`,
      `(${this.formatSigned(pct, 2)}%)`,
      `Bars: ${barDelta}`,
    ];

    const time = this.formatTimeDelta();
    if (time) parts.push(`Time: ${time}`);

    return parts.join(' ');
  }

  private formatTimeDelta(): string {
    const data = this.footprint.data;
    if (!data || !data.clusterData?.length) return '';
    const maxIndex = data.clusterData.length - 1;
    const i0 = Math.max(0, Math.min(maxIndex, Math.round(this.pointArray[0].x)));
    const i1 = Math.max(0, Math.min(maxIndex, Math.round(this.pointArray[1].x)));
    const d0 = data.clusterData[i0]?.x;
    const d1 = data.clusterData[i1]?.x;
    if (!(d0 instanceof Date) || !(d1 instanceof Date)) return '';
    const diff = Math.abs(d1.getTime() - d0.getTime());
    return this.formatDuration(diff);
  }

  private formatDuration(ms: number): string {
    const minute = 60000;
    const hour = 3600000;
    const day = 86400000;
    if (!isFinite(ms) || ms <= 0) return '';
    const parts: string[] = [];
    const days = Math.floor(ms / day);
    const hours = Math.floor((ms % day) / hour);
    const minutes = Math.floor((ms % hour) / minute);

    if (days) parts.push(`${days}d`);
    if (hours) parts.push(`${hours}h`);
    if (minutes || parts.length === 0) parts.push(`${minutes}m`);

    return parts.slice(0, 2).join(' ');
  }

  private formatSigned(value: number, digits: number): string {
    if (!isFinite(value) || value === 0) return '0';
    const sign = value > 0 ? '+' : '-';
    return `${sign}${drob(Math.abs(value), digits)}`;
  }

  private snapToGrid(): void {
    const data = this.footprint.data;
    if (!data) return;
    const ps = data.priceScale || 1;
    const maxIndex = Math.max(0, data.clusterData.length - 1);
    for (const pt of this.pointArray) {
      const x = Math.round(pt.x);
      pt.x = Math.max(0, Math.min(maxIndex, x));
      pt.y = Math.round(pt.y / ps) * ps;
    }
  }
}
