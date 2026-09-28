export interface DisposableCanvasPart {
  readonly constructor: Function;
  view: any;
  mtx: any;
  readonly panelId?: string;
  dispose(): void;
}

/** Keep gesture/animation owners alive while their geometry changes each frame. */
export function reconcileCanvasParts<T extends DisposableCanvasPart>(previous: T[], next: T[]): Map<T, T> {
  const remaining = new Set(previous);
  const replacements = new Map<T, T>();
  for (const candidate of next) {
    const existing = Array.from(remaining).find(part =>
      part.constructor === candidate.constructor && part.panelId === candidate.panelId);
    if (!existing) continue;
    remaining.delete(existing);
    existing.view = candidate.view;
    existing.mtx = candidate.mtx;
    replacements.set(candidate, existing);
    if (candidate !== existing) candidate.dispose();
  }
  for (const removed of remaining) removed.dispose();
  return replacements;
}
