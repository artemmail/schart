import {
  DataSeries,
  IndicatorContext,
  IndicatorDefinition,
  IndicatorInstance,
  ParamSchema,
} from '../indicator-api';

export type MidPriceOiCumWeightedParams = {
  color: string;
  width: number;
};

const midPriceOiCumWeightedParamsSchema: ParamSchema<MidPriceOiCumWeightedParams> = {
  color: { type: 'color', title: 'Color', default: '#8080ff' },
  width: { type: 'int', title: 'Width', default: 2, min: 1, max: 5, step: 1 },
};

export const MidPriceOiCumWeightedIndicator: IndicatorDefinition<MidPriceOiCumWeightedParams> = {
  type: 'midprice-oi-cumweighted',
  displayName: 'MidPrice OI CumWeighted (Close only)',
  category: 'Open Interest',
  defaultPanel: 'chart',
  panelBehavior: 'fixed',
  paramsSchema: midPriceOiCumWeightedParamsSchema,

  create(ctx: IndicatorContext, params: MidPriceOiCumWeightedParams): IndicatorInstance<MidPriceOiCumWeightedParams> {
    const series: DataSeries = {
      id: 'MIDPRICE_OI_CW',
      name: 'MidPrice OI CumWeighted',
      visual: 'Line',
      values: new Float64Array(ctx.barsCount()),
      color: params.color,
      width: params.width,
      visible: true,
    };
    series.values.fill(NaN);

    let cumV = new Float64Array(series.values.length);
    let cumOiDelta = new Float64Array(series.values.length);

    const ensureCapacity = () => {
      const size = ctx.barsCount();
      if (cumV.length !== size) {
        const next = new Float64Array(size);
        next.set(cumV.subarray(0, Math.min(cumV.length, next.length)));
        cumV = next;
      }
      if (cumOiDelta.length !== size) {
        const next = new Float64Array(size);
        next.set(cumOiDelta.subarray(0, Math.min(cumOiDelta.length, next.length)));
        cumOiDelta = next;
      }
    };

    const calcBar = (bar: number) => {
      ensureCapacity();

      if (bar === 0) {
        cumV[bar] = 0;
        cumOiDelta[bar] = 0;
        series.values[bar] = 0;
        return;
      }

      const currentBar = ctx.currentBar();
      if (bar === currentBar) {
        series.values[bar] = series.values[bar - 1];
        cumV[bar] = cumV[bar - 1];
        cumOiDelta[bar] = cumOiDelta[bar - 1];
        return;
      }

      const open = ctx.source(bar, 'open');
      const close = ctx.source(bar, 'close');
      const currOi = ctx.source(bar, 'oi');
      const prevOi = ctx.source(bar - 1, 'oi');

      const midPrice = (open + close) / 2;
      const dOi = currOi - prevOi;

      cumV[bar] = cumV[bar - 1] + dOi * midPrice;
      cumOiDelta[bar] = cumOiDelta[bar - 1] + dOi;

      if (cumOiDelta[bar] === 0) {
        series.values[bar] = series.values[bar - 1];
      } else {
        series.values[bar] = cumV[bar] / cumOiDelta[bar];
      }
    };

    return {
      type: 'midprice-oi-cumweighted',
      params,
      panel: 'chart',
      series: [series],
      warmupPeriod: 1,

      onCalculate(bar: number) {
        if (bar < 0 || bar >= ctx.barsCount()) return;
        calcBar(bar);
      },

      onParamsChanged(next: MidPriceOiCumWeightedParams) {
        params = next;
        series.color = next.color;
        series.width = next.width;
        ctx.requestRecalc();
      },
    };
  },
};
