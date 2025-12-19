import { canvasPart } from './canvasPart';
import { Matrix, Rectangle} from './../matrix';
import { ColorsService } from 'src/app/service/FootPrint/Colors/color.service';
import { DraggableEnum } from 'src/app/models/Draggable';
import { ChartSettings } from 'src/app/models/ChartSettings';
import { FootPrintComponent } from '../footprint.component';

export class viewScrollBars extends canvasPart {
  constructor(parent: FootPrintComponent,  view: Rectangle, mtx: Matrix) {
    super(parent,  view, mtx, DraggableEnum.No);
  }

  override draw(
    parent: FootPrintComponent,
    
    view: Rectangle,
    mtx: Matrix
  ): void {
    var FPsettings: ChartSettings = this.parent.FPsettings; let ctx = this.parent.ctx;
    if (!this.parent.IsStartVisible()) {
      var grd = ctx.createLinearGradient(
        view.x - ColorsService.GradientWidth,
        0,
        view.x + ColorsService.GradientWidth,
        0
      );
      grd.addColorStop(0, ColorsService.WhiteGradient);
      grd.addColorStop(1, 'transparent');
      this.ctx.fillStyle = grd;
      this.ctx.fillRect(
        view.x,
        view.y,
        ColorsService.GradientWidth * 2,
        view.h
      );
    }
    if (!this.parent.IsPriceVisible()) {
      var grd2 = ctx.createLinearGradient(
        view.x + view.w - ColorsService.GradientWidth,
        0,
        view.x + view.w + ColorsService.GradientWidth,
        0
      );
      grd2.addColorStop(1, ColorsService.WhiteGradient);
      grd2.addColorStop(0, 'transparent');
      this.ctx.fillStyle = grd2;
      this.ctx.fillRect(
        view.x + view.w - ColorsService.GradientWidth,
        view.y,
        ColorsService.GradientWidth,
        view.h
      );
    }
    if (this.parent.translateMatrix != null) {
      ctx.fillStyle = ColorsService.Gray4;
      var p1 = this.parent.viewsManager.mtxMain.inverse().applyToPoint(view.x, view.y);
      var p2 = this.parent.viewsManager.mtxMain
        .inverse()
        .applyToPoint(view.x + view.w, view.h + view.y);
      var m1 = new Matrix()
        .reassignX(
          { x1: 0, x2: this.parent.data.clusterData.length },
          { x1: view.x, x2: view.x + view.w }
        )
        .reassignY({ y1: 0, y2: view.h }, { y1: view.y, y2: view.y + view.h });
      var m2 = new Matrix()
        .reassignY(
          { y1: this.parent.data.maxPrice, y2: this.parent.data.minPrice },
          { y1: view.y, y2: view.y + view.h }
        )
        .reassignX({ x1: 0, x2: view.w }, { x1: view.x, x2: view.x + view.w });
      var v1 = m1.applyToPoint(p1.x, 2);
      var v2 = m1.applyToPoint(p2.x, 4);
      if (v2.x - v1.x < view.w) ctx.myFillRectXY(v1, v2);
      var h1 = m2.applyToPoint(2, p1.y);
      var h2 = m2.applyToPoint(4, p2.y);
      if (h2.y - h1.y < view.h) ctx.myFillRectXY(h1, h2);
    }
    if (this.parent.markupEnabled) this.parent.markupManager.drawAll();

    ctx.strokeStyle = ColorsService.lineColor;
    ctx.myStrokeRect(this.view);
  }
}
