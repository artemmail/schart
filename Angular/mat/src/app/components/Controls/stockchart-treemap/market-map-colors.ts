import type { TreeMapColorResolver } from 'stockchart-treemap';
import { blendOverlayWithBase, resolvePanelBackgroundColor } from '../../../utils/color-utils';

export const resolveMarketMapColor: TreeMapColorResolver<{ colorRgba?: string }> = (item, color, host) => {
  const overlay = typeof item.colorRgba === 'string' && item.colorRgba.trim() ? item.colorRgba : color;
  return overlay?.trim()
    ? blendOverlayWithBase(resolvePanelBackgroundColor(host), overlay)
    : color;
};
