import { Injectable } from '@angular/core';
import { FootPrintParameters } from 'src/app/models/Params';
import { TickerPresetNew } from 'src/app/models/tickerpreset';
import type { FootPrintParamsComponent } from 'src/app/components/Controls/FootPrintParams/footpintparmas.component';
import type { FootprintWidgetComponent } from 'src/app/components/footprint/components/footprint-widget/footprint-widget.component';
import { FootprintFavoritePayload } from './footprint-favorites.service';
import {
  applyFootprintModeToParams,
  DEFAULT_ARBITRAGE_PORTFOLIO_1,
  DEFAULT_ARBITRAGE_PORTFOLIO_2,
  resolveFootprintMode,
} from 'src/app/models/footprint-mode';

export interface FootprintFavoritesContext {
  params?: TickerPresetNew | null;
  footPrintParamsComponent?: FootPrintParamsComponent;
  footPrint?: FootprintWidgetComponent;
}

@Injectable({
  providedIn: 'root',
})
export class FootprintFavoritesHandlerService {
  buildPayload(
    footPrintParamsComponent?: FootPrintParamsComponent,
    footPrint?: FootprintWidgetComponent
  ): FootprintFavoritePayload | null {
    if (!footPrintParamsComponent) {
      return null;
    }

    const params = this.normalizeParams(
      footPrintParamsComponent.GetModel()
    );
    if (!params) {
      return null;
    }

    return {
      params,
      presetIndex: footPrint?.presetIndex ?? null,
    };
  }

  applyFavorite(
    payload: FootprintFavoritePayload,
    context: FootprintFavoritesContext
  ): TickerPresetNew | null {
    if (!payload?.params) {
      return null;
    }

    const params = this.normalizeParams(payload.params);
    const mode = resolveFootprintMode(params);
    const normalized = applyFootprintModeToParams({ ...params }, mode, {
      defaultPeriod:
        Number.isFinite(params.period) && (params.period as number) > 0
          ? (params.period as number)
          : 1,
      keepArbitrageTickers: true,
      arbitrageDefaults: {
        ticker1: DEFAULT_ARBITRAGE_PORTFOLIO_1,
        ticker2: DEFAULT_ARBITRAGE_PORTFOLIO_2,
      },
    });
    const isArbitrage = mode === 'arbitrage';

    const nextParams: TickerPresetNew = {
      ...(context.params ?? ({} as TickerPresetNew)),
      ...normalized,
      type: isArbitrage ? 'arbitrage' : undefined,
      candlesOnly: isArbitrage ? false : !!normalized.candlesOnly,
      ticker: isArbitrage ? undefined : normalized.ticker,
      ticker1: isArbitrage ? normalized.ticker1 : undefined,
      ticker2: isArbitrage ? normalized.ticker2 : undefined,
    };

    const paramsComponent = context.footPrintParamsComponent;
    if (paramsComponent) {
      paramsComponent.params = nextParams;
    }

    const uiMode = mode === 'arbitrage'
      ? 'arbitrage'
      : mode === 'candles'
      ? 'candles'
      : 'clusters';
    paramsComponent?.onLoadModeChange(uiMode);

    if (paramsComponent?.DateRange) {
      paramsComponent.DateRange.setDatesRange(
        (params.startDate as Date | undefined) ?? null,
        (params.endDate as Date | undefined) ?? null
      );
    }

    const presetSelector = paramsComponent?.presetSelector;
    if (presetSelector) {
      presetSelector.ticker = normalized.ticker ?? '';
      presetSelector.rperiod = normalized.rperiod ?? 'custom';
    }

    if (!isArbitrage && normalized.ticker) {
      paramsComponent?.onTickerSelected(normalized.ticker);
    } else if (presetSelector) {
      presetSelector.loadPeriodPresets();
    }

    if (payload.presetIndex !== undefined && payload.presetIndex !== null) {
      context.footPrint?.setPresetIndex(payload.presetIndex);
    }

    return nextParams;
  }

  private normalizeParams(params: FootPrintParameters): FootPrintParameters {
    return {
      ...params,
      startDate: this.parseDate(params.startDate),
      endDate: this.parseDate(params.endDate),
    };
  }

  private parseDate(value: unknown): Date | undefined {
    if (!value) {
      return undefined;
    }
    if (value instanceof Date) {
      return isNaN(value.getTime()) ? undefined : value;
    }
    const parsed = new Date(value as any);
    return isNaN(parsed.getTime()) ? undefined : parsed;
  }
}
