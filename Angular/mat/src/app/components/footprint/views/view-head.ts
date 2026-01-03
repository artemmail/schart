import { canvasPart } from './canvas-part';
import { Matrix, Rectangle} from '../models/matrix';
import { ColorsService } from 'src/app/service/FootPrint/Colors/color.service';
import { DraggableEnum } from 'src/app/models/Draggable';
import { ChartSettings } from 'src/app/models/ChartSettings';
import { FootPrintComponent } from '../components/footprint/footprint.component';
import { drob } from 'src/app/service/FootPrint/utils';

export class viewHead extends canvasPart {
  fontSize: number = 0;
  constructor(parent: FootPrintComponent,  view: Rectangle, mtx: Matrix) {
    super(parent,  view, mtx, DraggableEnum.Top);
  }

  draw(parent: FootPrintComponent,  view: Rectangle, mtx: Matrix): void {
    var FPsettings: ChartSettings = this.parent.FPsettings; let ctx = this.parent.ctx;
    var r1 = mtx.applyToPoint(0, 0);
    var r2 = mtx.applyToPoint(0 + 1, 1);
    var r: Rectangle = { x: r1.x, y: r1.y, w: r2.x - r1.x, h: r2.y - r1.y };
    this.fontSize = parent.clusterRectFontSize(r, 6);
    if (this.fontSize < 8) this.drawDelta(parent, view, mtx);
    else
      for (let i = parent.minIndex; i <= parent.maxIndex; i++)
        this.drawHeadColumn(parent, view, mtx, i);
    ctx.restore();
    if (
     
      FPsettings.totalMode == 'Left' &&
      parent.data.ableCluster()
    ) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font =
        'bold ' + Math.round(11 * this.colorsService.sscale()) + 'px Verdana';
      mtx = this.mtx.reassignX({ x1: 0, x2: 1 }, { x1: 0, x2: view.x });
      var im: number = parent.topLinesCount();
      if (this.fontSize < 8) {
        var p1 = mtx.applyToPoint(0, 0);
        var p2 = mtx.applyToPoint(1, im);
        ctx.fillStyle = 'Linen'; //Color1;
        ctx.myFillRectXY(p1, p2);
        ctx.myStrokeRectXY(p1, p2);
        ctx.fillStyle = ColorsService.WhiteText;
        ctx.fillText('Накопл. Дельта', (p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
      } else {
        var labels = ['Накопл. Дельта', 'Дельта(ASK-BID)'];
        if (parent.topVolumes()) labels.push('Объем');
        if (parent.oiEnable()) labels.push('ОИ дельта/2');
        for (let i: number = 0; i < im; i++) {
          var p1 = mtx.applyToPoint(0, i);
          var p2 = mtx.applyToPoint(1, i + 1);
          ctx.fillStyle = 'Linen'; //Color1;
          ctx.myFillRectXY(p1, p2);
          ctx.myStrokeRectXY(p1, p2);
          ctx.fillStyle = ColorsService.WhiteText;
          ctx.fillText(labels[i], (p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
        }
      }
    }
  }
  drawDelta(parent: FootPrintComponent,  view: Rectangle, mtx: Matrix) {
    var d = (parent.data.maxCumDelta - parent.data.minCumDelta) / 10;
    var m = mtx.reassignY(
      { y1: parent.data.minCumDelta - d, y2: d + parent.data.maxCumDelta },
      { y1: view.h + view.y, y2: view.y }
    );
    let ctx = this.parent.ctx;
    function dr() {
      ctx.beginPath();
      for (let i = parent.minIndex; i <= parent.maxIndex; i++) {
        var y = parent.data.clusterData[i].cumDelta;
        var p = m.applyToPoint(i + 0.5, y);
        if (i != parent.minIndex) ctx.lineTo(p.x, p.y);
        else ctx.moveTo(p.x, p.y);
      }
      ctx.stroke();
    }
    var p1 = m.applyToPoint(parent.minIndex + 0.5, 0);
    var p2 = m.applyToPoint(parent.maxIndex + 0.5, 0);
    ctx.strokeStyle = '#ddd';
    ctx.beginPath();
    ctx.myLine(p1.x, p1.y, p2.x, p2.y);
    ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = ColorsService.greencandle;
    ctx.beginPath();
    ctx.myRectXY({ x: view.x, y: view.y }, { x: view.x + view.w, y: p1.y });
    ctx.clip();
    dr();
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = ColorsService.redcandle;
    ctx.beginPath();
    ctx.myRectXY(
      { x: view.x, y: p1.y },
      { x: view.x + view.w, y: view.h + view.y }
    );
    ctx.clip();
    dr();
    ctx.restore();
  }
  drawText(r: Rectangle, text: string) {
    if (this.fontSize > 7) {
      this.ctx.fillStyle =  ColorsService.WhiteText;
      this.ctx.fillText(text, r.x + r.w / 2, r.y + r.h / 2);
    }
    r.y += r.h;
  }
  drawTextS(r: Rectangle, v: number) {
    /*if (text > 1000)
            drawText(Math.Round(text));
        else*/
    let t = drob(v);
    this.drawText(r, t + '');
  }
  drawHeadColumn(
    parent: FootPrintComponent,    
    view: Rectangle,
    mtx: Matrix,
    number: number
  ) {
    let ctx = this.parent.ctx;
    var column = parent.data.clusterData[number];
    var r1 = mtx.applyToPoint(number, 0);
    var r2 = mtx.applyToPoint(number + 1, 1);
    var r: Rectangle = { x: r1.x, y: r1.y, w: r2.x - r1.x, h: r2.y - r1.y };

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = this.fontSize + 'px Verdana';
    
    let col:string = this.colorsService.getGradientColorEx(
      '#d61800',
      '#ffffff',
      '#04a344',
      Math.max(
        Math.abs(parent.data.maxCumDelta),
        Math.abs(parent.data.minCumDelta)
      ),
      column.cumDelta
    );

   // col =  'blue';

    ctx.fillStyle = col;


    
    
    ctx.strokeStyle = ColorsService.lineColor;
    ctx.myFillRect(r);
    ctx.stroke();
   // ctx.fill();
    ctx.myStrokeRect(r);
    this.drawTextS(r, column.cumDelta);
    ctx.fillStyle = this.colorsService.getGradientColorEx(
      '#d61800',
      '#ffffff',
      '#04a344',
      Math.max(
        Math.abs(parent.data.maxColumnDelta),
        Math.abs(parent.data.minColumnDelta)
      ),
      column.deltaTotal
    );
    
    ctx.strokeStyle = ColorsService.lineColor;
    ctx.myFillRect(r);
    ctx.stroke();
    ctx.myStrokeRect(r);
    this.drawTextS(r, column.deltaTotal);
    if (this.parent.topVolumes()) {
      ctx.myStrokeRect(r);
      this.drawTextS(r, column.q);
    }
    if (this.parent.oiEnable()) {
      // ctx.myStrokeRect(r);
      ctx.fillStyle = this.colorsService.getGradientColorEx(
        '#d61800',
        '#ffffff',
        '#04a344',
        parent.data.maxAbsOIDelta,
        column.oiDelta
      );
      
    //  ctx.myFillRect(r);
  //     ctx.fill();
      ctx.strokeStyle = ColorsService.lineColor;
      ctx.myStrokeRect(r);
      this.drawText(r, column.oiDelta + '');
    }
    ctx.textAlign = 'left';
  }
}




