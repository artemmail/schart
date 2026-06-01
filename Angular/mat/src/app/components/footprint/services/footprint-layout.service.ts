import { Injectable } from '@angular/core';
import { Rectangle } from 'src/app/models/Rectangle';
import { ChartSettings } from 'src/app/models/ChartSettings';
import { getVolumeHeightDefaults, normalizeVolumeHeights } from 'src/app/models/volume-heights';
import { ColorsService } from 'src/app/service/FootPrint/Colors/color.service';
import { FootPrintParameters } from 'src/app/models/Params';
import { Matrix } from '../models/matrix';
import { ClusterData } from '../models/cluster-data';

export interface FootprintLayoutDto {
  clusterPricesView: Rectangle;
  clusterView: Rectangle;
  clusterDatesView: Rectangle;
  clusterHeadView: Rectangle;
  clusterMiniHeadView: Rectangle;
  clusterAnimArea: Rectangle;
  clusterVolumesView: Rectangle;
  clusterOIView: Rectangle;
  clusterOIDeltaView: Rectangle;
  clusterDeltaView: Rectangle;
  clusterDeltaBarsView: Rectangle;
  clusterTotalView: Rectangle;
  clusterTotalViewFill: Rectangle;
  indicatorPanels: Array<{ id: string; view: Rectangle }>;
}

export interface FootprintMatricesDto {
  mtxMain: Matrix;
  mtxtotal: Matrix;
  mtxprice: Matrix;
  mtxhead: Matrix;
  mtxanim: Matrix;
}

interface LayoutOptions {
  canvasWidth: number;
  canvasHeight: number;
  deltaVolumes: ReadonlyArray<number>;
  minimode: boolean;
  topLinesCount: number;
  settings: ChartSettings;
  data: ClusterData;
  indicatorPanels?: ReadonlyArray<{ id: string; height: number }>;
}

@Injectable({ providedIn: 'root' })
export class FootprintLayoutService {
  constructor(private colorsService: ColorsService) {}

