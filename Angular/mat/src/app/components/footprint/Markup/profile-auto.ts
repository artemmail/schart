import { Point } from '../matrix';

import { Profile } from './profile';
import { MarkUpManager } from './markup-manager';

export class ProfileAuto extends Profile {
  constructor(manager: MarkUpManager) {
    super(manager);
  }
  override getFromModel() {
    this.total = this.model.total;
    this.dockable = this.model.dockable;
  }
  override setToModel() {
    this.total = this.model.total;
    this.model.dockable = this.dockable;
  }
  override onMouseUp(point: Point): void {}
  getProfiles(period: number): Array<Point[]> {
    let data = this.footprint.data.clusterData;
    let pairs: Array<[number, number]> = [];
    let s = 0;
    function datesComaprer(d1, d2, p) {
      if (p == 30000) {
        return d1.getMonth() == d1.getMonth();
      }
      if (p == 10080) {
        const diffDays = Math.abs(
          (d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24)
        );
        return diffDays < 7 && d1.getDay() <= d2.getDay();
      }
      return Math.abs((d1.getTime() - d2.getTime()) / (1000 * 60 * p)) < 1;
    }
    for (let i = 0; i < data.length; i++) {
      if (!datesComaprer(data[s].x, data[i].x, period)) {
        pairs.push([s, i]);
        s = i;
      }
    }
    if (pairs.length == 0) pairs = [[0, data.length]];
    else pairs.push([pairs[pairs.length - 1][1], data.length]);
    let res: Array<Point[]> = [];
    let ss = this.footprint.data.priceScale;
    for (let i = 0; i < pairs.length; i++) {
      let minp = data[pairs[i][0]].l; // cl[0].p;
      let maxp = data[pairs[i][0]].h; // minp;
      for (let j = pairs[i][0]; j < pairs[i][1]; j++) {
        maxp = Math.max(maxp, data[j].h);
        minp = Math.min(minp, data[j].l);
      }
      let col = data[pairs[i][1] - 1];
      res.push([
        { x: pairs[i][0], y: (minp / ss) * ss },
        { x: pairs[i][1], y: ss + (maxp / ss) * ss },
      ]);
    }
    return res;
  }
  override drawShape() {
    let period = this.model.profilePeriod;
    if (period == -1) return;
    let arr = this.getProfiles(period);
    for (let i = 0; i < arr.length; i++) {
      this.pointArray = arr[i];
      this.getFromModel();

      this.dock();

      super.drawShape();
    }
  }
}

