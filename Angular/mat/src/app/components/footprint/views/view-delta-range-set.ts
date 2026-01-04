import { Matrix, Rectangle } from '../models/matrix';
import { ColorsService } from 'src/app/service/FootPrint/Colors/color.service';
import { FootPrintComponent } from '../components/footprint/footprint.component';
import { canvasPart } from './canvas-part';
import { DraggableEnum } from 'src/app/models/Draggable';

interface DeltaPoint {
  index: number;
  value: number;
}

export class viewDeltaRangeSet extends canvasPart {
  constructor(parent: FootPrintComponent, view: Rectangle, mtx: Matrix) {
    super(parent, view, mtx, DraggableEnum.Top);
  }

  private buildDeltaSeries(): DeltaPoint[] {
    const rangeSetLines = this.parent.data?.rangeSetLines ?? [];

    return rangeSetLines
      .map((line: any, idx: number) => {
        const price1 = Number(line?.Price1normalized ?? line?.Price1);
        const price2 = Number(line?.Price2normalized ?? line?.Price2);

        if (!Number.isFinite(price1) || !Number.isFinite(price2)) {
          return null;
        }

        const delta = (price1 - price2) * 100;
        return { index: line?.columnIndex ?? idx, value: delta } as DeltaPoint;
      })
      .filter((point: DeltaPoint | null): point is DeltaPoint => point !== null)
      .sort((a, b) => a.index - b.index);
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
    this.DrawZebra(ctx, view.x, view.y, view.w, view.h, min, max);
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
        if (idx === 0) {
          ctx.moveTo(pos.x, pos.y);
        } else {
          ctx.lineTo(pos.x, pos.y);
        }
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