  private clampIndex(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  private getVisibleRange(
    matrix: Matrix,
    view: Rectangle,
    data: ClusterData
  ): { from: number; to: number } | null {
    const length = data.clusterData.length;
    if (length <= 0 || view.w <= 0) {
      return null;
    }

    let leftX = Number.NaN;
    let rightX = Number.NaN;
    try {
      const inverse = matrix.inverse();
      leftX = inverse.applyToPoint(view.x, 0).x;
      rightX = inverse.applyToPoint(view.x + view.w, 0).x;
    } catch {
      return null;
    }

    if (!Number.isFinite(leftX) || !Number.isFinite(rightX)) {
      return null;
    }

    const minX = Math.min(leftX, rightX);
    const maxX = Math.max(leftX, rightX);
    const from = this.clampIndex(Math.floor(minX) - 1, 0, length - 1);
    const to = this.clampIndex(Math.ceil(maxX) + 1, 0, length - 1);

    return { from, to };
  }

  private getPaddedPriceRange(
    maxPrice: number,
    minPrice: number,
    scale: number
  ): { y1: number; y2: number } | null {
    if (!Number.isFinite(maxPrice) || !Number.isFinite(minPrice)) {
      return null;
    }

    const hi = Math.max(maxPrice, minPrice);
    const lo = Math.min(maxPrice, minPrice);
    const normalizedScale = Number.isFinite(scale) && scale > 0 ? scale : 1e-6;
    const range = hi - lo;
    const pad = Number.isFinite(range)
      ? Math.max(Math.abs(range) / 10, normalizedScale)
      : normalizedScale;

    return {
      y1: hi + pad,
      y2: lo - pad,
    };
  }

  calculateLayout(options: LayoutOptions): FootprintLayoutDto {
    const { canvasWidth, canvasHeight, deltaVolumes, minimode, settings, data } = options;
    let { topLinesCount } = options;
    const indicatorPanels = options.indicatorPanels ?? [];

    const newTotal = settings.totalMode === 'Under' || !data.ableCluster();
    const hiddenTotal = settings.totalMode === 'Hidden' && data.ableCluster();
    const volumeHeights = normalizeVolumeHeights(
      settings.VolumesHeight,
      getVolumeHeightDefaults(!!settings.CandlesOnly)
    );
    const totalLen = hiddenTotal ? 0 : volumeHeights.Total;

    let graphTopSpace = settings.Head ? topLinesCount * 20 * this.colorsService.sscale() : 0;
    const miniHeadTop = 25;

    if (minimode) {
      graphTopSpace = miniHeadTop;
      topLinesCount = 0;
    }

    // heights of "bottom stack" blocks (outside the main clusterView)
    const volumesHeight = [
      deltaVolumes[0], // SeparateVolume block
      deltaVolumes[1], // OI
      deltaVolumes[2], // Delta
      deltaVolumes[3], // OIDelta
      deltaVolumes[5], // DeltaBars
    ];

    if (settings.SeparateVolume) {
      volumesHeight[0] += volumeHeights.SeparateVolume;
    }

    if (data.ableOI() && settings.OI) {
      volumesHeight[1] += volumeHeights.OI;
    }

    if (settings.Delta) {
      volumesHeight[2] += volumeHeights.Delta;
    }

    if (settings.DeltaBars) {
      volumesHeight[4] += volumeHeights.DeltaBars;
    }

    if (data.ableOI() && settings.OIDelta) {
      volumesHeight[3] += volumeHeights.OIDelta;
    }

    let totalVerticalHeight =
      volumesHeight[0] + volumesHeight[1] + volumesHeight[2] + volumesHeight[3] + volumesHeight[4];
    let indicatorPanelHeights = indicatorPanels.map((p) => ({
      id: p.id,
      height: Math.max(0, Math.floor(p?.height ?? 0)),
    }));
    let indicatorPanelsHeight = indicatorPanelHeights.reduce((sum, p) => sum + p.height, 0);
    let totalBottomHeight = totalVerticalHeight + indicatorPanelsHeight;
    const dateHeight = this.colorsService.LegendDateHeight(minimode);
    const availableBelowHeader = Math.max(0, canvasHeight - graphTopSpace - dateHeight);
    const minClusterHeight = minimode
      ? 0
      : Math.min(
          availableBelowHeader,
          Math.max(80, Math.round(120 * this.colorsService.sscale()))
        );
    const maxBottomHeight = Math.max(0, availableBelowHeader - minClusterHeight);
    if (totalBottomHeight > maxBottomHeight && totalBottomHeight > 0) {
      const scale = maxBottomHeight / totalBottomHeight;
      for (let i = 0; i < volumesHeight.length; i++) {
        volumesHeight[i] = Math.max(0, Math.floor(volumesHeight[i] * scale));
      }
      indicatorPanelHeights = indicatorPanelHeights.map((p) => ({
        ...p,
        height: Math.max(0, Math.floor(p.height * scale)),
      }));
      totalVerticalHeight =
        volumesHeight[0] + volumesHeight[1] + volumesHeight[2] + volumesHeight[3] + volumesHeight[4];
      indicatorPanelsHeight = indicatorPanelHeights.reduce((sum, p) => sum + p.height, 0);
      totalBottomHeight = totalVerticalHeight + indicatorPanelsHeight;
    }

    const clusterView: Rectangle = new Rectangle(
      totalLen + deltaVolumes[4],
      graphTopSpace,
      canvasWidth - this.colorsService.LegendPriceWidth(minimode) - totalLen - deltaVolumes[4],
      Math.max(0, canvasHeight - dateHeight - graphTopSpace - totalBottomHeight)
    );

    if (newTotal) {
      clusterView.x = 0;
      clusterView.w = canvasWidth - this.colorsService.LegendPriceWidth(minimode);
    }

    // safeguard: avoid negative height turning into weird overlays
    const graphValuesHeight = Math.max(0, clusterView.h / 7);

    const clusterHeadView: Rectangle = {
      x: totalLen + deltaVolumes[4],
      y: 0,
      w: clusterView.w,
      h: graphTopSpace,
    };

    const clusterMiniHeadView: Rectangle = {
      x: 0,
      y: 0,
      w: clusterView.w,
      h: graphTopSpace,
    };

    if (newTotal) {
      clusterHeadView.x = 0;
    }

    // volume strip inside the main cluster (always there)
    const clusterVolumesView: Rectangle = {
      ...clusterView,
      y: clusterView.y + clusterView.h - graphValuesHeight,
      h: graphValuesHeight,
    };

    const clusterTotalView: Rectangle = {
      x: 0,
      y: graphTopSpace,
      w: totalLen + deltaVolumes[4] - ColorsService.ScrollWidth,
      h: clusterView.h,
    };

    const clusterTotalViewFill: Rectangle = {
      x: 0,
      y: graphTopSpace,
      w: totalLen + deltaVolumes[4],
      h: clusterView.h,
    };

    const clusterPricesView: Rectangle = {
      x: clusterView.w + clusterView.x,
      w: canvasWidth - (clusterView.w + clusterView.x),
      y: clusterTotalView.y,
      h: clusterTotalView.h,
    };

    // dates axis (directly under clusterView), then the bottom stack begins under it
    const clusterDatesView: Rectangle = {
      x: clusterView.x,
      w: clusterView.w,
      y: clusterView.y + clusterView.h,
      h: canvasHeight - (clusterView.y + clusterView.h) - totalBottomHeight,
    };

    if (minimode) clusterDatesView.h = 0;

    const clusterAnimArea: Rectangle = {
      x: clusterHeadView.w + clusterHeadView.x,
      y: clusterHeadView.y,
      h: clusterHeadView.h,
      w: clusterPricesView.w,
    };

    /**
     * FIX: build the bottom stack ALWAYS starting AFTER clusterDatesView
     * (previously SeparateVolume/Delta could start at clusterView bottom and overlay dates view).
     */
    const bottomStartY = clusterDatesView.y + clusterDatesView.h;

    const clusterVolumesSeparatedView: Rectangle = settings.SeparateVolume
      ? {
          x: clusterView.x,
          y: bottomStartY,
          w: clusterView.w,
          h: volumesHeight[0],
        }
      : clusterVolumesView;

    let yCursor = bottomStartY + (settings.SeparateVolume ? volumesHeight[0] : 0);

    const clusterOIView: Rectangle = {
      x: clusterView.x,
      y: yCursor,
      w: clusterView.w,
      h: volumesHeight[1],
    };
    yCursor += volumesHeight[1];

    const clusterDeltaView: Rectangle = {
      x: clusterView.x,
      y: yCursor,
      w: clusterView.w,
      h: volumesHeight[2],
    };
    yCursor += volumesHeight[2];

    const clusterDeltaBarsView: Rectangle = {
      x: clusterView.x,
      y: yCursor,
      w: clusterView.w,
      h: volumesHeight[4],
    };
    yCursor += volumesHeight[4];

    const clusterOIDeltaView: Rectangle = {
      x: clusterView.x,
      y: yCursor,
      w: clusterView.w,
      h: volumesHeight[3],
    };

    yCursor += volumesHeight[3];
    const indicatorPanelViews: Array<{ id: string; view: Rectangle }> = [];
    for (const panel of indicatorPanelHeights) {
      const h = panel?.height ?? 0;
      if (h <= 0) continue;
      indicatorPanelViews.push({
        id: panel.id,
        view: { x: clusterView.x, y: yCursor, w: clusterView.w, h },
      });
      yCursor += h;
    }

    return {
      clusterPricesView,
      clusterView,
      clusterDatesView,
      clusterHeadView,
      clusterMiniHeadView,
      clusterAnimArea,
      clusterVolumesView: clusterVolumesSeparatedView,
      clusterOIView,
      clusterOIDeltaView,
      clusterDeltaView,
      clusterDeltaBarsView,
      clusterTotalView,
      clusterTotalViewFill,
      indicatorPanels: indicatorPanelViews,
    };
  }

  getInitialMatrix(
    view: Rectangle,
    data: ClusterData,
    settings: ChartSettings,
    params: FootPrintParameters
  ) {
    if (settings.ShrinkY && data.clusterData.length > 0) {
      data.maxFromPeriod(0, data.clusterData.length - 1);
    }

    const len = Math.floor(view.w / 10);
    const len2 = Math.floor(view.w / 100);
    const totalLength = Math.max(data.clusterData.length, 1);
    const windowSize =
      settings.CompressToCandles === 'Always' || params.candlesOnly
        ? Math.max(len, 1)
        : Math.max(len2, 1);
    let firstCol = Math.max(totalLength - windowSize, 0);
    if (firstCol >= totalLength) {
      firstCol = Math.max(totalLength - 1, 0);
    }
    const h = view.h / 30;
    const to = [view.x, view.y, view.x, view.y + view.h, view.x + view.w, view.y + view.h / 2];
    const from = [
      firstCol,
      data.lastPrice + data.priceScale * h,
      firstCol,
      data.lastPrice - data.priceScale * h,
      totalLength,
      data.lastPrice,
    ];
    return this.alignMatrix(Matrix.fromTriangles(from, to), view, data, settings);
  }

  alignMatrix(
    matrix: Matrix,
    clusterView: Rectangle,
    data: ClusterData,
    settings: ChartSettings,
    alignprice = false
  ) {
    const view = { ...clusterView };

    if ('MaxTrades' in settings && settings.MaxTrades) {
      const delta = (matrix.applyToPoint(1, 0).x - matrix.applyToPoint(0, 0).x) / 5;
      view.x += delta;
      view.w -= delta;
    }

    const x1 = matrix.applyToPoint(0, 0).x;
    const x2 = matrix.applyToPoint(data.clusterData.length, 0).x;
    const scale = Number.isFinite(data.priceScale) && data.priceScale > 0 ? data.priceScale : 1e-6;
    const globalRange = this.getPaddedPriceRange(data.maxPrice, data.minPrice, scale);
    const y1 = globalRange ? matrix.applyToPoint(0, globalRange.y1).y : Number.NaN;
    const y2 = globalRange ? matrix.applyToPoint(0, globalRange.y2).y : Number.NaN;
    let deltaX = 0;
    let deltaY = 0;

    if (x2 - x1 < view.w)
      matrix = matrix.reassignX(
        { x1: 0, x2: data.clusterData.length },
        { x1: view.x, x2: view.x + view.w }
      );
    else {
      if (x1 > view.x) deltaX = view.x - x1;
      if (x2 < view.x + view.w) deltaX = view.x + view.w - x2;
    }

    if (globalRange && y2 - y1 < view.h)
      matrix = matrix.reassignY(
        { y1: globalRange.y1, y2: globalRange.y2 },
        { y1: view.y, y2: view.y + view.h }
      );
    else if (globalRange) {
      if (y1 > view.y) deltaY = view.y - y1;
      if (y2 < view.y + view.h) deltaY = view.y + view.h - y2;
    }

    if (deltaX !== 0 || deltaY !== 0) matrix = matrix.getTranslate(deltaX, deltaY);

    if (settings.ShrinkY && data.clusterData.length > 0) {
      const visible = this.getVisibleRange(matrix, view, data);
      if (visible) {
        data.maxFromPeriod?.(visible.from, visible.to);
      } else {
        data.maxFromPeriod?.(0, data.clusterData.length - 1);
      }

      const local = data.getRenderStats(true);
      const localRange = this.getPaddedPriceRange(local.maxPrice, local.minPrice, scale);
      const targetRange = localRange ?? globalRange;
      if (targetRange) {
        matrix = matrix.reassignY(
          { y1: targetRange.y1, y2: targetRange.y2 },
          { y1: view.y, y2: view.y + view.h }
        );
      }
    }

    if (alignprice && data.clusterData.length > 0) {
      try {
        const xx = matrix.applyToPoint(data.clusterData.length, 0).x;
        matrix = matrix.getTranslate(view.x + view.w - xx, 0);
      } catch (e) {}
    }

    return matrix;
  }

  buildMatrices(
    baseMatrix: Matrix,
    layout: FootprintLayoutDto,
    settings: ChartSettings,
    data: ClusterData,
    topLinesCount: number,
    translateMatrix: Matrix | null = null,
    alignPrice = false
  ): FootprintMatricesDto {
    let mtxMain = baseMatrix.clone();

    if (translateMatrix) {
      const translated = translateMatrix.clone();
      translated.multiply(mtxMain);
      mtxMain = this.alignMatrix(translated, layout.clusterView, data, settings, alignPrice);
    }

    const mtxtotal = mtxMain.reassignX(
      { x1: 0, x2: 1 },
      { x1: layout.clusterTotalView.x, x2: layout.clusterTotalView.x + layout.clusterTotalView.w }
    );

    const mtxprice = mtxMain.reassignX(
      { x1: 0, x2: layout.clusterPricesView.w },
      { x1: layout.clusterPricesView.x, x2: layout.clusterPricesView.x + layout.clusterPricesView.w }
    );

    const mtxhead = settings.Head
      ? mtxMain.reassignY(
          { y1: 0, y2: topLinesCount },
          { y1: layout.clusterHeadView.y, y2: layout.clusterHeadView.y + layout.clusterHeadView.h }
        )
      : new Matrix();

    const mtxanim = settings.Head
      ? mtxprice.reassignY(
          { y1: layout.clusterAnimArea.y, y2: layout.clusterAnimArea.y + layout.clusterAnimArea.h },
          { y1: layout.clusterAnimArea.y, y2: layout.clusterAnimArea.y + layout.clusterAnimArea.h }
        )
      : new Matrix();

    return { mtxMain, mtxtotal, mtxprice, mtxhead, mtxanim };
  }
}



