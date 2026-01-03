import { canvasPart } from './canvas-part';
import { Matrix, Point, Rectangle} from '../models/matrix';
import { ColorsService } from 'src/app/service/FootPrint/Colors/color.service';
import { DraggableEnum } from 'src/app/models/Draggable';
import { ColumnEx } from '../columns/cluster-column-base';
import { ChartSettings } from 'src/app/models/ChartSettings';
import { FootPrintComponent } from '../components/footprint/footprint.component';
import { MyMouseEvent } from 'src/app/models/MyMouseEvent';


export class viewVolumesSeparated extends canvasPart {
  q: number = 0;
  bq: number = 0;
  data: any;

  constructor(
    parent: FootPrintComponent,    
    view: Rectangle,
    mtx: Matrix,
    draggable: DraggableEnum = DraggableEnum.Top
  ) {
    super(parent,  view, mtx, draggable);
    this.data = parent.data;
  }

  onPanStart(e: any) {
    if (!this.parent.markupEnabled || this.parent.markupManager.allowPan()) {
      this.parent.translateMatrix = new Matrix().translate(
        e.deltaX ,
        0
      );
      this.parent.drawClusterView();
    }
  }
  onPan(e: any) {
    this.onPanStart(e);
  }
  onPanEnd(e: any) {
    if (this.parent.translateMatrix!=null)
    if( !this.parent.markupEnabled || this.parent.markupManager.allowPan()) {
      this.parent.viewsManager.mtx = this.parent.alignMatrix(
        this.parent.translateMatrix.multiply(this.parent.viewsManager.mtx)
      );
      this.parent.translateMatrix = null;
    }
  }


  onMouseWheel(ev: MyMouseEvent, wheelDistance: number) {
    const scale = Math.pow(1.05, wheelDistance);
    const [x, y] = [ev.position.x, ev.position.y];


  


    
    var s = Math.pow(1.05, wheelDistance);
  
    var m = Matrix.fromTriangles(
      [x, y + 1, x + 1, y - 2, x + 2, y],
      [x, y + 1, x + s, y - 2, x + 2 * s, y]
    );
    this.parent.viewsManager.mtx = this.parent.alignMatrix(m.multiply(this.parent.viewsManager.mtx));
    this.parent.drawClusterView();
  }

  draw(parent: FootPrintComponent, view: Rectangle, mtx: Matrix): void {
   const ctx = this.parent.ctx;  
   var FPsettings: ChartSettings = this.parent.FPsettings; 

    var maxQuantity: number, maxQuantityAsk: number, maxQuantityBid: number;

    if (FPsettings.Contracts) {
      maxQuantity = this.data.maxQuantity;
      maxQuantityAsk = this.data.maxQuantityAsk;
      maxQuantityBid = this.data.maxQuantityBid;
    } else {
      maxQuantity = this.data.maxVolume;
      maxQuantityAsk = this.data.maxVolumeAsk;
      maxQuantityBid = this.data.maxVolumeBid;
    }

    if (FPsettings.ShrinkY) {
      if (FPsettings.Contracts) {
        maxQuantity = this.data.local.q;
        maxQuantityAsk = this.data.local.bq;
        maxQuantityBid = this.data.local.sq;
      } else {
        maxQuantity = this.data.local.v;
        maxQuantityAsk = this.data.local.bv;
        maxQuantityBid = this.data.local.sv;
      }
    }

    ctx.restore();
    this.DrawZebra(ctx, view.x, view.y, view.w, view.h, 0, maxQuantity);
    ctx.save();
    this.ctx.beginPath();
    this.ctx.myRect(this.view);
    this.ctx.clip();
    let drawVolumeColumn = this.drawVolumeColumnTotal.bind(this);

    if (FPsettings.style != 'Volume')
      switch (FPsettings.classic) {
        case 'ASK':
          drawVolumeColumn = this.drawVolumeColumnAsk.bind(this);
          maxQuantity = maxQuantityAsk;
          break;
        case 'BID':
          drawVolumeColumn = this.drawVolumeColumnBid.bind(this);
          maxQuantity = maxQuantityBid;
          break;
        case 'ASK/BID':
          drawVolumeColumn = this.drawVolumeColumnAskBid.bind(this);
          maxQuantity = Math.max(maxQuantityAsk, maxQuantityBid);
          break;
        default:
          drawVolumeColumn = this.drawVolumeColumnTotal.bind(this);
          //  this.maxQuantity = this.maxQuantity;
          break;
      }

    maxQuantity *= 1.1;

    mtx = mtx.reassignY(
      { y1: 0, y2: maxQuantity },
      { y2: view.y, y1: view.y + view.h }
    );
    ctx.setMatrix(mtx);
    var data = parent.data.clusterData;

    this.drawVertical();

    for (
      var i = parent.minIndex;
      i <= parent.maxIndex;
      i++ //  if (data[i] == parent.selectedColumn)
    ) {
      //if (parent.drawVolumeColumn)
      drawVolumeColumn(data[i], i, mtx);
    }
  }

