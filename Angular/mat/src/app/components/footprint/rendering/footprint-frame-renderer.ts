import type { ClusterData } from '../models/cluster-data';
import type { ChartSettings } from 'src/app/models/ChartSettings';
import type { FootPrintParameters } from 'src/app/models/Params';
import type { Matrix, Rectangle } from '../models/matrix';
import type { FootprintIndicatorEngine } from '../indicators/indicator-engine';
import type { FootprintRenderFlags } from '../services/footprint-render-scheduler';
import type { FootprintLayoutDto } from '../services/footprint-layout.service';

export interface FrameViewport {
  mtx: Matrix;
  readonly clusterView: Rectangle;
  readonly layout: FootprintLayoutDto | null;
  alignCanvas(): void;
  updateLayout(): void;
  resizeNow(): void;
  renderNow(): void;
}
export interface FrameContext {
  readonly ready: boolean;
  readonly data: ClusterData | null;
  readonly params: FootPrintParameters | null;
  readonly settings: ChartSettings;
  readonly translateMatrix: Matrix | null;
  readonly viewport: FrameViewport;
  readonly indicators: Pick<FootprintIndicatorEngine, 'prepare' | 'requestFullRecalc'>;
  initialMatrix(view: Rectangle, data: ClusterData): Matrix;
  alignMatrix(matrix: Matrix): Matrix;
  updateVisibleRange(matrix: Matrix): void;
}

/** Frame/layout/viewport orchestration has no Angular lifecycle or component dependency. */
export class FootprintFrameRenderer {
  constructor(private context: FrameContext) {}

  render(flags: FootprintRenderFlags): void {
    const host = this.context;
    if (!host.ready || !host.data || !host.params) return;
    if (flags.recalculate) host.indicators.requestFullRecalc();
    host.indicators.prepare();
    if (flags.resize && !flags.initialize) host.viewport.resizeNow();
    if (flags.initialize) {
      host.viewport.alignCanvas();
      host.viewport.updateLayout();
      if (host.viewport.layout) {
        host.viewport.mtx = host.alignMatrix(host.initialMatrix(host.viewport.clusterView, host.data));
      }
    }
    if (flags.realtime && !flags.initialize) {
      this.followLatestBar();
      this.adjustPriceRange();
    }
    host.viewport.renderNow();
  }

  private followLatestBar(): void {
    const { data, viewport } = this.context;
    if (!data) return;
    const view = viewport.clusterView;
    if (data.clusterLength() < 12) {
      viewport.mtx = viewport.mtx.reassignX({ x1: 0, x2: data.clusterLength() }, { x1: view.x, x2: view.x + view.w });
    } else {
      const end = viewport.mtx.applyToPoint(data.clusterLength(), 0).x;
      viewport.mtx = viewport.mtx.getTranslate(view.x + view.w - end, 0);
    }
  }

  private adjustPriceRange(): void {
    const host = this.context;
    const data = host.data;
    if (!data || !host.settings.ShrinkY || host.translateMatrix) return;
    const view = host.viewport.clusterView;
    if (!view || view.w <= 0 || view.h <= 0) return;
    const matrix = host.viewport.mtx;
    host.updateVisibleRange(matrix);
    const local = data.getRenderStats(true);
    if (!Number.isFinite(local.maxPrice) || !Number.isFinite(local.minPrice)) return;
    const top = matrix.Height2Price(view.y), bottom = matrix.Height2Price(view.y + view.h);
    if (!Number.isFinite(top) || !Number.isFinite(bottom)) return;
    const scale = Number.isFinite(data.priceScale) && data.priceScale > 0 ? data.priceScale : 1e-6;
    const delta = Math.max(Math.abs(local.maxPrice - local.minPrice) / 10, scale);
    if (local.minPrice - delta < Math.min(top, bottom) || local.maxPrice + delta > Math.max(top, bottom)) {
      host.viewport.mtx = matrix.reassignY(
        { y1: local.maxPrice + delta, y2: local.minPrice - delta },
        { y1: view.y, y2: view.y + view.h });
    }
  }
}
