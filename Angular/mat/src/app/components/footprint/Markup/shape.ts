import { ProfileModel, ProfileModelParts } from 'src/app/models/profileModel';
import { FootPrintComponent } from '../footprint.component';
import { Point } from '../matrix';
import { MarkUpManager } from './Manager';

var mode: string;

export class ShapePoint {
  public shape: Shape;
  public point: Point;
}

export class Shape {
  public footprint: FootPrintComponent;
  public manager: MarkUpManager;
  public type: string;
  public pointArray: Array<Point>;
  public screenPointArray: Array<Point>;
  public model: ProfileModel;

  public controlMap: ProfileModelParts; 
  public color: string;
  public selPoint: Point;
  public mouseDown: any;

  constructor(manager) {
    this.manager = manager;
    this.type = 'Base';
    this.model = manager.model;
    this.footprint = manager.footprint;
    this.pointArray = new Array();
    this.screenPointArray = new Array();
    this.controlMap = {
      color: false,
      width: false,
      font: false,
      id: false,
      text: false,
      arrow: false,
      toolbar: false,
      profile: false,
    };
    this.getFromModel();
  }
  sortPoints() {
    return this.pointArray.length > 1;
  }
  selectControls() {
    mode = 'Edit';
    
        this.model.visible=  this.controlMap;
        this.model.visible.toolbar = true;
    //    $("#toolbar").data("kendoToolBar").toggle("#Edit", true);
    this.setToModel();
  }
  setupControls() {
    this.model.mode = this.type;
    this.model.visible = this.controlMap;
  }
  baseToScreen(point) {
    return this.footprint.viewsManager.viewMain.mtx.applyToPoint(point.x, point.y);
  }
  screenToBase(point) {
    return this.footprint.viewsManager.viewMain.mtx.inverse().applyToPoint(point.x, point.y);
  }
  screenToBaseDelta(p1, p2) {
    let pt1 = this.screenToBase(p1);
    let pt2 = this.screenToBase(p2);
    return { x: pt2.x - pt1.x, y: pt2.y - pt1.y };
  }
  movePoint(point, mouseDown, mouseMove) {
    let p = this.screenToBaseDelta(mouseDown, mouseMove);
    point.x += p.x;
    point.y += p.y;
  }
  movePoints(mouseDown, mouseMove) {
    let p = this.screenToBaseDelta(mouseDown, mouseMove);
    for (let point of this.pointArray) {
      point.x += p.x;
      point.y += p.y;
    }
  }
  commonSectionCircle(p1, p2, pC, R) {
    let x1 = p1.x - pC.x;
    let y1 = p1.y - pC.y;
    let x2 = p2.x - pC.x;
    let y2 = p2.y - pC.y;
    let dx = x2 - x1;
    let dy = y2 - y1;
    //составляем коэффициенты квадратного уравнения на пересечение прямой и окружности.
    //если на отрезке [0..1] есть отрицательные значения, значит отрезок пересекает окружность
    let a = dx * dx + dy * dy;
    let b = 2 * (x1 * dx + y1 * dy);
    let c = x1 * x1 + y1 * y1 - R * R;
    //а теперь проверяем, есть ли на отрезке [0..1] решения
    if (-b < 0) return c < 0;
    if (-b < 2 * a) return 4 * a * c - b * b < 0;
    return a + b + c < 0;
  }
  isSelectedShape(point: Point, pointArray: Array<Point>) {
    if (this.pointArray.length > 1) {
      for (let i = 0; i < pointArray.length - 1; i++) {
        let p = this.baseToScreen(pointArray[i]);
        let p2 = this.baseToScreen(pointArray[i + 1]);
        if (this.commonSectionCircle(p, p2, point, 2)) return true;
      }
    }
    return false;
  }

  selectedPoint_(point: Point, pointArray: Array<Point>): ShapePoint {
    for (let px of pointArray) {
      let p = this.baseToScreen(px);
      if (Math.abs(p.x - point.x) < 4 && Math.abs(p.y - point.y) < 3)
        return { shape: this, point: px };
    }
    if (this.isSelectedShape(point, pointArray))
      return { shape: this, point: null };
    return null;
  }
  selectedPoint(point: Point): ShapePoint {
    return this.selectedPoint_(point, this.pointArray);
  }

  onStartDraw(point: Point) {
    this.pointArray = new Array();
    this.pointArray.push(this.screenToBase(point));
  }
  onMouseDownMove(point) {}
  onMouseUp(point) {}
  showWindowFields() {}
  setToModel() {}
  getFromModel() {}
  onStartMovePoint(point) {
    let sp: ShapePoint = this.selectedPoint(point);
    this.selPoint = sp != null ? sp.point : null;
    this.mouseDown = point;
  }
  onMovePoint(point) {
    if (this.selPoint != null)
      this.movePoint(this.selPoint, this.mouseDown, point);
    else this.movePoints(this.mouseDown, point);
    this.mouseDown = point;
  }
  onFinishMovePoint(point) {}
  drawSelection() {
    this.footprint.ctx.fillStyle = this.color;
    for (let px of this.pointArray) {
      let p = this.baseToScreen(px);
      this.footprint.ctx.fillRect(p.x - 4, p.y - 4, 8, 8);
    }
  }
  drawShape() {}
}
