/** CSS size and backing-store size have one owner; unchanged writes never reset the context. */
export function applyCanvasSize(canvas: HTMLCanvasElement, width: number, height: number, dpr: number): boolean {
  const ratio = Number.isFinite(dpr) && dpr > 0 ? dpr : 1;
  const cssWidth = Number.isFinite(width) ? Math.max(0, width) : 0;
  const cssHeight = Number.isFinite(height) ? Math.max(0, height) : 0;
  const pixelWidth = Math.round(cssWidth * ratio);
  const pixelHeight = Math.round(cssHeight * ratio);
  const changed = canvas.width !== pixelWidth || canvas.height !== pixelHeight;
  if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
  if (canvas.height !== pixelHeight) canvas.height = pixelHeight;
  const w = `${cssWidth}px`, h = `${cssHeight}px`;
  if (canvas.style.width !== w) canvas.style.width = w;
  if (canvas.style.height !== h) canvas.style.height = h;
  return changed;
}
