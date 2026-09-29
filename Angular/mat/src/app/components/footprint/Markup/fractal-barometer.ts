import { ColumnEx } from 'src/app/models/Column';
import { Point } from '../models/matrix';
import { MarkUpManager } from './markup-manager';
import { Profile } from './profile';
import { ShapePoint } from './shape';

// The server's BarometerCalculator compares final(i - 1) with final(i).
// Its longest F(16) term reads back 32 bars, so 34 bars are required.
export const BAROMETER_MIN_BARS = 34;

export function fractalBarometerRecommendation(bars: Pick<ColumnEx, 'c' | 'h' | 'l'>[]): number {
  if (bars.length < BAROMETER_MIN_BARS) return 0;
  const range = (size: number, i: number): { high: number; low: number } => {
    let high = bars[i].h;
    let low = bars[i].l;
    for (let j = 0; j < size; j++) {
      high = Math.max(high, bars[i - j].h);
      low = Math.min(low, bars[i - j].l);
    }
    return { high, low };
  };
  const a = (size: number, i: number): number => {
    const { high, low } = range(size, i);
    const close = bars[i - size].c;
    return Math.max(high, close) - Math.min(low, close);
  };
  const f = (size: number, i: number): number => {
    const { high, low } = range(size, i);
    const close = bars[i].c;
    // Keep the server's D expression and operation order exactly as written.
    const d = close - 0.5 * (high + low) / (high - low);
    const down = (close - low) / (high - low);
    const mu = (Math.log(a(size / 2, i) + a(size / 2, i - size / 2)) - Math.log(a(size, i))) /
      (Math.log(size) - Math.log(size / 2));
    const buser = d > 0 ? (mu < 0.5 ? 1 - mu : mu) : (mu < 0.5 ? mu : 1 - mu);
    return (buser * down - (1 - buser) * (1 - down)) * (a(size, i) / a(size, i - size));
  };
  const final = (i: number): number => f(2, i) + 1.41 * f(4, i) + 2 * f(8, i) + 2.8 * f(16, i);
  const previous = final(bars.length - 2);
  const current = final(bars.length - 1);
  if (!Number.isFinite(previous) || !Number.isFinite(current)) return 0;
  if (previous < 0 && current > 0) return 3;
  if (previous > 0 && current > previous) return 2;
  if (current < previous && current > 0) return 1;
  if (previous > 0 && current < 0) return -3;
  if (current < previous && previous < 0) return -2;
  if (current > previous && current < 0) return -1;
  return 0;
}

export class FractalBarometer extends Profile {
  constructor(manager: MarkUpManager, params: Record<string, any>) {
    super(manager, params);
    this.type = 'FractalBarometer';
  }

  override selectedPoint(point: Point): ShapePoint | null {
    if (!this.sortPoints()) return null;
    const hit = super.selectedPoint(point);
    if (hit) return hit;
    const a = this.baseToScreen(this.vPoints[0]);
    const b = this.baseToScreen(this.vPoints[2]);
    return point.x >= a.x && point.x <= b.x && point.y >= a.y && point.y <= b.y
      ? { shape: this, point: null }
      : null;
  }

  override drawShape(): void {
    if (!this.sortPoints()) return;
    const ctx = this.footprint.ctx;
    const columns = this.footprint.data.clusterData;
    const left = Math.max(0, Math.min(columns.length, Math.floor(this.vPoints[0].x)));
    const right = Math.max(0, Math.min(columns.length, Math.ceil(this.vPoints[2].x)));
    const a = this.baseToScreen(this.vPoints[0]);
    const b = this.baseToScreen(this.vPoints[2]);
    ctx.save();
    ctx.strokeStyle = this.getSelectionColor();
    ctx.lineWidth = 1;
    ctx.myStrokeRect({ x: a.x, y: a.y, w: b.x - a.x, h: b.y - a.y });
    if (right - left < BAROMETER_MIN_BARS) {
      ctx.fillStyle = this.getSelectionColor();
      ctx.font = '12px Verdana';
      ctx.fillText(`${Math.max(0, right - left)}/${BAROMETER_MIN_BARS}`, a.x + 4, a.y + 15);
      ctx.restore();
      return;
    }

    const recommendation = fractalBarometerRecommendation(columns.slice(left, right));
    const last = columns[right - 1];
    const anchor = this.baseToScreen({ x: right - 0.5, y: last.c });
    const scale = this.footprint.colorsService.sscale();
    const size = Math.max(14, 24 * scale);
    ctx.translate(anchor.x, anchor.y);
    ctx.rotate(-recommendation * 25 * Math.PI / 180);
    ctx.fillStyle = recommendation === 0 ? '#000000' : recommendation < 0 ? '#d75442' : '#6ba583';
    // Same right-facing arrow and rotation/color mapping as ArrowDisplayComponent.
    ctx.beginPath();
    ctx.moveTo(-size / 2, -size / 8);
    ctx.lineTo(size / 8, -size / 8);
    ctx.lineTo(size / 8, -size / 3);
    ctx.lineTo(size / 2, 0);
    ctx.lineTo(size / 8, size / 3);
    ctx.lineTo(size / 8, size / 8);
    ctx.lineTo(-size / 2, size / 8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}
