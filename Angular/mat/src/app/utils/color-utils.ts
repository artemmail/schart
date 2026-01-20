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
  if (!overlayColor) return toHexOrRaw(baseColor);

  const overlay = parseCssColor(overlayColor);
  if (!overlay) return toHexOrRaw(overlayColor);

  const base = parseCssColor(baseColor);
  if (!base) return toHexString(overlay);

  const alpha = clamp01(overlay.a);
  if (alpha <= 0) return toHexString(base);
  if (alpha >= 1) return toHexString(overlay);

  const r = mixChannel(base.r, overlay.r, alpha);
  const g = mixChannel(base.g, overlay.g, alpha);
  const b = mixChannel(base.b, overlay.b, alpha);

  return toHexString({ r, g, b, a: 1 });
}

export function resolvePanelBackgroundColor(element: HTMLElement | null): string {
  const fallback = '#ffffff';
  if (!element?.ownerDocument?.defaultView) return fallback;

  const view = element.ownerDocument.defaultView;
  let current: HTMLElement | null = element;

  while (current) {
    const bg = view.getComputedStyle(current).backgroundColor;
    if (bg && !isTransparentColor(bg)) {
      return bg;
    }
    current = current.parentElement;
  }

  const doc = element.ownerDocument;
  if (doc.body) {
    const bodyBg = view.getComputedStyle(doc.body).backgroundColor;
    if (bodyBg && !isTransparentColor(bodyBg)) return bodyBg;
  }

  const rootStyles = view.getComputedStyle(doc.documentElement);
  const surface =
    rootStyles.getPropertyValue('--mat-sys-surface').trim() ||
    rootStyles.getPropertyValue('--mat-sys-surface-container').trim() ||
    rootStyles.getPropertyValue('--mat-sys-surface-container-low').trim();
  if (surface) return surface;

  return fallback;
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

function isTransparentColor(value: string): boolean {
  const parsed = parseCssColor(value);
  if (!parsed) return false;
  return parsed.a <= 0;
}

function mixChannel(base: number, overlay: number, alpha: number): number {
  return clampByte(Math.round(base + (overlay - base) * alpha));
}

function toHexOrRaw(value: string): string {
  const parsed = parseCssColor(value);
  return parsed ? toHexString(parsed) : value;
}

function toHexString(color: RgbaColor): string {
  return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
}

function toHex(value: number): string {
  const hex = clampByte(Math.round(value)).toString(16).toUpperCase();
  return hex.length === 1 ? `0${hex}` : hex;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function clampByte(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(255, Math.max(0, value));
}
