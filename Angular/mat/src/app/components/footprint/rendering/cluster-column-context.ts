import type { ClusterColumnContext } from '../columns/cluster-column-base';
import type { ChartViewContext } from '../models/chart-runtime-context';

type ClusterColumnSource = Pick<ChartViewContext, 'data' | 'ctx' | 'colorsService' | 'formatService' | 'palette' | 'clusterWidthScale' | 'FPsettings'> & { startPrice: number; finishPrice: number };

export function createClusterColumnContext(
  parent: ClusterColumnSource
): ClusterColumnContext {
  if (!parent.data || !parent.ctx) {
    throw new Error('Cluster context is not initialized');
  }

  return {
    data: parent.data,
    colorsService: parent.colorsService,
    formatService: parent.formatService,
    palette: parent.palette,
    ctx: parent.ctx,
    startPrice: parent.startPrice,
    finishPrice: parent.finishPrice,
    clusterWidthScale: parent.clusterWidthScale,
    settings: parent.FPsettings,
    stats: parent.data.getRenderStats(!!parent.FPsettings?.ShrinkY),
  };
}

