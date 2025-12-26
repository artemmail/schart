import { ColumnEx } from 'src/app/models/Column';
import { Matrix, Rectangle } from '../matrix';

import { ClusterColumnContext, ClusterCoumnBase } from './ClusterCoumnBase';

export class ClassicColumnTotal extends ClusterCoumnBase {
  constructor(context: ClusterColumnContext, view: Rectangle, mtx: Matrix) {
    super(context, view, mtx);
  }

  draw(column: ColumnEx, number: number, mtx: Matrix, total: boolean) {
    this.drawClassicColumn_(column, number, mtx, true);
  }
}
