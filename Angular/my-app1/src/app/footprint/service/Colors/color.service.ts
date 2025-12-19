import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ColorsService {
  public static Black: string = '#000000';
  public static lineColor: string = '#888';
  public static greencandleA: string = 'rgba(107, 165, 131, 0.6)';
  public static greencandlesatA: string = 'rgba(4, 163, 68, 0.6)';
  public static redcandleA: string = 'rgba(215, 84, 66, 0.6)';
  public static redcandlesatA: string = 'rgba(214, 24, 0, 0.6)';
  public static greencandleAA: string = 'rgba(107, 165, 131, 0.25)';
  public static redcandleAA: string = 'rgba(215, 84, 66, 0.15)';
  public static greenCandleBorder: string = '#225437';
  public static redCandleBorder: string = '#5b1a13';
  public static greencandle: string = '#6ba583';
  public static greencandlesat: string = '#04a344';
  public static redcandle: string = '#d75442';
  public static redcandlesat: string = '#d61800';
  public static WhiteText = '#000000';
  public static WhiteGradient = 'rgba(255,255,255,0.65)';
  public static RedText = '#a02000';
  public static Gray1 = 'WhiteSmoke';
  public static Gray2 = 'white';
  public static Gray3 = '#a0a';
  public static Gray4 = '#404040';
  public static Color1 = 'LightSteelBlue';
  public static Color2 = 'LightYellow';
  public static GradientWidth = 30;
  public static maxColWidth = 15;
  public static ScrollWidth = 8;

  public mode = 'Edit';

  public getGradientColor(
    start_color: string,
    end_color: string,
    percent: number
  ): string {
    // strip the leading # if it's there
    start_color = start_color.replace(/^\s*#|\s*$/g, '');
    end_color = end_color.replace(/^\s*#|\s*$/g, '');
    // convert 3 char codes --> 6, e.g. `E0F` --> `EE00FF`
    if (start_color.length == 3) {
      start_color = start_color.replace(/(.)/g, '$1$1');
    }
    if (end_color.length == 3) {
      end_color = end_color.replace(/(.)/g, '$1$1');
    }
    // get colors
    var start_red = parseInt(start_color.substr(0, 2), 16),
      start_green = parseInt(start_color.substr(2, 2), 16),
      start_blue = parseInt(start_color.substr(4, 2), 16);
    var end_red = parseInt(end_color.substr(0, 2), 16),
      end_green = parseInt(end_color.substr(2, 2), 16),
      end_blue = parseInt(end_color.substr(4, 2), 16);
    // calculate new color
    var diff_red = end_red - start_red;
    var diff_green = end_green - start_green;
    var diff_blue = end_blue - start_blue;
    var diff_red1 = (diff_red * percent + start_red).toString(16).split('.')[0];
    var diff_green1 = (diff_green * percent + start_green)
      .toString(16)
      .split('.')[0];
    var diff_blue1 = (diff_blue * percent + start_blue)
      .toString(16)
      .split('.')[0];
    // ensure 2 digits by color
    if (diff_red1.length == 1) diff_red1 = '0' + diff_red;
    if (diff_green1.length == 1) diff_green1 = '0' + diff_green;
    if (diff_blue1.length == 1) diff_blue1 = '0' + diff_blue;
    return '#' + diff_red1 + diff_green1 + diff_blue1;
  }
  public getGradientColorEx(
    start_color: string,
    mid_color: string,
    end_color: string,
    maxvalue: number,
    value: number
  ): string {
    if (value < 0)
      return this.getGradientColor(mid_color, start_color, -value / maxvalue);
    else return this.getGradientColor(mid_color, end_color, value / maxvalue);
  }

  public hexToRgb(hex: string) {
    // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
    var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, function (m, r, g, b) {
      return r + r + g + g + b + b;
    });
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 0, g: 0, b: 0 };
  }

  public maxFontSize(): number {
    return 14 * this.scale();
  }

  public sscale(): number {
    return 1;
  }

  public scale(): number {
    return 1;
  }

  public isMobile2() {
    return true;
    var a = navigator.userAgent || navigator.vendor;
    if (
      /android.+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od|ad)|iris|kindle|lge |maemo|midp|mmp|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(
        a
      ) ||
      /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(di|rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(
        a.substr(0, 4)
      )
    ) {
      return true;
    }
    return false;
  }

  public LegendPriceWidth(): number {
    return 110 * this.sscale();
  }
  public LegendDateHeight(): number {
    return 40 * this.sscale();
  }

  static CanvasExt() {
    let str = `CanvasRenderingContext2D.prototype.setMatrix = function (mtx) { 
      this.mtx = mtx;
  };
  
  CanvasRenderingContext2D.prototype.mStorkeRect = function (x1,y1,x2,y2) {
      var p1 = this.mtx.applyToPoint(x1, y1);
      var p2 = this.mtx.applyToPoint(x2, y2);
      this.myStrokeRect(p1.x, p1.y, p2.x - p1.x, p2.y - p1.y);
  };
  
  CanvasRenderingContext2D.prototype.mFillRect = function (x1, y1, x2, y2) { 
      var p1 = this.mtx.applyToPoint(x1, y1);
      var p2 = this.mtx.applyToPoint(x2, y2);
      this.myFillRect({x: p1.x,y: p1.y,w: p2.x - p1.x,h: p2.y - p1.y });
  };
  
  CanvasRenderingContext2D.prototype.mFillRectangle = function (x1, y1, w, h) {
      this.mFillRect(x1, y1, x1 + w, y1 + h);
  };
  
  
  CanvasRenderingContext2D.prototype.ArrowHead = function (x1, y1, x2, y2, h, w) {
      var v = { x: x2 - x1, y: y2 - y1 };
      var len = Math.sqrt(v.x * v.x + v.y * v.y);
      if (len == 0)
          return;
      var norm = { x: v.x / len, y: v.y / len };
      var c = { x: x2 - norm.x * h, y: y2 - norm.y * h };
      var l = { x: c.x + norm.y * w, y: c.y - norm.x * w };
      var r = { x: c.x - norm.y * w, y: c.y + norm.x * w };
      this.moveTo(l.x, l.y);
      this.lineTo(x2, y2);
      this.lineTo(r.x, r.y);
  };
  CanvasRenderingContext2D.prototype.myStrokeRect = function (r) {
      var dw = Math.round(Math.round(r.w + r.x) - Math.round(r.x) - Math.round(r.w));
      var dh = Math.round(Math.round(r.h + r.y) - Math.round(r.y) - Math.round(r.h));
      this.strokeRect(Math.round(r.x) + 0.5, Math.round(r.y) + 0.5, Math.round(r.w) + dw, Math.round(r.h) + dh);
  };
  CanvasRenderingContext2D.prototype.myFillRect = function (r) {
      var dw = Math.round(Math.round(r.w + r.x) - Math.round(r.x) - Math.round(r.w));
      var dh = Math.round(Math.round(r.h + r.y) - Math.round(r.y) - Math.round(r.h));
      this.fillRect(Math.round(r.x), Math.round(r.y), Math.round(r.w) + dw, Math.round(r.h) + dh);
  };
  CanvasRenderingContext2D.prototype.myFillRectSmoothX = function (r) {
      //var dw = Math.round(Math.round(r.w + r.x) - Math.round(r.x) - Math.round(r.w));
      var dh = Math.round(Math.round(r.h + r.y) - Math.round(r.y) - Math.round(r.h));
      this.fillRect(Math.round(r.x), Math.round(r.y), r.w, Math.round(r.h) + dh);
  };
  CanvasRenderingContext2D.prototype.myStrokeRectXY = function (p1, p2) {
      this.myStrokeRect({ x: p1.x, y: p1.y, w: p2.x - p1.x, h: p2.y - p1.y });
  }
  CanvasRenderingContext2D.prototype.myFillRectXY = function (p1, p2) {
      this.myFillRect({ x: p1.x, y: p1.y, w: p2.x - p1.x, h: p2.y - p1.y });
  }
  CanvasRenderingContext2D.prototype.myRectXY = function (p1, p2) {
      this.myRect({ x: p1.x, y: p1.y, w: p2.x - p1.x, h: p2.y - p1.y });
  }
  CanvasRenderingContext2D.prototype.myMoveTo = function (x, y) { this.moveTo(Math.round(x) + 0.5, Math.round(y) + 0.5); };
  CanvasRenderingContext2D.prototype.myLineTo = function (x, y) { this.lineTo(Math.round(x) + 0.5, Math.round(y) + 0.5); };
  CanvasRenderingContext2D.prototype.myLine = function (x1, y1, x2, y2) { this.myMoveTo(x1, y1); this.myLineTo(x2, y2); };
  CanvasRenderingContext2D.prototype.myFillRectSmooth = function (r) { this.fillRect(r.x, r.y, r.w, r.h); };
  CanvasRenderingContext2D.prototype.myRect = function (r) {
      var dw = Math.round(Math.round(r.w + r.x) - Math.round(r.x) - Math.round(r.w));
      var dh = Math.round(Math.round(r.h + r.y) - Math.round(r.y) - Math.round(r.h));
      this.rect(Math.round(r.x) + 0.5, Math.round(r.y) + 0.5, Math.round(r.w) + dw, Math.round(r.h) + dh);
  };
`;
eval(str);
  }

  constructor() {}
}
