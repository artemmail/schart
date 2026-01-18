import { ColorsService } from 'src/app/service/FootPrint/Colors/color.service';
import { Rect } from './rect';
import { hexToRgb, wrapText } from 'src/app/service/FootPrint/utils';
import { MarkUpManager } from './markup-manager';


export class TextShape extends Rect {
  constructor(manager: MarkUpManager, params: Record<string, any>) {
    super(manager, params);
    this.type =  'Text';
  }
  override drawShape() {
    if (this.pointArray.length == 2) {
      let ctx = this.footprint.ctx;
      if (this.sortPoints()) {
        const color = typeof this.params?.color === 'string' ? this.params.color : this.getSelectionColor();
        const font = typeof this.params?.font === 'number' ? this.params.font : 36;
        const text = typeof this.params?.text === 'string' ? this.params.text : '';
        ctx.fillStyle = color; //selectedPoint.element.color;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.font = font + 'px Verdana';
        ctx.lineWidth = 1;
        let p = this.baseToScreen(this.vPoints[3]);
        let p2 = this.baseToScreen(this.vPoints[1]);
        wrapText(ctx, text, p.x, p.y, p2.x - p.x, font + 2);
        if (this.manager.drawingShape == this) this.drawSelection();
      }
    }
  }
  override drawSelection() {
    if (this.sortPoints()) {
      this.footprint.ctx.lineWidth = 0.8;
      const color = typeof this.params?.color === 'string' ? this.params.color : this.getSelectionColor();
      var rgbcolor = hexToRgb(color);
      this.footprint.ctx.strokeStyle = `rgba(${rgbcolor.r},${rgbcolor.g},${rgbcolor.b},0.5)`;
      this.footprint.ctx.setLineDash([5, 3, 5]);
      this.strokeRect();
      this.footprint.ctx.setLineDash([]);
      super.drawSelection();
    }
  }
}

