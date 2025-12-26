import { Injectable } from '@angular/core';
import { Rectangle } from 'src/app/models/Rectangle';
import { ChartSettings } from 'src/app/models/ChartSettings';
import { ColorsService } from 'src/app/service/FootPrint/Colors/color.service';
import { FootPrintParameters } from 'src/app/models/Params';
import { Matrix } from './matrix';
import { ClusterData } from './clusterData';

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
  deltaVolumes: Array<number>;
  minimode: boolean;
  topLinesCount: number;
  settings: ChartSettings;
  data: ClusterData;
}

@Injectable({ providedIn: 'root' })
export class FootprintLayoutService {
  constructor(private colorsService: ColorsService) {}

  calculateLayout(options: LayoutOptions): FootprintLayoutDto {
    const { canvasWidth, canvasHeight, deltaVolumes, minimode, settings, data } = options;
    let { topLinesCount } = options;

    const newTotal = settings.totalMode === 'Under' || !data.ableCluster();
    const hiddenTotal = settings.totalMode === 'Hidden' && data.ableCluster();
    const totalLen = hiddenTotal ? 0 : settings.VolumesHeight[4];
    let graphTopSpace = settings.Head
      ? topLinesCount * 20 * this.colorsService.sscale()
      : 0;
    const miniHeadTop = 25;

    if (minimode) {
      graphTopSpace = miniHeadTop;
      topLinesCount = 0;
    }

    const volumesHeight = [
      deltaVolumes[0],
      deltaVolumes[1],
      deltaVolumes[2],
      deltaVolumes[3],
      deltaVolumes[5],
    ];

    if (settings.SeparateVolume) {
      volumesHeight[0] += settings.VolumesHeight[0];
    }

    if (data.ableOI() && settings.OI) {
      volumesHeight[1] += settings.VolumesHeight[1];
    }

    if (settings.Delta) {
      volumesHeight[2] += settings.VolumesHeight[2];
    }

    if (settings.DeltaBars) {
      volumesHeight[4] += settings.VolumesHeight[5];
    }

    if (data.ableOI() && settings.OIDelta) {
      volumesHeight[3] += settings.VolumesHeight[3];
    }

    const totalVerticalHeight =
      volumesHeight[0] +
      volumesHeight[1] +
      volumesHeight[2] +
      volumesHeight[3] +
      volumesHeight[4];

    const clusterView: Rectangle = new Rectangle(
      totalLen + deltaVolumes[4],
      graphTopSpace,
      canvasWidth -
        this.colorsService.LegendPriceWidth(minimode) -
        totalLen -
        deltaVolumes[4],
      canvasHeight -
        this.colorsService.LegendDateHeight(minimode) -
        graphTopSpace -
        totalVerticalHeight
    );

    if (newTotal) {
      clusterView.x = 0;
      clusterView.w = canvasWidth - this.colorsService.LegendPriceWidth(minimode);
    }

    const graphValuesHeight = Math.abs(clusterView.h / 7);

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

    const clusterDatesView: Rectangle = {
      x: clusterView.x,
      w: clusterView.w,
      y: clusterView.y + clusterView.h,
      h: canvasHeight - (clusterView.y + clusterView.h) - totalVerticalHeight,
    };

    if (minimode) clusterDatesView.h = 0;

    const clusterAnimArea: Rectangle = {
      x: clusterHeadView.w + clusterHeadView.x,
      y: clusterHeadView.y,
      h: clusterHeadView.h,
      w: clusterPricesView.w,
    };

    const clusterOIView = settings.SeparateVolume
      ? {
          x: clusterView.x,
          y: clusterVolumesView.y + clusterVolumesView.h,
          w: clusterView.w,
          h: volumesHeight[1],
        }
      : {
          x: clusterView.x,
          y: clusterDatesView.y + clusterDatesView.h,
          w: clusterView.w,
          h: volumesHeight[1],
        };

    const clusterVolumesSeparatedView = settings.SeparateVolume
      ? {
          x: clusterView.x,
          y: clusterDatesView.y + clusterDatesView.h,
          w: clusterView.w,
          h: volumesHeight[0],
        }
      : clusterVolumesView;

    const clusterDeltaView: Rectangle = {
      x: clusterView.x,
      y: clusterOIView.y + clusterOIView.h,
      w: clusterView.w,
      h: volumesHeight[2],
    };

    const clusterDeltaBarsView: Rectangle = {
      x: clusterView.x,
      y: clusterDeltaView.y + clusterDeltaView.h,
      w: clusterView.w,
      h: volumesHeight[4],
    };

    const clusterOIDeltaView: Rectangle = {
      x: clusterView.x,
      y: clusterDeltaBarsView.y + clusterDeltaBarsView.h,
      w: clusterView.w,
      h: volumesHeight[3],
    };

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
    };
  }

  getInitialMatrix(
    view: Rectangle,
    data: ClusterData,
    settings: ChartSettings,
    params: FootPrintParameters
  ) {
    if (
      settings.ShrinkY &&
      data.clusterData.length > 0 &&
      (!data.local || data.local.maxPrice === undefined)
    ) {
      data.maxFromPeriod(0, data.clusterData.length - 1);
    }

    const len = Math.floor(view.w / 10);
    const len2 = Math.floor(view.w / 100);
    const firstCol = Math.max(
      data.clusterData.length -
        (settings.CompressToCandles === 'Always' || params.candlesOnly ? len : len2),
      0
    );
    const h = view.h / 30;
    const to = [
      view.x,
      view.y,
      view.x,
      view.y + view.h,
      view.x + view.w,
      view.y + view.h / 2,
    ];
    const from = [
      firstCol,
      data.lastPrice + data.priceScale * h,
      firstCol,
      data.lastPrice - data.priceScale * h,
      data.clusterData.length,
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
      const delta =
        (matrix.applyToPoint(1, 0).x - matrix.applyToPoint(0, 0).x) / 5;
      view.x += delta;
      view.w -= delta;
    }

    const x1 = matrix.applyToPoint(0, 0).x;
    const x2 = matrix.applyToPoint(data.clusterData.length, 0).x;
    const dp = (data.maxPrice - data.minPrice) / 10;
    const y1 = matrix.applyToPoint(0, data.maxPrice + dp).y;
    const y2 = matrix.applyToPoint(0, data.minPrice - dp).y;
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

    if (y2 - y1 < view.h)
      matrix = matrix.reassignY(
        { y1: data.maxPrice + dp, y2: data.minPrice - dp },
        { y1: view.y, y2: view.y + view.h }
      );
    else {
      if (y1 > view.y) deltaY = view.y - y1;
      if (y2 < view.y + view.h) deltaY = view.y + view.h - y2;
    }

    if (deltaX !== 0 || deltaY !== 0)
      matrix = matrix.getTranslate(deltaX, deltaY);

    if (settings.ShrinkY) {
      if (
        (!data.local || data.local.maxPrice === undefined) &&
        data.clusterData.length > 0
      ) {
        data.maxFromPeriod?.(0, data.clusterData.length - 1);
      }

      const local = data.local ?? { maxPrice: data.maxPrice, minPrice: data.minPrice };

      if (local.maxPrice !== undefined && local.minPrice !== undefined) {
        const localDelta = (local.maxPrice - local.minPrice) / 10;
        matrix = matrix.reassignY(
          { y1: local.maxPrice + localDelta, y2: local.minPrice - localDelta },
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
      mtxMain = this.alignMatrix(
        translated,
        layout.clusterView,
        data,
        settings,
        alignPrice
      );
    }

    const mtxtotal = mtxMain.reassignX(
      { x1: 0, x2: 1 },
      {
        x1: layout.clusterTotalView.x,
        x2: layout.clusterTotalView.x + layout.clusterTotalView.w,
      }
    );

    const mtxprice = mtxMain.reassignX(
      { x1: 0, x2: layout.clusterPricesView.w },
      {
        x1: layout.clusterPricesView.x,
        x2: layout.clusterPricesView.x + layout.clusterPricesView.w,
      }
    );

    const mtxhead = settings.Head
      ? mtxMain.reassignY(
          { y1: 0, y2: topLinesCount },
          {
            y1: layout.clusterHeadView.y,
            y2: layout.clusterHeadView.y + layout.clusterHeadView.h,
          }
        )
      : new Matrix();

    const mtxanim = settings.Head
      ? mtxprice.reassignY(
          {
            y1: layout.clusterAnimArea.y,
            y2: layout.clusterAnimArea.y + layout.clusterAnimArea.h,
          },
          {
            y1: layout.clusterAnimArea.y,
            y2: layout.clusterAnimArea.y + layout.clusterAnimArea.h,
          }
        )
      : new Matrix();

    return { mtxMain, mtxtotal, mtxprice, mtxhead, mtxanim };
  }
}
