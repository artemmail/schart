import { ProfileModel } from 'src/app/models/profileModel';
import { FootPrintComponent } from '../footprint.component';

import { Brush } from './brush';
import { Line } from './line';
import { Profile } from './profile';
import { ProfileAuto } from './profilesuto';
import { Rect } from './rect';
import { Shape, ShapePoint } from './shape';
import { Strength } from './strngth';
import { TextShape } from './text';

export class MarkUpManager {
  selectedShape: ShapePoint;
  mouseShape: ShapePoint;
  model: ProfileModel;
  footprint: FootPrintComponent;
  shapeArray: Array<Shape>;
  drawingShape: Shape;

  constructor(model, footprint) {
    this.selectedShape = null;
    this.mouseShape = null;
    this.model = model;
    this.footprint = footprint;
    this.shapeArray = new Array();
    this.drawingShape = null;
  }
  selectShape(point) {
    for (let shape of this.shapeArray) {
      let p = shape.selectedPoint(point);
      if (p != null) return p;
    }
    return null;
  }

  shapeFactory(type: string): Shape | null {
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
      default:
        return null;
    }
  }

  updateShapeFromModel() {
    if (this.selectedShape != null) {
      this.selectedShape.shape.getFromModel();
    }
    this.footprint.resize();
  }
  resetEdit() {
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
  deleteCurrent() {
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
  onMouseDown(point) {
    this.selectedShape = this.mouseShape;
    if (this.selectedShape != null) {
   
      this.selectedShape.shape.selectControls();
      this.selectedShape.shape.onStartMovePoint(point);
    } else {
      if (this.model.mode == 'Profile' && this.model.profilePeriod != -1)
        return;
      if (this.model.mode == 'Edit') this.resetEdit();

      this.drawingShape = this.shapeFactory(this.model.mode);
      if (this.drawingShape != null) this.drawingShape.onStartDraw(point);
    }
  }
  onMouseDownMove(point) {
    if (this.selectedShape != null) {
      this.selectedShape.shape.onMovePoint(point);
      this.footprint.resize();
    }
    if (this.drawingShape != null) {
      this.drawingShape.onMouseDownMove(point);
      this.footprint.resize();
    }
  }
  onMouseMove(point) {
    this.mouseShape = this.selectShape(point);

    let c =
      this.mouseShape != null
        ? this.mouseShape.point != null
          ? 'pointer'
          : 'move'
        : 'default';

    this.footprint.canvas.style.cursor =
      this.mouseShape != null
        ? this.mouseShape.point != null
          ? 'pointer'
          : 'move'
        : 'default';
  }
  onMouseUp(point) {
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
  changeMode(m) {
    if (m == 'Edit' && this.model.mode == 'Edit') return;
    
    let s = this.shapeFactory(this.model.mode);
    if (s == null) {
      this.resetEdit();
    } else 
    this.shapeFactory(this.model.mode).setupControls();
    this.selectedShape = null;
    this.model.mode = m;
    this.footprint.resize();
  }
  allowPan() {
    return this.selectedShape == null && this.drawingShape == null;
  }
  drawAll() {
    let pro = new ProfileAuto(this);
    pro.drawShape();
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
}
