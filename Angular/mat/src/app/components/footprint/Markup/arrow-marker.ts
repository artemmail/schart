import { Point } from '../models/matrix';
import { MarkUpManager } from './markup-manager';
import { ShapePoint } from './shape';
import { PointMarker } from './point-marker';
import { hexToRgb } from 'src/app/service/FootPrint/utils';

type ArrowDirection = 'up' | 'down';

const ARROW_WIDTH = 30;
const ARROW_HEIGHT = 60;
const HEAD_RATIO = 0.38;
const BODY_RATIO = 0.55;
const FILL_ALPHA = 0.55;

class ArrowMarkerBase extends PointMarker {
  private direction: ArrowDirection;

  constructor(manager: MarkUpManager, params: Record<string, any>, direction: ArrowDirection) {
    super(manager, params);
    this.direction = direction;
  }

  override drawShape(): void {
    if (this.pointArray.length < 1) return;
    const ctx = this.footprint.ctx;
    if (!ctx) return;

    const anchor = this.baseToScreen(this.pointArray[0]);
    const { width, height, headHeight, bodyWidth } = this.getDimensions();
    const halfW = width / 2;
    const halfH = height / 2;
    const top = anchor.y - halfH;
    const bottom = anchor.y + halfH;
    const bodyHalf = bodyWidth / 2;
    const color = typeof this.params?.color === 'string' ? this.params.color : this.getSelectionColor();

    ctx.save();
    ctx.fillStyle = this.rgba(color, FILL_ALPHA);
    ctx.beginPath();
    if (this.direction === 'up') {
      const headBottom = top + headHeight;
      ctx.moveTo(anchor.x, top);
      ctx.lineTo(anchor.x + halfW, headBottom);
      ctx.lineTo(anchor.x + bodyHalf, headBottom);
      ctx.lineTo(anchor.x + bodyHalf, bottom);
      ctx.lineTo(anchor.x - bodyHalf, bottom);
      ctx.lineTo(anchor.x - bodyHalf, headBottom);
      ctx.lineTo(anchor.x - halfW, headBottom);
    } else {
      const headTop = bottom - headHeight;
      ctx.moveTo(anchor.x, bottom);
      ctx.lineTo(anchor.x + halfW, headTop);
      ctx.lineTo(anchor.x + bodyHalf, headTop);
      ctx.lineTo(anchor.x + bodyHalf, top);
      ctx.lineTo(anchor.x - bodyHalf, top);
      ctx.lineTo(anchor.x - bodyHalf, headTop);
      ctx.lineTo(anchor.x - halfW, headTop);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  override selectedPoint(point: Point): ShapePoint | null {
    if (this.pointArray.length < 1) return null;
    const rect = this.getScreenRect();
    if (!rect) return null;
    if (
      point.x >= rect.x &&
      point.x <= rect.x + rect.w &&
      point.y >= rect.y &&
      point.y <= rect.y + rect.h
    ) {
      return { shape: this, point: null };
    }
    return null;
  }

  override drawSelection(): void {
    const rect = this.getScreenRect();
    if (!rect) return;
    const ctx = this.footprint.ctx;
    if (!ctx) return;
    ctx.save();
    ctx.strokeStyle = this.getSelectionColor();
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.myStrokeRect(rect);
    ctx.setLineDash([]);
    ctx.restore();
  }

  private getDimensions(): {
    width: number;
    height: number;
    headHeight: number;
    bodyWidth: number;
  } {
    const sscale = this.footprint.colorsService.sscale();
    const width = Math.max(6, Math.round(ARROW_WIDTH * sscale));
    const height = Math.max(10, Math.round(ARROW_HEIGHT * sscale));
    const headHeight = Math.max(6, Math.round(height * HEAD_RATIO));
    const bodyWidth = Math.max(4, Math.round(width * BODY_RATIO));
    return { width, height, headHeight, bodyWidth };
  }

  private getScreenRect(): { x: number; y: number; w: number; h: number } | null {
    if (this.pointArray.length < 1) return null;
    const anchor = this.baseToScreen(this.pointArray[0]);
    const { width, height } = this.getDimensions();
    return {
      x: anchor.x - width / 2,
      y: anchor.y - height / 2,
      w: width,
      h: height,
    };
  }

  private rgba(color: string, alpha: number): string {
    const rgb = hexToRgb(color);
    return `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
  }
}

export class ArrowUpMarker extends ArrowMarkerBase {
  constructor(manager: MarkUpManager, params: Record<string, any>) {
    super(manager, params, 'up');
    this.type = 'ArrowUp';
  }
}

export class ArrowDownMarker extends ArrowMarkerBase {
  constructor(manager: MarkUpManager, params: Record<string, any>) {
    super(manager, params, 'down');
    this.type = 'ArrowDown';
  }
}
