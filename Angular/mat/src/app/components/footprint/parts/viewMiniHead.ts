import { Matrix, Rectangle } from '../matrix';
import { ColorsService } from 'src/app/service/FootPrint/Colors/color.service';
import { viewVolumesSeparated } from './viewVolumesSeparated';
import { DraggableEnum } from 'src/app/models/Draggable';
import { ChartSettings } from 'src/app/models/ChartSettings';
import { FootPrintComponent } from '../footprint.component';
import { number } from 'echarts';

export class viewMiniHead extends viewVolumesSeparated {
  constructor(parent: FootPrintComponent, view: Rectangle, mtx: Matrix) {
    super(parent, view, mtx, DraggableEnum.Top);
  }

  toShortStr = function (date: Date): string {
    var monthnames = [
      'янв',
      'фев',
      'мар',
      'апр',
      'май',
      'июн',
      'июл',
      'авг',
      'сен',
      'окт',
      'ноя',
      'дек',
    ];
    return date.getDate() + ' ' + monthnames[date.getMonth()];
  };

  override draw(
    parent: FootPrintComponent,
    view: Rectangle,
    mtx: Matrix
  ): void {
    var FPsettings: ChartSettings = this.parent.FPsettings;
    let ctx = this.parent.ctx;

    ctx.save();
    ctx.beginPath();
    var lastprice: number = parent.data.lastPrice;
    var lastclose: number = parent.data.clusterData[0].o;

    var date = parent.data.clusterData[parent.data.clusterData.length - 1].x;

    var text = parent.params.ticker; // .params.ticker;
    if (parent.caption)
        text = parent.caption;

    for (var i = parent.data.clusterData.length - 1; i >= 1; i--)
      if (
        parent.data.clusterData[i].x.getDate() !=
        parent.data.clusterData[i-1].x.getDate()
      ) {
        
        lastclose = parent.data.clusterData[i-1].c;
        break;
      }
    ctx.font = '16px Arial';
    var perc = Math.round((lastprice / lastclose - 1) * 10000) / 100;
    /*
      if (this.hintMode)
          perc = this.exParams.percent;*/
    ctx.fillStyle = '#333';
    ctx.textAlign = 'left';
    ctx.fillText(text, 1, 16);
    ctx.fillStyle =
      perc < 0 ? ColorsService.redcandlesat : ColorsService.greencandlesat;
    ctx.textAlign = 'right';
    ctx.fillText(`${lastprice}(${perc}%)`, view.w, 16);
    ctx.font = '12px Arial';
    ctx.fillStyle = '#333';
    ctx.textAlign = 'center';
    ctx.fillText(this.toShortStr(date), view.w / 2, 16);
    ctx.closePath();
    ctx.restore();
  }
}
