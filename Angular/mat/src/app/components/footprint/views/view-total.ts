import { createClusterColumnContext } from '../rendering/cluster-column-context';
import { canvasPart } from './canvas-part';
import { Matrix, Rectangle } from '../models/matrix';
import { ClassicColumnTotal } from '../columns/classic-column-total';
import { VolumeColumnTotal } from '../columns/volume-column-total';
import { DraggableEnum } from 'src/app/models/Draggable';
import { ChartSettings } from 'src/app/models/ChartSettings';
import type { ChartViewContext } from '../models/chart-runtime-context';

export class viewTotal extends canvasPart<ChartViewContext> {
  constructor(parent: ChartViewContext,  view: Rectangle, mtx: Matrix) {
    super(parent,  view, mtx, DraggableEnum.Right);
  }

  draw(parent: ChartViewContext,  view: Rectangle, mtx: Matrix): void {
    var FPsettings: ChartSettings = this.parent.FPsettings; let ctx = this.parent.ctx;
    const columnContext = createClusterColumnContext(parent);
    var ColumnBuilder;
    switch (FPsettings.style) {
      case 'Ruticker':
        //    case 'Volume':
        ColumnBuilder = new ClassicColumnTotal(columnContext, view, mtx);
        break;
      default:
        ColumnBuilder = new VolumeColumnTotal(columnContext, view, mtx);
        break;
    }

    ColumnBuilder.draw(parent.data.totalColumn, 0, mtx, true);
    ctx.strokeStyle = this.palette.grid;
    
    if (

      FPsettings.totalMode === 'Under' &&
      parent.data.ableCluster()
    )
    ctx.setLineDash([5, 5, 3, 5]);
    ctx.myStrokeRect(this.view);    
    ctx.setLineDash([]);
  }
}





