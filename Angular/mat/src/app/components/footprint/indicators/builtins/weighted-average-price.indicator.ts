import {
  DataSeries,
  IndicatorContext,
  IndicatorDefinition,
  IndicatorInstance,
  LineStyle,
  ParamSchema,
} from '../indicator-api';
import { lineStyleField } from './indicator-utils';

export type WeightedAveragePriceParams = {
  color: string;
  lineStyle: LineStyle;
};

const weightedAveragePriceParamsSchema: ParamSchema<WeightedAveragePriceParams> = {
  color: { type: 'color', title: 'Color', default: '#f39c12' },
  lineStyle: { ...lineStyleField },
};

export const WeightedAveragePriceIndicator: IndicatorDefinition<WeightedAveragePriceParams> = {
  type: 'weightedAveragePrice',
  displayName: 'WAP',
  category: 'Volume',
  defaultPanel: 'chart',
  panelBehavior: 'fixed',
  paramsSchema: weightedAveragePriceParamsSchema,

  create(
    ctx: IndicatorContext,
    params: WeightedAveragePriceParams
  ): IndicatorInstance<WeightedAveragePriceParams> {
    const series: DataSeries = {
      id: 'WAP',
      name: 'WAP',
      visual: 'Line',
      values: new Float64Array(ctx.barsCount()),
      color: params.color,
      width: 1,
      lineStyle: params.lineStyle,
      visible: true,
    };
    series.values.fill(NaN);

    return {
      type: 'weightedAveragePrice',
      params,
      panel: 'chart',
      series: [series],
      warmupPeriod: 0,

      onCalculate(bar: number) {
        if (bar < 0 || bar >= ctx.barsCount()) return;
        if (bar === 0) {
          series.values.fill(NaN);
        }

        const volume = ctx.source(bar, 'volume');
        const quantity = ctx.source(bar, 'quantity');
        series.values[bar] =
          isFinite(volume) && isFinite(quantity) && quantity > 0
            ? volume / quantity
            : NaN;
      },

      onParamsChanged(next: WeightedAveragePriceParams) {
        params = next;
        series.color = next.color;
        series.lineStyle = next.lineStyle;
        ctx.requestRender();
      },
    };
  },
};
