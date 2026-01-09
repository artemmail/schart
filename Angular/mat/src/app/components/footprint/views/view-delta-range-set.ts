import { Matrix, Rectangle } from '../models/matrix';
import { ColorsService } from 'src/app/service/FootPrint/Colors/color.service';
import { FootPrintComponent } from '../components/footprint/footprint.component';
import { canvasPart } from './canvas-part';
import { DraggableEnum } from 'src/app/models/Draggable';
import { drob } from 'src/app/service/FootPrint/utils';

interface DeltaPoint {
  index: number;
  value: number; // теперь это доходность в %, а не "дельта*100"
}

type RawPoint = {
  index: number;
  p1: number;
  p2: number;
};

export class viewDeltaRangeSet extends canvasPart {
  constructor(parent: FootPrintComponent, view: Rectangle, mtx: Matrix) {
    super(parent, view, mtx, DraggableEnum.Top);
  }

  private buildDeltaSeries(): DeltaPoint[] {
  const rangeSetLines = this.parent.data?.rangeSetLines ?? [];

  const raw = rangeSetLines
    .map((line: any, idx: number) => {
      // ВАЖНО: сначала берем "Price*" (там уже SBER*100 + ...),
      // а normalized используем только как fallback.
      const p1 = Number(line?.Price1 ?? line?.Price1normalized);
      const p2 = Number(line?.Price2 ?? line?.Price2normalized);

      if (!Number.isFinite(p1) || !Number.isFinite(p2)) return null;

      return {
        index: Number.isFinite(line?.columnIndex) ? Number(line.columnIndex) : idx,
        p1,
        p2,
      };
    })
    .filter((x: any) => x !== null)
    .sort((a: any, b: any) => a.index - b.index);

  if (!raw.length) return [];

  const e1 = raw[0].p1;
  const e2 = raw[0].p2;

  let base = Math.abs(e1) + Math.abs(e2);
  if (!Number.isFinite(base) || base < 1e-12) base = 1;

  return raw.map((pt: any) => {
    const pnl = (pt.p1 - e1) + (e2 - pt.p2);
    const retPct = (pnl / base) * 100;
    return { index: pt.index, value: retPct } as DeltaPoint;
  });
}


  draw(parent: FootPrintComponent, view: Rectangle, mtx: Matrix): void {
    const ctx = this.parent.ctx;
    const series = this.buildDeltaSeries();

    if (!series.length) {
      return;
    }

    let min = Math.min(0, ...series.map((p) => p.value));
    let max = Math.max(0, ...series.map((p) => p.value));

    const padding = (max - min || 1) / 10;
    max += padding;
    min -= padding;

    ctx.restore();

    const formatPercent = (value: number) => {
      const normalized = Math.abs(value) < 1e-9 ? 0 : value;
      return `${drob(normalized, 2)}%`;
    };

    this.DrawZebra(ctx, view.x, view.y, view.w, view.h, min, max, formatPercent);
    this.drawVertical();

    ctx.save();
    ctx.beginPath();
    ctx.myRect(view);
    ctx.clip();

    const yMatrix = mtx.reassignY({ y1: min, y2: max }, { y1: view.y + view.h, y2: view.y });

    const drawLine = () => {
      ctx.beginPath();
      series.forEach((point, idx) => {
        const pos = yMatrix.applyToPoint(point.index + 0.5, point.value);
        if (idx === 0) ctx.moveTo(pos.x, pos.y);
        else ctx.lineTo(pos.x, pos.y);
      });
      ctx.stroke();
    };

    const zeroLeft = yMatrix.applyToPoint(series[0].index + 0.5, 0);
    const zeroRight = yMatrix.applyToPoint(series[series.length - 1].index + 0.5, 0);

    ctx.strokeStyle = '#ddd';
    ctx.beginPath();
    ctx.myLine(zeroLeft.x, zeroLeft.y, zeroRight.x, zeroRight.y);
    ctx.stroke();

    ctx.restore();

    ctx.save();
    ctx.strokeStyle = ColorsService.greencandle;
    ctx.beginPath();
    ctx.myRectXY({ x: view.x, y: view.y }, { x: view.x + view.w, y: zeroLeft.y });
    ctx.clip();
    drawLine();
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = ColorsService.redcandle;
    ctx.beginPath();
    ctx.myRectXY({ x: view.x, y: zeroLeft.y }, { x: view.x + view.w, y: view.y + view.h });
    ctx.clip();
    drawLine();
    ctx.restore();
  }
}
