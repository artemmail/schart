import { canvasPart } from './canvas-part';
import { Matrix, Rectangle } from '../models/matrix';
import { ColorsService } from 'src/app/service/FootPrint/Colors/color.service';
import { DraggableEnum } from 'src/app/models/Draggable';
import { FootPrintComponent } from '../components/footprint/footprint.component';
import { hexToRgb } from 'src/app/service/FootPrint/utils';

export class viewBackground extends canvasPart {
  constructor(parent: FootPrintComponent, view: Rectangle, mtx: Matrix) {
    super(parent, view, mtx, DraggableEnum.No);
  }

  // ───────────────────────── DRAW ─────────────────────────
  draw(parent: FootPrintComponent, view: Rectangle, mtx: Matrix): void {
    const ctx        = parent.ctx;
    const FP         = parent.FPsettings;
    const data       = parent.data.clusterData;
    const CanvasW    = parent.canvas?.width ?? 0;

    ctx.fillStyle = ColorsService.Gray2;
    ctx.myFillRect(view);
    ctx.setLineDash([5, 3, 5]);
    const prevStrokeStyle = ctx.strokeStyle;
    const prevLineWidth = ctx.lineWidth;
    ctx.strokeStyle = 'rgba(0,0,0,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();

    // ───── верт./гор.полосы ─────
    this.drawHorizontalBackground(parent, view, mtx);
    const dateDelimiterXs: number[] = [];
    let lastBarRect: Rectangle | null = null;

    for (let i = parent.minIndex; i <= parent.maxIndex; i++) {
      const barRect = parent.clusterRect(data[i].o, i, mtx);
      lastBarRect = barRect;
      ctx.myLine(barRect.x, view.y, barRect.x, view.y + view.h);


      if (
        i > 0 &&
        this.formatService.dateDelimeter(
          this.formatService.MoscowTimeShift(data[i - 1].x),
          this.formatService.MoscowTimeShift(data[i].x),
          parent.params.period
        )
      ) dateDelimiterXs.push(barRect.x);
    }

    // ───── диапазоны дат ─────
    if (lastBarRect)
      ctx.myLine(lastBarRect.x + lastBarRect.w, view.y, lastBarRect.x + lastBarRect.w, view.y + view.h);

    const dates = parent.levelMarksService.getDates();
    for (const date in dates) {
      const line = dates[date];
      const rgb  = hexToRgb(line.color);
      const grad = ctx.createLinearGradient(0, 0, 0, parent.canvas?.height ?? 0);
      grad.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},0.05)`);
      grad.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0.5)`);
      ctx.fillStyle = grad;
      const r = parent.clusterRect(100, parent.data.ColumnNumberByDate[date], mtx);
      r.y = 0; r.h = parent.canvas?.height ?? 0;
      ctx.myFillRect(r);
    }

    ctx.stroke();
    ctx.strokeStyle = prevStrokeStyle;
    ctx.lineWidth = prevLineWidth;
    ctx.beginPath();
    for (const x of dateDelimiterXs)
      ctx.myLine(x, view.y, x, view.y + view.h);
    ctx.stroke();
    ctx.restore(); ctx.save();

    // ───── клип по области кластера ─────
    ctx.beginPath();
    ctx.myRect({
      x: 0,
      w: CanvasW,
      y: parent.viewsManager.clusterView.y,
      h: parent.viewsManager.clusterView.h,
    });
    ctx.clip();

    // ───── выделение выбранной цены ─────
    if (!FP.DeltaGraph && !FP.ToolTip && parent.translateMatrix == null && parent.selectedPrice != null) {
      const rgb = hexToRgb('#80c4de');
      const grad = ctx.createLinearGradient(0, 0, CanvasW, 0);
      grad.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},0.3)`);
      grad.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0.3)`);
      ctx.fillStyle = grad;
      const pr = parent.clusterRect(Number(parent.selectedPrice), 0, mtx);
      pr.x = 0; pr.w = CanvasW;
      ctx.myFillRect(pr);
    }

    // ───── перекрестие ─────
    if (FP.ToolTip && !parent.hiddenHint && 'selectedPoint' in parent.mouseAndTouchManager) {
      const p = parent.mouseAndTouchManager.selectedPoint;
      parent.selectedPrice1 = this.mtx.inverse().applyToPoint(p.x, p.y).y;
      ctx.strokeStyle = 'rgba(200,200,200,.7)';
      ctx.myLine(view.x, p.y, view.x + view.w, p.y);
      ctx.myLine(p.x, view.y, p.x, view.y + view.h);
      ctx.stroke();
    }

    // ───── уровни цен ─────
    if (!FP.DeltaGraph) this.drawPriceLevels(parent, mtx, CanvasW);

    ctx.restore();
  }

  // ───────────────────────── Price Levels ─────────────────────────
  private drawPriceLevels(parent: FootPrintComponent, mtx: Matrix, CanvasW: number) {
    const ctx = parent.ctx;
    const prices   = parent.levelMarksService.getPrices();
    const fontSize = Math.min(this.colorsService.maxFontSize(), Math.abs(parent.getBar(mtx).h));
    ctx.font = `${fontSize}px Verdana`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    for (const k in prices) {
      const price = parseFloat(k);
      const line  = prices[k];
      const rgb   = hexToRgb(line.color);
      const grad  = ctx.createLinearGradient(0, 0, CanvasW, 0);
      grad.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},0.6)`);
      grad.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0.8)`);
      ctx.fillStyle = grad;
      const r = parent.clusterRect(price, 0, mtx);
      r.x = 0; r.w = CanvasW;
      ctx.myFillRect(r);

      if (fontSize > 7 && line.comment)
        ctx.fillText(line.comment, r.w - this.colorsService.LegendPriceWidth() - 5, r.y + r.h / 2);
    }
  }

  // ───────────────────────── Horizontal Zebra ─────────────────────────
  private drawHorizontalBackground(parent: FootPrintComponent, view: Rectangle, mtx: Matrix): void {
    const ctx = parent.ctx;

    if (!parent.FPsettings.DeltaGraph) {
      // ===== ЦЕНА =====
      const { startPrice, finishPrice, step } = this.calculatePriceRange(view, mtx);
      for (let price = finishPrice; price >= startPrice; price -= step) {
        const pos = mtx.price2Height(price, 0);
        ctx.myLine(view.x, pos.y, view.x + view.w, pos.y);
      }
    } else {
      // ===== DELTAGRAPH =====
      let min = parent.data.minCumDelta, max = parent.data.maxCumDelta;
      if (parent.FPsettings.ShrinkY) {
        min = parent.data.local.minCumDelta;
        max = parent.data.local.maxCumDelta;
      }
      const pad      = (max - min) / 10; min -= pad; max += pad;
      const rawStep  = (max - min) / 12;
      const pow10    = Math.pow(10, Math.floor(Math.log10(rawStep)));
      const step     = Math.ceil(rawStep / pow10) * pow10;

      // создаём матрицу для delta‑значений
      const mY = mtx.reassignY(
        { y1: min, y2: max },
        { y1: view.y + view.h, y2: view.y }
      );

      for (let v = min; v <= max; v += step) {
        const pos = mY.applyToPoint(0, v);
        ctx.myLine(view.x, pos.y, view.x + view.w, pos.y);
      }
    }
  }
}




