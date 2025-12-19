export function drob1(v: number, sh: number = 2): number {
  if (v === 0) return 0;
  
  let factor = Math.pow(10, sh);
  return Math.round(v * factor) / factor;
}

export function drob(v: number, shw: number  = 4): number {
  if (v === 0) return 0;
  
  // Вычисляем количество знаков после запятой
  let sh = Math.max(0, shw - Math.floor(Math.log10(Math.abs(v))));
  
  // Округляем число до нужного количества знаков
  let factor = Math.pow(10, sh);
  return Math.round(v * factor) / factor;
}

export function  MoneyToStr(mon: number): string {
  var mona = Math.abs(mon);
  let t = ~~(Math.log10(mona) / 3);
  if (t > 1)
    return (
      drob(mon / Math.pow(10, t * 3), 2) +
      ' ' +
      ['тыс', 'млн', 'мрд', 'трл', 'блн', 'хул', '*', '*'][t - 1]
    );
  return drob(mon, 3).toString();
}

export function hexToRgb(hex: string) {
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

export function wrapText(context, text, x, y, maxWidth, lineHeight) {
  var words = text.split(' ');
  var line = '';
  for (var n = 0; n < words.length; n++) {
    var testLine = line + words[n] + ' ';
    var metrics = context.measureText(testLine);
    var testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      context.fillText(line, x, y);
      line = words[n] + ' ';
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  context.fillText(line, x, y);
}

export function MoscowTimeShift(date) {
  var x = new Date();
  var currentTime = (3 * 60 + x.getTimezoneOffset()) * 60 * 1000;
  return new Date(date.getTime() + currentTime);
}

export function inttodate(i: number) {
  return new Date(i * 1000);
}
