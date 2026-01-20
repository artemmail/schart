export type RgbaColor = { r: number; g: number; b: number; a: number };

export function resolveBaseTextColor(doc: Document): string {
  if (!doc?.defaultView) return '#000000';

  const rootStyles = doc.defaultView.getComputedStyle(doc.documentElement);
  const varColor = rootStyles.getPropertyValue('--mat-sys-on-surface').trim();
  if (varColor) return varColor;

  const bodyColor = doc.body ? doc.defaultView.getComputedStyle(doc.body).color : '';
  return bodyColor || '#000000';
}

export function blendOverlayWithBase(
  baseColor: string,
  overlayColor?: string | null
): string {
  if (!overlayColor) return baseColor;

  const overlay = parseCssColor(overlayColor);
  if (!overlay) return overlayColor;

  const base = parseCssColor(baseColor);
  if (!base) return overlayColor;

  const alpha = clamp01(overlay.a);
  if (alpha <= 0) return toRgbString(base);
  if (alpha >= 1) return toRgbString(overlay);

  const r = mixChannel(base.r, overlay.r, alpha);
  const g = mixChannel(base.g, overlay.g, alpha);
  const b = mixChannel(base.b, overlay.b, alpha);

  return `rgb(${r}, ${g}, ${b})`;
}

function parseCssColor(value?: string | null): RgbaColor | null {
  if (!value) return null;
  const input = value.trim();
  if (!input) return null;

  if (input.toLowerCase() === 'transparent') {
    return { r: 0, g: 0, b: 0, a: 0 };
  }

  const rgbaMatch =
    /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*([0-9]*\.?[0-9]+))?\s*\)$/i.exec(
      input
    );
  if (rgbaMatch) {
    return {
      r: clampByte(parseInt(rgbaMatch[1], 10)),
      g: clampByte(parseInt(rgbaMatch[2], 10)),
      b: clampByte(parseInt(rgbaMatch[3], 10)),
      a: rgbaMatch[4] !== undefined ? clamp01(parseFloat(rgbaMatch[4])) : 1,
    };
  }

  if (input[0] === '#') {
    const hex = input.slice(1);
    if (hex.length === 3) {
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      return { r, g, b, a: 1 };
    }
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return { r, g, b, a: 1 };
    }
  }

  return null;
}

function mixChannel(base: number, overlay: number, alpha: number): number {
  return clampByte(Math.round(base + (overlay - base) * alpha));
}

function toRgbString(color: RgbaColor): string {
  return `rgb(${color.r}, ${color.g}, ${color.b})`;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function clampByte(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(255, Math.max(0, value));
}
