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
  const rgbMatch = /^rgba?\((\d+),\s*(\d+),\s*(\d+)/i.exec(hex);
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1], 10),
      g: parseInt(rgbMatch[2], 10),
      b: parseInt(rgbMatch[3], 10),
    };
  }
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
  const lines = String(text ?? '').split(/\r?\n/);
  let cursorY = y;

  for (let i = 0; i < lines.length; i++) {
    const lineText = lines[i];
    if (lineText === '') {
      cursorY += lineHeight;
      continue;
    }

    const words = lineText.split(' ');
    let line = '';
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = context.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && line.length > 0) {
        context.fillText(line, x, cursorY);
        line = words[n] + ' ';
        cursorY += lineHeight;
      } else {
        line = testLine;
      }
    }
    if (line.length > 0) {
      context.fillText(line, x, cursorY);
    }
    if (i < lines.length - 1) {
      cursorY += lineHeight;
    }
  }
}

export function MoscowTimeShift(date) {
  return new Date(date);
}

export function inttodate(i: number) {
  return new Date(i * 1000);
}