  volumeRect(volume: number, columnNumber: number, mtx: Matrix) {
    var p1 = mtx.applyToPoint(columnNumber, 0);
    var p2 = mtx.applyToPoint(columnNumber + 1, volume);
    return { x: p1.x, y: p1.y, w: p2.x - p1.x, h: p2.y - p1.y };
  }

  setQ(column: ColumnEx) {
   var FPsettings: ChartSettings = this.parent.FPsettings; let ctx = this.parent.ctx;
    this.q = FPsettings.Contracts ? column.q : column.v;
    this.bq = FPsettings.Contracts ? column.bq : column.bv;
  }

  drawVolumeColumnTotal(column: ColumnEx, number: number, mtx: Matrix) {
    this.setQ(column);
    var ctx = this.ctx;
    ctx.fillStyle =
      column == this.parent.selectedColumn
        ? ColorsService.greencandlesat
        : ColorsService.greencandle;
    ctx.mFillRectangle(number + 0.1, 0, 0.8, this.bq);
    ctx.fillStyle =
      column == this.parent.selectedColumn
        ? ColorsService.redcandlesat
        : ColorsService.redcandle;
    ctx.mFillRectangle(number + 0.1, this.bq, 0.8, this.q - this.bq);
  }

  drawVolumeColumnAsk(column: ColumnEx, number: number, mtx: Matrix) {
    this.setQ(column);
    var r = this.parent.clusterRect(0, number, mtx);
    this.ctx.fillStyle =
      column == this.parent.selectedColumn
        ? ColorsService.greencandlesat
        : ColorsService.greencandle;
    this.ctx.mFillRectangle(number + 0.1, 0, 0.8, this.bq);
    var p1 = mtx.applyToPoint(0, this.bq);
  }
  drawVolumeColumnBid(column: ColumnEx, number: number, mtx: Matrix) {
    this.setQ(column);
    var r = this.parent.clusterRect(0, number, mtx);
    this.ctx.fillStyle =
      column == this.parent.selectedColumn
        ? ColorsService.redcandlesat
        : ColorsService.redcandle;
    this.ctx.mFillRectangle(number + 0.1, 0, 0.8, this.q - this.bq);
  }

  drawVolumeColumnAskBid(column: ColumnEx, number: number, mtx: Matrix) {
    this.setQ(column);
    var r = this.parent.clusterRect(0, number, mtx);
    this.ctx.fillStyle =
      column == this.parent.selectedColumn
        ? ColorsService.greencandlesat
        : ColorsService.greencandle;
    this.ctx.mFillRectangle(number, 0, 0.5, this.bq);
    this.ctx.fillStyle =
      column == this.parent.selectedColumn
        ? ColorsService.redcandlesat
        : ColorsService.redcandle;
    this.ctx.mFillRectangle(number + 0.5, 0, 0.5, this.q - this.bq);

    var d = mtx.applyToPoint(0, this.bq).x - mtx.applyToPoint(0.5, this.bq).x;
  }
}





