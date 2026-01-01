import { TreeNode } from './tree-map.models';

const UNDEFINED = 'undefined';

export function getField(path: string, row: any): any {
  if (row === null || row === undefined) return row;
  const parts = String(path ?? '').split('.').filter(Boolean);
  let cur = row;
  for (const p of parts) {
    if (cur === null || cur === undefined) return undefined;
    cur = cur[p];
  }
  return cur;
}

export function defined(value: any): boolean {
  return typeof value !== UNDEFINED;
}

export function toNumber(v: any): number {
  if (v === null || v === undefined) return 0;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

export function totalAreaOf(items: TreeNode[]): number {
  let total = 0;
  for (let i = 0; i < items.length; i++) total += (items[i].area ?? 0);
  return total;
}

export function round(value: number): number {
  const power = Math.pow(10, 4);
  return Math.round(value * power) / power;
}

export function roundN(value: number, decimals: number): number {
  const power = Math.pow(10, decimals);
  return Math.round(value * power) / power;
}

export function colorsByLength(min: string, max: string, length: number): string[] {
  const minRGBtoDecimal = rgbToDecimal(min);
  const maxRGBtoDecimal = rgbToDecimal(max);
  const isDarker = colorBrightness(min) - colorBrightness(max) < 0;
  const colors: string[] = [];

  colors.push(min);

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

function colorByIndex(min: number, max: number, index: number, length: number, isDarker: boolean): number {
  const minColor = Math.min(Math.abs(min), Math.abs(max));
  const maxColor = Math.max(Math.abs(min), Math.abs(max));
  const step = (maxColor - minColor) / (length + 1);
  const currentStep = step * (index + 1);

  return isDarker ? (minColor + currentStep) : (maxColor - currentStep);
}

function buildColorFromRGB(color: { r: number; g: number; b: number }): string {
  return '#' + decimalToRgb(color.r) + decimalToRgb(color.g) + decimalToRgb(color.b);
}

function rgbToDecimal(color: string): { r: number; g: number; b: number } {
  color = color.replace('#', '');
  const rgbColor = colorToRGB(color);

  return {
    r: rgbToHex(rgbColor.r),
    g: rgbToHex(rgbColor.g),
    b: rgbToHex(rgbColor.b)
  };
}

function decimalToRgb(number: number): string {
  let result = Math.round(number).toString(16).toUpperCase();
  if (result.length === 1) result = '0' + result;
  return result;
}

function colorToRGB(color: string): { r: string; g: string; b: string } {
  const colorLength = color.length;
  const rgbColor: any = {};
  if (colorLength === 3) {
    rgbColor.r = color[0];
    rgbColor.g = color[1];
    rgbColor.b = color[2];
  } else {
    rgbColor.r = color.substring(0, 2);
    rgbColor.g = color.substring(2, 4);
    rgbColor.b = color.substring(4, 6);
  }
  return rgbColor;
}

function rgbToHex(rgb: string): number {
  return parseInt((rgb as any).toString(16), 16);
}

export function colorBrightness(color?: string): number {
  let brightness = 0;
  if (color) {
    const c = rgbToDecimal(color);
    brightness = Math.sqrt(0.241 * c.r * c.r + 0.691 * c.g * c.g + 0.068 * c.b * c.b);
  }
  return brightness;
}
