import { ColumnEx } from 'src/app/models/Column';
import { Matrix, Rectangle } from '../models/matrix';

import { ClusterColumnContext, ClusterColumnBase } from './cluster-column-base';

export class ClassicColumnTotal extends ClusterColumnBase {
  constructor(context: ClusterColumnContext, view: Rectangle, mtx: Matrix) {
    super(context, view, mtx);
  }

  draw(column: ColumnEx, number: number, mtx: Matrix, total: boolean) {
    this.drawClassicColumn_(column, number, mtx, true);
  }
}



