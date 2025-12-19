// color-utils.ts

  
  export function defined(value: any): boolean {
    return typeof value !== 'undefined';
  }
  
  export function colorsByLength(min: string, max: string, length: number): string[] {
    const minRGBtoDecimal = rgbToDecimal(min);
    const maxRGBtoDecimal = rgbToDecimal(max);
    const isDarker = colorBrightness(min) - colorBrightness(max) < 0;
    const colors = [min];
  
    for (let i = 0; i < length; i++) {
      const rgbColor = {
        r: colorByIndex(minRGBtoDecimal.r, maxRGBtoDecimal.r, i, length, isDarker),
        g: colorByIndex(minRGBtoDecimal.g, maxRGBtoDecimal.g, i, length, isDarker),
        b: colorByIndex(minRGBtoDecimal.b, maxRGBtoDecimal.b, i, length, isDarker)
      };
      colors.push(buildColorFromRGB(rgbColor));
    }
  
    colors.push(max);
    return colors;
  }
  
  export function colorByIndex(min: number, max: number, index: number, length: number, isDarker: boolean): number {
    const minColor = Math.min(Math.abs(min), Math.abs(max));
    const maxColor = Math.max(Math.abs(min), Math.abs(max));
    const step = (maxColor - minColor) / (length + 1);
    const currentStep = step * (index + 1);
    return isDarker ? minColor + currentStep : maxColor - currentStep;
  }
  
  export function buildColorFromRGB(color: { r: number; g: number; b: number }): string {
    return `#${decimalToRgb(color.r)}${decimalToRgb(color.g)}${decimalToRgb(color.b)}`;
  }
  
  export function rgbToDecimal(color: string): { r: number; g: number; b: number } {
    color = color.replace("#", "");
    const rgbColor = colorToRGB(color);
  
    return {
      r: rgbToHex(rgbColor.r),
      g: rgbToHex(rgbColor.g),
      b: rgbToHex(rgbColor.b)
    };
  }
  
  export function decimalToRgb(number: number): string {
    const result = Math.round(number).toString(16).toUpperCase();
    return result.length === 1 ? `0${result}` : result;
  }
  
  export function colorToRGB(color: string): { r: string; g: string; b: string } {
    const colorLength = color.length;
    return colorLength === 3
      ? { r: color[0], g: color[1], b: color[2] }
      : { r: color.substring(0, 2), g: color.substring(2, 4), b: color.substring(4, 6) };
  }
  
  export function rgbToHex(rgb: string): number {
    return parseInt(rgb, 16);
  }
  
  export function colorBrightness(color: string): number {
    if (!color) {
      return 0;
    }
  
    const { r, g, b } = rgbToDecimal(color);
    return Math.sqrt(0.241 * r * r + 0.691 * g * g + 0.068 * b * b);
  }
  
  export function round(value: number): number {
    const power = Math.pow(10, 4);
    return Math.round(value * power) / power;
  }
  