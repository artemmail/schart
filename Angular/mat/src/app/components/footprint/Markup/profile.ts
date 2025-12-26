import { drob, hexToRgb } from 'src/app/service/FootPrint/utils';
import { Rect } from './rect';
import { ClusterData } from '../clusterData';
import { MarkUpManager } from './Manager';
import { Point } from '../matrix';


export class Profile extends Rect {
  total: any;
  dockable: any;
  constructor(manager: MarkUpManager) {
    super(manager);
    this.type = 'Profile';
    this.controlMap = {
      color: false,
      width: false,
      font: false,
      id: false,
      text: false,
      arrow: false,
      toolbar: false,
      profile: true,
    };
    this.getFromModel();
  }
  override getFromModel() {
    this.total = this.model.total;
    this.dockable = this.model.dockable;
  }
  override setToModel() {
    this.total = this.model.total;
    this.model.dockable= this.dockable;
  }
  getTotalColumn(data: ClusterData , c1: number, c2: number, p1: number, p2: number): any {
    c1 = Math.max(c1, 0);
    c2 = Math.min(c2, data.clusterData.length);
    var result = {};
    for (var i = c1; i < c2; i++) {
      var col = data.clusterData[i];
      for (var j = 0; j < col.cl.length; j++) {
        var p = col.cl[j].p;
        if (p >= p1 && p <= p2) {
          var q = col.cl[j].q;
          var bq = col.cl[j].bq;
          var ct = col.cl[j].ct;
          var mx = col.cl[j].mx;
          if (!result.hasOwnProperty(col.cl[j].p))
            result[p] = { p: p, q: q, bq: bq, ct: ct, mx: mx };
          else {
            result[p].q += q;
            result[p].bq += bq;
            result[p].ct += ct;
            if (Math.abs(mx) > Math.abs(result[p].mx)) result[p].mx = mx;
          }
        }
      }
    }
    var values1 = Object.keys(result);
    var len = values1.length;
    if(len==0)
      return {};
    var values: Array<number> = new Array(values1.length);

    for (let i: number = 0; i < len; i++) 
        values[i] = parseFloat(values1[i]);

    values.sort((a: number, b: number) => {
      return a - b;
    });

    var res = {}; // = { cl: new Array(len) };
    res['cl'] = new Array(len);
    for (var k = 0; k < len; k++) {
      var r = result[values[k]];
      /*   res.cl[k].p = r.p;
            res.cl[k].q = r.q;
            res.cl[k].bq = r.bq;
            res.cl[k].ct = r.ct;
            res.cl[k].mx = r.mx;*/

      res['cl'][k] = r;
    }
    return res;
  }
  dock() {
    this.pointArray[0].x = Math.round(this.pointArray[0].x);
    this.pointArray[1].x = Math.round(this.pointArray[1].x);
    if (this.pointArray[1].x == this.pointArray[0].x)
      this.pointArray[1].x = this.pointArray[0].x + 1;
    let ps = this.footprint.data.priceScale;
    this.pointArray[0].y = Math.round(this.pointArray[0].y / ps) * ps - ps / 2;
    this.pointArray[1].y = Math.round(this.pointArray[1].y / ps) * ps - ps / 2;
    if (this.pointArray[1].y == this.pointArray[0].y)
      this.pointArray[1].y = this.pointArray[0].y + ps;
  }
  override onMouseUp(point: Point) {
    if (this.dockable && this.pointArray.length == 2) {
      this.dock();
    }
  }

  findMiddleElement(arr) {
    let minDiff = Infinity;
    let middleElementIndex = 0;

    for (let i = 1; i < arr.length - 1; i++) {
      let leftSum = arr.slice(0, i).reduce((acc, cur) => acc + cur.q, 0);
      let rightSum = arr.slice(i + 1).reduce((acc, cur) => acc + cur.q, 0);
      let diff = Math.abs(leftSum - rightSum);

      if (diff < minDiff) {
        minDiff = diff;
        middleElementIndex = i;
      }
    }

    return middleElementIndex;
  }

  override drawShape() {
    let ctx = this.footprint.ctx;
    this.footprint.ctx.lineWidth = 1;
    if (this.sortPoints()) {
      let col1 = Math.trunc(this.vPoints[0].x);
      let col2 = Math.trunc(this.vPoints[1].x);
      if (col2 != this.vPoints[1].x) col2++;
      let p1 = this.vPoints[0].y;
      let p2 = this.vPoints[2].y;

      var maxc = 0;
      var totalvolume = 0;
      var column ={cl:[]};

      if(this.footprint.data.ableCluster())

      {
      column = this.getTotalColumn(
        this.footprint.data,
        col1,
        col2,
        p1,
        p2
      );
    

      if (!Array.isArray(column.cl))
        return;

      for (let x of column.cl) {
        maxc = Math.max(x.q, maxc);
        totalvolume += x.q;
      }
    }

      let mtx = this.footprint.viewsManager.viewMain.mtx;
      let barw =
        mtx.applyToPoint(col2, this.footprint.data.priceScale).x -
        mtx.applyToPoint(col1, 0).x;
      let rgbcolor = hexToRgb('#6495ed');
      var gc = `rgba(${rgbcolor.r},${rgbcolor.g},${rgbcolor.b},0.35)`;
      var gc2 = `rgba(${rgbcolor.r},${rgbcolor.g},${rgbcolor.b},0.6)`;
      ctx.strokeStyle = '#c0c0c0';
      ctx.fillStyle = gc2;
      let pt1 = this.baseToScreen(this.vPoints[0]);
      let pt2 = this.baseToScreen(this.vPoints[2]);
      ctx.myStrokeRect({
        x: pt1.x,
        y: pt1.y,
        w: pt2.x - pt1.x,
        h: pt2.y - pt1.y,
      });
      if (this.total && totalvolume > 0) {
        ctx.font = '12px Verdana';
        ctx.textBaseline = 'top';
        ctx.fillText(/*"Total=" +*/ drob(totalvolume, 4).toString(), pt1.x + 3, pt1.y + 2);
      }
      ctx.save();
      ctx.beginPath();
      ctx.rect(pt1.x, pt1.y, pt2.x - pt1.x, pt2.y - pt1.y);
      ctx.clip();
      var middle = this.findMiddleElement(column.cl);
      for (var j = 0; j < column.cl.length; j++) {
        var i = j; //z[j];

        var r1 = this.footprint.clusterRect2(
          column.cl[middle].p,
          col1,
          col2,
          mtx
        );

        var r = this.footprint.clusterRect2(column.cl[i].p, col1, col2, mtx);
        r.w = (column.cl[i].q * barw) / maxc;
        r.w *= 0.95;
        ctx.fillStyle = column.cl[i].q == maxc ? 'rgba(255,127,80,0.35)' : gc;
        ctx.beginPath();
        ctx.moveTo(pt1.x, r1.y);
        ctx.lineTo(pt2.x, r1.y);
        ctx.stroke();
        ctx.myFillRect(r);
        ctx.myStrokeRect(r);
      }
      ctx.restore();
    }
  }
}
