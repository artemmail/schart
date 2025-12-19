import { ColumnEx } from 'src/app/models/Column';
import { Matrix, Rectangle, Point } from '../matrix';

import { ClusterCoumnBase } from './ClusterCoumnBase';
import { FootPrintComponent } from '../footprint.component';

export class ClassicColumnTotal extends ClusterCoumnBase {
  constructor(parent: FootPrintComponent,  view: Rectangle, mtx: Matrix) {
    super(parent,  view, mtx);
  }

  draw(column: ColumnEx, number: number, mtx: Matrix, total: boolean) {
    this.drawClassicColumn_(column, number, mtx, true);
  }
}
