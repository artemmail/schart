import { ColorsService } from 'src/app/service/FootPrint/Colors/color.service';
import { Rect } from './rect';
import { hexToRgb, wrapText } from 'src/app/service/FootPrint/utils';
import { MarkUpManager } from './markup-manager';


export class TextShape extends Rect {
  font: any;
  text: any;

  constructor(manager: MarkUpManager) {
    super(manager);
    this.type =  'Text';
    this.controlMap = {
      color: true,
      width: false,
      font: true,
      id: false,
      text: true,
      arrow: false,
      toolbar: false,
      profile: false,
    };
    this.getFromModel();
  }
  override getFromModel() {
    this.color = this.model.color;
    this.font = this.model.font;
    this.text = this.model.text;
  }
  override setToModel() {
    this.model.color = this.color;
    this.model.font= this.font;
    this.model.text= this.text;
  }
  override drawShape() {
    if (this.pointArray.length == 2) {
      let ctx = this.footprint.ctx;
      if (this.sortPoints()) {
        ctx.fillStyle = this.color; //selectedPoint.element.color;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.font = this.font + 'px Verdana';
        ctx.lineWidth = 1;
        let p = this.baseToScreen(this.vPoints[3]);
        let p2 = this.baseToScreen(this.vPoints[1]);
        wrapText(ctx, this.text, p.x, p.y, p2.x - p.x, this.font + 2);
        if (this.manager.drawingShape == this) this.drawSelection();
      }
    }
  }
  override drawSelection() {
    if (this.sortPoints()) {
      this.footprint.ctx.lineWidth = 0.8;
      var rgbcolor = hexToRgb(this.color);
      this.footprint.ctx.strokeStyle = `rgba(${rgbcolor.r},${rgbcolor.g},${rgbcolor.b},0.5)`;
      this.footprint.ctx.setLineDash([5, 3, 5]);
      this.strokeRect();
      this.footprint.ctx.setLineDash([]);
      super.drawSelection();
    }
  }
}

