import { ProfileModel } from 'src/app/models/profileModel';
import { FootPrintComponent } from '../components/footprint/footprint.component';
import { Point } from '../models/matrix';

import { Brush } from './brush';
import { Line } from './line';
import { Profile } from './profile';
import { ProfileAuto } from './profile-auto';
import { Rect } from './rect';
import { Shape, ShapePoint } from './shape';
import { MarkupMode } from './shape-type';
import { Strength } from './strength';
import { TextShape } from './text';

export class MarkUpManager {
  selectedShape: ShapePoint | null;
  mouseShape: ShapePoint | null;
  model: ProfileModel;
  footprint: FootPrintComponent;
  shapeArray: Array<Shape>;
  drawingShape: Shape | null;
  private profileAuto: ProfileAuto;

  constructor(model: ProfileModel, footprint: FootPrintComponent) {
    this.selectedShape = null;
    this.mouseShape = null;
    this.model = model;
    this.footprint = footprint;
    this.shapeArray = [];
    this.drawingShape = null;
    this.profileAuto = new ProfileAuto(this);
  }

  selectShape(point: Point): ShapePoint | null {
    for (let shape of this.shapeArray) {
      const p = shape.selectedPoint(point);
      if (p != null) return p;
    }
    return null;
  }

  shapeFactory(type: MarkupMode): Shape | null {
    switch (type) {
      case 'Line':
        return new Line(this);
      case 'Brush':
        return new Brush(this);
      case 'Rect':
        return new Rect(this);
      case 'Text':
        return new TextShape(this);
      case 'Profile':
        return new Profile(this);
      case 'Strength':
        return new Strength(this);
      case 'Edit':
        return null;
      default:
        return null;
    }
  }

  updateShapeFromModel(): void {
    if (this.selectedShape != null) {
      this.selectedShape.shape.getFromModel();
    }
    this.footprint.resize();
  }

  resetEdit(): void {
    this.model.visible = {
      color: false,
      width: false,
      font: false,
      id: false,
      text: false,
      arrow: false,
      profile: false,
      toolbar: false,
    };
  }

  deleteCurrent(): void {
    if (this.selectedShape) {
      this.shapeArray.splice(
        this.shapeArray.indexOf(this.selectedShape.shape),
        1
      );
      this.selectedShape = null;
      this.footprint.resize();
      this.resetEdit();
    }
  }

  onMouseDown(point: Point): void {
    this.selectedShape = this.mouseShape;
    if (this.selectedShape != null) {
      this.selectedShape.shape.selectControls();
      this.selectedShape.shape.onStartMovePoint(point);
    } else {
      if (this.model.mode == 'Profile' && this.model.profilePeriod != -1)
        return;
      if (this.model.mode == 'Edit') this.resetEdit();

      this.drawingShape = this.shapeFactory(this.model.mode as MarkupMode);
      if (this.drawingShape != null) this.drawingShape.onStartDraw(point);
    }
  }

  onMouseDownMove(point: Point): void {
    if (this.selectedShape != null) {
      this.selectedShape.shape.onMovePoint(point);
      this.footprint.resize();
    }
    if (this.drawingShape != null) {
      this.drawingShape.onMouseDownMove(point);
      this.footprint.resize();
    }
  }

  onMouseMove(point: Point): void {
    this.mouseShape = this.selectShape(point);
    this.footprint.canvas.style.cursor = this.resolveCursor(this.mouseShape);
  }

  onMouseUp(point: Point): void {
    if (this.drawingShape != null && this.drawingShape.pointArray.length > 1) {
      if (this.drawingShape.sortPoints()) {
        this.shapeArray.push(this.drawingShape);
        this.drawingShape.onMouseUp(point);
      }
      this.drawingShape = null;
    }
    if (this.selectedShape != null) {
      this.selectedShape.shape.onMouseUp(point);
      //    this.selectedShape = null;
    }
  }

  changeMode(mode: MarkupMode): void {
    if (mode === 'Edit' && this.model.mode === 'Edit') return;

    const nextShape = this.shapeFactory(mode);
    if (nextShape == null) {
      this.resetEdit();
    } else {
      nextShape.setupControls();
    }
    this.selectedShape = null;
    this.drawingShape = null;
    this.model.mode = mode;
    this.footprint.resize();
  }

  allowPan(): boolean {
    return this.selectedShape == null && this.drawingShape == null;
  }

  drawAll(): void {
    this.profileAuto.drawShape();
    for (let shape of this.shapeArray) {
      shape.drawShape();
      if (
        (this.mouseShape != null && this.mouseShape.shape == shape) ||
        (this.selectedShape != null && this.selectedShape.shape == shape)
      )
        shape.drawSelection();
    }
    if (this.drawingShape != null) this.drawingShape.drawShape();
  }

  private resolveCursor(shapePoint: ShapePoint | null): string {
    if (shapePoint == null) return 'default';
    return shapePoint.point != null ? 'pointer' : 'move';
  }
}




