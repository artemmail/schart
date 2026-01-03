import { ProfileModel, ProfileModelParts } from 'src/app/models/profileModel';
import { FootPrintComponent } from '../components/footprint/footprint.component';
import { Point } from '../models/matrix';
import { MarkUpManager } from './markup-manager';

export interface ShapePoint {
  shape: Shape;
  point: Point | null;
}

export abstract class Shape {
  public footprint: FootPrintComponent;
  public manager: MarkUpManager;
  public type: string;
  public pointArray: Array<Point>;
  public screenPointArray: Array<Point>;
  public model: ProfileModel;

  public controlMap: ProfileModelParts;
  public color: string;
  public selPoint: Point | null;
  public mouseDown: Point | null;

  constructor(manager: MarkUpManager) {
    this.manager = manager;
    this.type = 'Base';
    this.model = manager.model;
    this.footprint = manager.footprint;
    this.pointArray = [];
    this.screenPointArray = [];
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
    this.selPoint = null;
    this.mouseDown = null;
    this.color = this.model.color;
  }

  sortPoints(): boolean {
    return this.pointArray.length > 1;
  }

  selectControls(): void {
    this.model.mode = 'Edit';
    this.model.visible = { ...this.controlMap, toolbar: true } as ProfileModelParts;
    this.setToModel();
  }

  setupControls(): void {
    this.model.mode = this.type;
    this.model.visible = { ...this.controlMap } as ProfileModelParts;
  }

  baseToScreen(point: Point): Point {
    return this.footprint.viewsManager.viewMain.mtx.applyToPoint(point.x, point.y);
  }

  screenToBase(point: Point): Point {
    return this.footprint.viewsManager.viewMain.mtx.inverse().applyToPoint(point.x, point.y);
  }

  screenToBaseDelta(p1: Point, p2: Point): { x: number; y: number } {
    const pt1 = this.screenToBase(p1);
    const pt2 = this.screenToBase(p2);
    return { x: pt2.x - pt1.x, y: pt2.y - pt1.y };
  }

  movePoint(point: Point, mouseDown: Point, mouseMove: Point): void {
    const p = this.screenToBaseDelta(mouseDown, mouseMove);
    point.x += p.x;
    point.y += p.y;
  }

  movePoints(mouseDown: Point, mouseMove: Point): void {
    const p = this.screenToBaseDelta(mouseDown, mouseMove);
    for (let point of this.pointArray) {
      point.x += p.x;
      point.y += p.y;
    }
  }

  commonSectionCircle(p1: Point, p2: Point, pC: Point, R: number): boolean {
    const x1 = p1.x - pC.x;
    const y1 = p1.y - pC.y;
    const x2 = p2.x - pC.x;
    const y2 = p2.y - pC.y;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const a = dx * dx + dy * dy;
    const b = 2 * (x1 * dx + y1 * dy);
    const c = x1 * x1 + y1 * y1 - R * R;
    if (-b < 0) return c < 0;
    if (-b < 2 * a) return 4 * a * c - b * b < 0;
    return a + b + c < 0;
  }

  isSelectedShape(point: Point, pointArray: Array<Point>): boolean {
    if (this.pointArray.length > 1) {
      for (let i = 0; i < pointArray.length - 1; i++) {
        const p = this.baseToScreen(pointArray[i]);
        const p2 = this.baseToScreen(pointArray[i + 1]);
        if (this.commonSectionCircle(p, p2, point, 2)) return true;
      }
    }
    return false;
  }

  protected selectedPoint_(point: Point, pointArray: Array<Point>): ShapePoint | null {
    for (let px of pointArray) {
      const p = this.baseToScreen(px);
      if (Math.abs(p.x - point.x) < 4 && Math.abs(p.y - point.y) < 3)
        return { shape: this, point: px };
    }
    if (this.isSelectedShape(point, pointArray)) return { shape: this, point: null };
    return null;
  }

  selectedPoint(point: Point): ShapePoint | null {
    return this.selectedPoint_(point, this.pointArray);
  }

  onStartDraw(point: Point): void {
    this.pointArray = [];
    this.pointArray.push(this.screenToBase(point));
  }

  abstract onMouseDownMove(point: Point): void;
  abstract onMouseUp(point: Point): void;
  abstract setToModel(): void;
  abstract getFromModel(): void;

  onStartMovePoint(point: Point): void {
    const sp: ShapePoint | null = this.selectedPoint(point);
    this.selPoint = sp != null ? sp.point : null;
    this.mouseDown = point;
  }

  onMovePoint(point: Point): void {
    if (this.selPoint != null && this.mouseDown != null)
      this.movePoint(this.selPoint, this.mouseDown, point);
    else if (this.mouseDown != null) this.movePoints(this.mouseDown, point);
    this.mouseDown = point;
  }

  onFinishMovePoint(point: Point): void {}

  drawSelection(): void {
    this.footprint.ctx.fillStyle = this.color;
    for (let px of this.pointArray) {
      const p = this.baseToScreen(px);
      this.footprint.ctx.fillRect(p.x - 4, p.y - 4, 8, 8);
    }
  }

  abstract drawShape(): void;
}




