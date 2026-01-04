import { canvasPart } from './canvas-part';
import { Matrix, Rectangle } from '../models/matrix';
import { ColorsService } from 'src/app/service/FootPrint/Colors/color.service';
import { DraggableEnum } from 'src/app/models/Draggable';
import { FootPrintComponent } from '../components/footprint/footprint.component';
import { drob } from 'src/app/service/FootPrint/utils';
import { CandlesRangeSetValue } from 'src/app/models/candles-range-set';
import { rounder } from 'src/app/service/FootPrint/Formating/formatting.service';

export class viewPricesRangeSet extends canvasPart {
  constructor(parent: FootPrintComponent, view: Rectangle, mtx: Matrix) {
    super(parent, view, mtx, DraggableEnum.No);
  }

  private findLastVisibleInfo(
    lines: CandlesRangeSetValue[],
    normalizedSelector: (line: CandlesRangeSetValue) => number,
    rawSelector: (line: CandlesRangeSetValue) => number
  ): { normalized: number; raw: number } | null {
    const minIndex = this.parent.minIndex ?? 0;
    const maxIndex = this.parent.maxIndex ?? 0;
    for (let i = lines.length - 1; i >= 0; i--) {
      const columnIndex = lines[i].columnIndex ?? i;
      if (columnIndex < minIndex || columnIndex > maxIndex) continue;
      const normalized = normalizedSelector(lines[i]);
      const raw = rawSelector(lines[i]);
      if (Number.isFinite(normalized) && Number.isFinite(raw)) {
        return { normalized, raw };
      }
    }
    return null;
  }

  private calculateDynamicPriceRange(
    view: Rectangle,
    mtx: Matrix
  ): { startPrice: number; finishPrice: number; step: number } {
    let finishPrice = mtx.Height2Price(view.y - 100);
    let startPrice = mtx.Height2Price(view.y + view.h + 100);

    const step = rounder((18 * (finishPrice - startPrice)) / view.h);
    finishPrice = Math.floor(finishPrice / step) * step;
    startPrice = Math.floor(startPrice / step) * step;

    return { startPrice, finishPrice, step };
  }

  private buildScale(view: Rectangle, mtx: Matrix) {
    const { startPrice, finishPrice, step } = this.calculateDynamicPriceRange(view, mtx);

    const sscale = this.colorsService.sscale();
    const bar = this.parent.getBar(mtx);
    bar.w = 80 * sscale;
    bar.h = Math.abs(bar.h);

    let fontSize = this.parent.clusterRectFontSize(bar, 6);
    fontSize = Math.max(fontSize, 9 * sscale);

    const pixelStart = mtx.price2Height(startPrice, 0).y;
    const pixelEnd = mtx.price2Height(startPrice + step, 0).y;
    const pixelStep = Math.abs(pixelEnd - pixelStart);
    const fontPixelHeight = fontSize * 1.2;
    const skip = Math.max(1, Math.ceil(fontPixelHeight / Math.max(pixelStep, 1)));

    return { startPrice, finishPrice, step, fontSize, skip };
  }

  private formatPercent(value: number): string {
    const percent = (value - 1) * 100;
    const normalized = Math.abs(percent) < 1e-9 ? 0 : percent;
    return `${drob(normalized, 2)}%`;
  }

  private drawFinalValue(ctx: any, view: Rectangle, mtx: Matrix, value: number, raw: number) {
    const sscale = this.colorsService.sscale();
    const pos = mtx.price2Height(value, 0);
    const text = drob(raw, 4).toString();
    const rect = {
      x: view.x + 5 * sscale,
      y: pos.y - 9 * sscale,
      w: (3 + text.length * 8) * sscale,
      h: 18 * sscale,
    } as Rectangle;

    ctx.strokeStyle = ColorsService.lineColor;
    ctx.beginPath();
    ctx.myLine(pos.x, pos.y, pos.x + 10, pos.y);
    ctx.stroke();

    ctx.fillStyle = 'Linen';
    ctx.myFillRect(rect);
    ctx.myStrokeRect(rect);
    ctx.fillStyle = '#333';
    ctx.font = `${Math.round(12 * sscale)}px Verdana`;
    ctx.fillText(text, rect.x + 3 * sscale, pos.y);
  }

  draw(parent: FootPrintComponent, view: Rectangle, mtx: Matrix): void {
    const ctx = parent.ctx;
    const lines = parent.data?.rangeSetLines ?? [];
    if (!lines.length) return;

    const hasNormalized = lines.some(
      (line) => Number.isFinite(line.Price1normalized) || Number.isFinite(line.Price2normalized)
    );
    if (!hasNormalized) return;

    const scale = this.buildScale(view, mtx);
    if (!scale) return;

    const { startPrice, finishPrice, step, fontSize, skip } = scale;
    const start = Math.floor(startPrice / step) * step;
    const end = Math.ceil(finishPrice / step) * step;

    ctx.strokeStyle = ColorsService.lineColor;
    ctx.textBaseline = 'middle';
    ctx.font = `${fontSize}px Verdana`;
    ctx.fillStyle = '#333';
    ctx.beginPath();

    let idx = 0;
    for (let val = start; val <= end + step / 2; val += step) {
      const pos = mtx.price2Height(val, 0);
      ctx.myLine(pos.x, pos.y, pos.x + 5, pos.y);
      if (idx % skip === 0) ctx.fillText(this.formatPercent(val), pos.x + 8, pos.y);
      idx++;
    }
    ctx.stroke();

    const last1 = this.findLastVisibleInfo(
      lines,
      (line) => line.Price1normalized,
      (line) => line.Price1
    );
    const last2 = this.findLastVisibleInfo(
      lines,
      (line) => line.Price2normalized,
      (line) => line.Price2
    );

    if (last1 != null) this.drawFinalValue(ctx, view, mtx, last1.normalized, last1.raw);
    if (last2 != null) this.drawFinalValue(ctx, view, mtx, last2.normalized, last2.raw);
  }
}
