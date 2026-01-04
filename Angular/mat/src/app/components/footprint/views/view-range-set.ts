import { Matrix, Rectangle } from '../models/matrix';
import { canvasPart } from './canvas-part';
import { FootPrintComponent } from '../components/footprint/footprint.component';
import { RangeSetPoint } from '../models/cluster-data';

const SERIES_COLORS = {
  price1: '#f2d53c',
  price2: '#2b6cb0',
};

export class viewRangeSet extends canvasPart {
  constructor(parent: FootPrintComponent, view: Rectangle, mtx: Matrix) {
    super(parent, view, mtx);
  }

  draw(parent: FootPrintComponent, view: Rectangle, mtx: Matrix): void {
    const rangeSetLines = parent.data?.rangeSetLines;
    if (!rangeSetLines?.points.length) {
      return;
    }

    const hasRawPrices = rangeSetLines.points.some(
      (point) => Number.isFinite(point.price1) || Number.isFinite(point.price2)
    );

    if (hasRawPrices) {
      this.drawSeries(rangeSetLines.points, mtx, (p) => p.price1, SERIES_COLORS.price1);
      this.drawSeries(rangeSetLines.points, mtx, (p) => p.price2, SERIES_COLORS.price2);
      return;
    }

    const { min, max } = parent.data.getRangeSetBounds();
    const percentMatrix = mtx.reassignY(
      { y1: min, y2: max },
      { y1: view.y + view.h, y2: view.y }
    );

    this.drawZeroLine(percentMatrix, view);
    this.drawSeries(rangeSetLines.points, percentMatrix, (p) => p.price1Percent, SERIES_COLORS.price1);
    this.drawSeries(rangeSetLines.points, percentMatrix, (p) => p.price2Percent, SERIES_COLORS.price2);
  }

  private drawZeroLine(mtx: Matrix, view: Rectangle) {
    const ctx = this.parent.ctx;
    const zero = mtx.applyToPoint(0, 0);

    ctx.save();
    ctx.strokeStyle = '#bcbcbc';
    ctx.beginPath();
    ctx.myLine(view.x, zero.y, view.x + view.w, zero.y);
    ctx.stroke();
    ctx.restore();
  }

  private drawSeries(
    points: RangeSetPoint[],
    mtx: Matrix,
    selector: (point: RangeSetPoint) => number | undefined,
    color: string
  ) {
    const ctx = this.parent.ctx;
    const ordered = [...points]
      .map((point) => ({ point, value: selector(point) }))
      .filter((item) => Number.isFinite(item.value))
      .sort((a, b) => a.point.columnIndex - b.point.columnIndex);

    if (!ordered.length) {
      return;
    }

    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();

    ordered.forEach(({ point, value }, index) => {
      const position = mtx.applyToPoint(point.columnIndex + 0.5, value as number);
      if (index === 0) {
        ctx.moveTo(position.x, position.y);
      } else {
        ctx.lineTo(position.x, position.y);
      }
    });

    ctx.stroke();

    ordered.forEach(({ point, value }) => {
      const position = mtx.applyToPoint(point.columnIndex + 0.5, value as number);
      ctx.beginPath();
      ctx.arc(position.x, position.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  }
}
