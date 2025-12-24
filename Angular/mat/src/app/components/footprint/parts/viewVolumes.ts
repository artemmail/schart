import { canvasPart } from './canvasPart';
import { Matrix, Point, Rectangle } from './../matrix';
import { ColorsService } from 'src/app/service/FootPrint/Colors/color.service';
import { DraggableEnum } from 'src/app/models/Draggable';
import { ColumnEx } from '../Columns/ClusterCoumnBase';
import { ChartSettings } from 'src/app/models/ChartSettings';
import { FootPrintComponent } from '../footprint.component';
import { drob } from 'src/app/service/FootPrint/utils';

export class viewVolumes extends canvasPart {
  data: any;
  q: number = 0;
  bq: number = 0;
  constructor(parent: FootPrintComponent, view: Rectangle, mtx: Matrix) {
    super(parent, view, mtx, DraggableEnum.No);
    this.data = parent.data;
  }

  override draw(
    parent: FootPrintComponent,
    view: Rectangle,
    mtx: Matrix
  ): void {
    var FPsettings: ChartSettings = this.parent.FPsettings;
    let ctx = this.parent.ctx;
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
    let drawVolumeColumn = this.drawVolumeColumnTotal.bind(this).bind(this);
    if (FPsettings.style != 'Volume')
      switch (FPsettings.classic) {
        case 'ASK':
          drawVolumeColumn = this.drawVolumeColumnAsk.bind(this).bind(this);
          maxQuantity = maxQuantityAsk;
          break;
        case 'BID':
          drawVolumeColumn = this.drawVolumeColumnBid.bind(this).bind(this);
          maxQuantity = maxQuantityBid;
          break;
        case 'ASK/BID':
          drawVolumeColumn = this.drawVolumeColumnAskBid.bind(this).bind(this);
          maxQuantity = Math.max(maxQuantityAsk, maxQuantityBid);
          break;
        default:
          drawVolumeColumn = this.drawVolumeColumnTotal.bind(this).bind(this);
          maxQuantity = maxQuantity;
          break;
      }

    maxQuantity *= 1.15;
    mtx = mtx.reassignY(
      { y1: 0, y2: maxQuantity },
      { y2: view.y, y1: view.y + view.h }
    );
    ctx.setMatrix(mtx);
    var data = parent.data.clusterData;
    for (let i = parent.minIndex; i <= parent.maxIndex; i++) {
      drawVolumeColumn(data[i], i, mtx);
    }
  }

  setQ(column: ColumnEx) {
    var FPsettings: ChartSettings = this.parent.FPsettings;
    let ctx = this.parent.ctx;
    this.q = FPsettings.Contracts ? column.q : column.v;
    this.bq = FPsettings.Contracts ? column.bq : column.bv;
  }

  drawVolumeColumnText(
    column: ColumnEx,
    number: number,
    mtx: Matrix,
    p: Point,
    text: number,
    nums: number
  ) {
    if (this.parent.topVolumes()) return;
    var bar = this.parent.getBar(mtx);
    var fontSize = Math.min(
      Math.abs(bar.w / nums),
      12 * this.colorsService.scale()
    );
    fontSize = Math.min(fontSize, this.colorsService.maxFontSize());
    if (fontSize > 7) {
      this.ctx.font = '' + fontSize + 'px Verdana';
      this.ctx.textBaseline = 'alphabetic';
      this.ctx.fillStyle = ColorsService.WhiteText;
      this.ctx.fillText(drob(text).toString(), p.x, p.y - 1);
    }
  }

  drawVolumeColumnTotal(column: ColumnEx, number: number, mtx: Matrix) {
    this.setQ(column);
    var ctx = this.ctx;
    ctx.fillStyle = ColorsService.greencandleA;
    ctx.mFillRectangle(number, 0, 1, this.bq);
    ctx.fillStyle = ColorsService.redcandleA;
    ctx.mFillRectangle(number, this.bq, 1, this.q - this.bq);
    this.drawVolumeColumnText(
      column,
      number,
      mtx,
      mtx.applyToPoint(number, this.q),
      this.q,
      6
    );
  }

  drawVolumeColumnAsk(column: ColumnEx, number: number, mtx: Matrix) {
    this.setQ(column);
    var r = this.parent.clusterRect(0, number, mtx);
    this.ctx.fillStyle = ColorsService.greencandleA;
    this.ctx.mFillRectangle(number, 0, 1, this.bq);
    var p1 = mtx.applyToPoint(0, this.bq);
    this.drawVolumeColumnText(
      column,
      number,
      mtx,
      mtx.applyToPoint(number, this.bq),
      this.bq,
      6
    );
  }
  drawVolumeColumnBid(column: ColumnEx, number: number, mtx: Matrix) {
    this.setQ(column);
    this.ctx.fillStyle = ColorsService.redcandleA;
    this.ctx.mFillRectangle(number, 0, 1, this.q - this.bq);
    this.drawVolumeColumnText(
      column,
      number,
      mtx,
      mtx.applyToPoint(number, this.q - this.bq),
      this.q - this.bq,
      6
    );
  }

  drawVolumeColumnAskBid(column: ColumnEx, number: number, mtx: Matrix) {
    this.setQ(column);
    var r = this.parent.clusterRect(0, number, mtx);
    this.ctx.fillStyle = ColorsService.greencandleA;
    this.ctx.mFillRectangle(number, 0, 0.5, this.bq);
    this.ctx.fillStyle = ColorsService.redcandleA;
    this.ctx.mFillRectangle(number + 0.5, 0, 0.5, this.q - this.bq);
    this.drawVolumeColumnText(
      column,
      number,
      mtx,
      mtx.applyToPoint(number, this.bq),
      this.bq,
      6
    );
    this.drawVolumeColumnText(
      column,
      number,
      mtx,
      mtx.applyToPoint(number + 0.5, this.q - this.bq),
      this.q - this.bq,
      6
    );
  }
}
