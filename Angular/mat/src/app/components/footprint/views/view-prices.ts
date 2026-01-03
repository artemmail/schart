import { canvasPart } from './canvas-part';
import { Matrix, Point, Rectangle } from './../matrix';
import { ColorsService } from 'src/app/service/FootPrint/Colors/color.service';
import { DraggableEnum } from 'src/app/models/Draggable';
import { FootPrintComponent } from '../footprint.component';
import { drob } from 'src/app/service/FootPrint/utils';
import { MyMouseEvent } from 'src/app/models/MyMouseEvent';

export class viewPrices extends canvasPart {
  constructor(parent: FootPrintComponent, view: Rectangle, mtx: Matrix) {
    super(parent, view, mtx, DraggableEnum.No);
  }

  // ───────── helpers ─────────
  private loop(from: number, to: number, step: number, fn: (v: number) => void) {
    if (step <= 0) return;
    for (let v = from; v <= to; v += step) fn(v);
  }
  private getPrice(e: Point): number {
    const p = this.mtx.inverse().applyToPoint(e.x, e.y).y;
    return drob(
      Math.round(p / this.parent.data.priceScale) * this.parent.data.priceScale,
      4
    );
  }

  // ───────── mouse events ─────────
  onTap(e: Point) {
    if (this.parent.FPsettings.DeltaGraph) return;        // в дельте клики по цене не нужны
    const price = this.getPrice(e);
    this.parent.levelMarksService.togglePrice(price);
    this.parent.drawClusterView();
  }
  onRightClick(e: Point) {
    if (this.parent.FPsettings.DeltaGraph) return;
    const price = this.getPrice(e);
    const level = this.parent.levelMarksService.getPriceMark(price);
    if (level)
      this.parent.dialogService.openLevelSettings(level).subscribe();
  }
  onMouseMove(_: Point) {
    if (this.parent.canvas) this.parent.canvas.style.cursor = 'pointer';
  }

