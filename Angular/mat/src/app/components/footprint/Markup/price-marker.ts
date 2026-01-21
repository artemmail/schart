import { drob } from 'src/app/service/FootPrint/utils';
import { Point } from '../models/matrix';
import { MarkUpManager } from './markup-manager';
import { ShapePoint } from './shape';
import { PointMarker } from './point-marker';

type PriceMarkerSide = 'left' | 'right';

type PriceLabelLayout = {
  rect: { x: number; y: number; w: number; h: number };
  hitRect: { x: number; y: number; w: number; h: number };
  text: string;
  fontSize: number;
  textX: number;
  textY: number;
  textAlign: 'left' | 'right';
  tickX1: number;
  tickX2: number;
  tickY: number;
  tickWidth: number;
};

class PriceMarkerBase extends PointMarker {
  private side: PriceMarkerSide;

  constructor(manager: MarkUpManager, params: Record<string, any>, side: PriceMarkerSide) {
    super(manager, params);
    this.side = side;
  }

  override onStartDraw(point: Point): void {
    this.pointArray = [];
    this.pointArray.push(this.screenToBase(point));
  }

  override onMouseDownMove(point: Point): void {
    const p = this.screenToBase(point);
    if (this.pointArray.length === 0) {
      this.pointArray.push(p);
    } else {
      this.pointArray[0] = p;
    }
  }

  override onMouseUp(point: Point): void {}

  override onMovePoint(point: Point): void {
    if (!this.mouseDown || this.pointArray.length < 1) {
      this.mouseDown = point;
      return;
    }
    const delta = this.screenToBaseDelta(this.mouseDown, point);
    this.pointArray[0].x += delta.x;
    this.pointArray[0].y += delta.y;
    this.mouseDown = point;
  }

  override drawShape(): void {
    const layout = this.getLabelLayout();
    if (!layout) return;
    const ctx = this.footprint.ctx;
    if (!ctx) return;

    const color = typeof this.params?.color === 'string' ? this.params.color : this.getSelectionColor();
    ctx.save();
    ctx.font = `${layout.fontSize}px Verdana`;
    ctx.textAlign = layout.textAlign;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.fillText(layout.text, layout.textX, layout.textY);
    ctx.lineWidth = layout.tickWidth;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(layout.tickX1, layout.tickY);
    ctx.lineTo(layout.tickX2, layout.tickY);
    ctx.stroke();
    ctx.restore();
  }

  override selectedPoint(point: Point): ShapePoint | null {
    const layout = this.getLabelLayout();
    if (!layout) return null;
    const rect = layout.hitRect;
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
    const layout = this.getLabelLayout();
    if (!layout) return;
    const ctx = this.footprint.ctx;
    if (!ctx) return;
    ctx.save();
    ctx.strokeStyle = this.getSelectionColor();
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.myStrokeRect(layout.rect);
    ctx.setLineDash([]);
    ctx.restore();
  }

  private getLabelLayout(): PriceLabelLayout | null {
    if (this.pointArray.length < 1) return null;
    const ctx = this.footprint.ctx;
    if (!ctx) return null;

    const sscale = this.footprint.colorsService.sscale();
    const fontSize = Math.max(12, Math.round(20 * sscale));
    const price = this.resolvePrice();
    const text = this.formatPrice(price);

    ctx.font = `${fontSize}px Verdana`;
    const textWidth = ctx.measureText(text).width;
    const pad = Math.max(2, Math.round(3 * sscale));
    const width = Math.max(10, Math.round(textWidth + pad * 2));
    const height = Math.max(10, Math.round(fontSize + pad * 2));

    const anchor = this.baseToScreen(this.pointArray[0]);
    const tickLength = Math.max(6, Math.round(10 * sscale));
    const tickWidth = Math.max(1, Math.round(2 * sscale));
    const gap = Math.max(2, Math.round(3 * sscale));
    const offset = tickLength + gap;
    const textAlign = this.side === 'left' ? 'right' : 'left';
    const textX = anchor.x + (this.side === 'left' ? -offset : offset);
    const textY = anchor.y;
    const rectX = textAlign === 'left' ? textX - pad : textX - textWidth - pad;
    const rectY = textY - height / 2;
    const tickX1 = anchor.x;
    const tickX2 = anchor.x + (this.side === 'left' ? -tickLength : tickLength);
    const tickY = anchor.y;
    const hitPad = Math.max(2, Math.round(3 * sscale));
    const hitLeft = Math.min(rectX, rectX + width, tickX1, tickX2) - hitPad;
    const hitRight = Math.max(rectX + width, tickX1, tickX2) + hitPad;
    const hitTop = Math.min(rectY, tickY - hitPad) - hitPad;
    const hitBottom = Math.max(rectY + height, tickY + hitPad) + hitPad;

    return {
      rect: { x: rectX, y: rectY, w: width, h: height },
      hitRect: { x: hitLeft, y: hitTop, w: hitRight - hitLeft, h: hitBottom - hitTop },
      text,
      fontSize,
      textX,
      textY,
      textAlign,
      tickX1,
      tickX2,
      tickY,
      tickWidth,
    };
  }

  private resolvePrice(): number {
    if (this.pointArray.length < 1) return 0;
    return this.pointArray[0].y;
  }

  private formatPrice(value: number): string {
    if (!isFinite(value)) return '0';
    return drob(value, 4).toString();
  }

}

export class PriceLeftMarker extends PriceMarkerBase {
  constructor(manager: MarkUpManager, params: Record<string, any>) {
    super(manager, params, 'left');
    this.type = 'PriceLeft';
  }
}

export class PriceRightMarker extends PriceMarkerBase {
  constructor(manager: MarkUpManager, params: Record<string, any>) {
    super(manager, params, 'right');
    this.type = 'PriceRight';
  }
}