  // ───────── DRAW ─────────
  draw(parent: FootPrintComponent, view: Rectangle, mtx: Matrix): void {
    const ctx    = parent.ctx;
    const FP     = parent.FPsettings;
    const sscale = this.colorsService.sscale();
    ctx.strokeStyle = ColorsService.lineColor;
    ctx.textBaseline = 'middle';

    // ===== режим DeltaGraph =====
    if (FP.DeltaGraph) {
      // 1. диапазон дельты
      let min = parent.data.minCumDelta,
          max = parent.data.maxCumDelta;
      if (FP.ShrinkY) {
        min = parent.data.local.minCumDelta;
        max = parent.data.local.maxCumDelta;
      }
      const pad = (max - min) / 10;
      min -= pad; max += pad;

      // 2. «красивый» шаг
      const raw   = (max - min) / 12;
      const pow10 = Math.pow(10, Math.floor(Math.log10(raw)));
      const step  = Math.ceil(raw / pow10) * pow10;

      // 3. отрисовка шкалы
      ctx.font = `${Math.round(12 * sscale)}px Verdana`;
      ctx.fillStyle = '#333';
      ctx.beginPath();

      this.loop(min, max, step, (val) => {
        // ручное преобразование delta→Y
        const y = view.y + view.h - ((val - min) / (max - min)) * view.h;
        ctx.myLine(view.x, y, view.x + 5, y);
        ctx.fillText(drob(val, 0).toString(), view.x + 8, y);
      });
      ctx.stroke();
      ctx.myStrokeRect(view);      // рамка шкалы

      // 4. текущая кумулятивная дельта (как в основном графике)
      if (parent.isPriceVisible()) {
        let lastDelta: number | undefined;
        if (
          parent.maxIndex !== undefined &&
          parent.data.clusterData &&
          parent.data.clusterData.length > parent.maxIndex
        ) {
          lastDelta = parent.data.clusterData[parent.maxIndex].cumDelta;
        } else if (parent.data.clusterData && parent.data.clusterData.length) {
          lastDelta = parent.data.clusterData[parent.data.clusterData.length - 1].cumDelta;
        }

        if (lastDelta !== undefined && !isNaN(lastDelta)) {
          const y = view.y + view.h - ((lastDelta - min) / (max - min)) * view.h;

          // линия
          ctx.strokeStyle = ColorsService.lineColor;
          ctx.beginPath();
          ctx.myLine(view.x, y, view.x + view.w, y);
          ctx.stroke();

          // метка-рамка как в основном режимe
          const txt = drob(lastDelta, 0).toString();
          const lpRect = {
            x: view.x + 5 * sscale,
            y: y - 9 * sscale,
            w: (3 + txt.toString().length * 8) * sscale,
            h: 18 * sscale,
          } as Rectangle;

          ctx.fillStyle = '#000';
          ctx.myFillRect(lpRect);
          ctx.myStrokeRect(lpRect);
          ctx.fillStyle = '#eee';
          ctx.fillText(txt, view.x + 8, y);
        }
      }

      return; // дельта отрисована, прекращаем
    }

    // ===== обычная ценовая шкала =====
    const { startPrice, finishPrice, step, fontSize, skip } =
          this.calculatePriceRange(view, mtx);

    ctx.font = `${fontSize}px Verdana`;
    ctx.fillStyle = '#333';
    ctx.beginPath();

    this.loop(startPrice, finishPrice, step, (price) => {
      const pos = mtx.price2Height(price, 0);
      ctx.myLine(pos.x, pos.y, pos.x + 5, pos.y);
      const idx = Math.round((price - startPrice) / step);
      if (idx % skip === 0) ctx.fillText(drob(price, 4).toString(), pos.x + 8, pos.y);
    });
    ctx.stroke();

    // стакан и подсветки
    if (parent.isPriceVisible()) {
      this.drawLadder(parent, view, mtx);
      this.drawSelectedPriceLine(ctx, mtx, parent.data.lastPrice);
    }

    // всплывающая подсказка
    if (FP.ToolTip && !parent.hiddenHint) {
      const sel  = parent.selectedPrice1;
      const pos  = mtx.price2Height(sel, 0);
      const pp   = drob(sel, 4).toString();
      const lpRect = {
        x: pos.x + 5 * sscale,
        y: pos.y - 9 * sscale,
        w: (3 + pp.toString().length * 8) * sscale,
        h: 18 * sscale,
      } as Rectangle;
      ctx.beginPath();
      ctx.myLine(pos.x, pos.y, pos.x + 10, pos.y); ctx.stroke();
      ctx.fillStyle = '#000'; ctx.myFillRect(lpRect); ctx.myStrokeRect(lpRect);
      ctx.fillStyle = '#eee';
      ctx.font = `${Math.round(12 * sscale)}px Verdana`;
      ctx.fillText(pp, pos.x + 8, pos.y);
    }
  }

  // ───────── ladder (не нужен при DeltaGraph) ─────────
  drawLadder(parent: FootPrintComponent, view: Rectangle, mtx: Matrix) {
    if (parent.FPsettings.DeltaGraph || (parent as any).minimode) return;
    const ctx = parent.ctx;
    const ladder = parent.data.ladder;
    if (!ladder) return;
    let maxV = 0; for (const p in ladder) maxV = Math.max(maxV, Math.abs(ladder[p]));

    for (const p in ladder) {
      const price = parseFloat(p);
      const vol   = ladder[p];
      const r     = parent.clusterRect(price, 0, mtx);
      const bar   = {
        x: view.x + view.w - 1,
        w: -40 * Math.abs(vol / maxV),
        y: r.y, h: r.h,
      } as Rectangle;
      ctx.fillStyle   = vol > 0 ? 'rgba(4,163,68,.5)' : 'rgba(214,24,0,.5)';
      ctx.strokeStyle = vol > 0 ? 'rgba(4,163,68,.3)' : 'rgba(214,24,0,.3)';
      ctx.myFillRect(bar); ctx.myStrokeRect(bar);
    }
  }

  // ───────── wheel zoom ─────────
  onMouseWheel(ev: MyMouseEvent, wheelDistance: number) {
    const scale = Math.pow(1.05, wheelDistance);
    const [x, y] = [ev.position.x, ev.position.y];
    const m = Matrix.fromTriangles(
      [x + 1, y, x - 2, y + 1, x, y + 2],
      [x + 1, y, x - 2, y + scale, x, y + 2 * scale]
    );
    this.parent.viewsManager.mtx =
      this.parent.alignMatrix(m.multiply(this.parent.viewsManager.mtx));
    this.parent.drawClusterView();
  }
}

