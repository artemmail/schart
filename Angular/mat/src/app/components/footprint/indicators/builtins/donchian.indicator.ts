import {
  DataSeries,
  IndicatorContext,
  IndicatorDefinition,
  IndicatorInstance,
  LineStyle,
  ParamSchema,
} from '../indicator-api';
import { lineStyleField } from './indicator-utils';

export type DonchianParams = {
  period: number;
  showMiddle: boolean;
  upperColor: string;
  lowerColor: string;
  middleColor: string;
  width: number;
  lineStyle: LineStyle;
};

const donchianParamsSchema: ParamSchema<DonchianParams> = {
  period: { type: 'int', title: 'Length', default: 10, min: 1, max: 500, step: 1 },
  showMiddle: { type: 'bool', title: 'Show Middle', default: true },
  upperColor: { type: 'color', title: 'Upper Color', default: '#2980b9' },
  lowerColor: { type: 'color', title: 'Lower Color', default: '#2980b9' },
  middleColor: { type: 'color', title: 'Middle Color', default: '#7f8c8d' },
  width: { type: 'int', title: 'Width', default: 1, min: 1, max: 5, step: 1 },
  lineStyle: { ...lineStyleField },
};

export const DonchianIndicator: IndicatorDefinition<DonchianParams> = {
  type: 'donchian',
  displayName: 'Donchian Channels',
  category: 'Volatility',
  defaultPanel: 'chart',
  panelBehavior: 'fixed',
  paramsSchema: donchianParamsSchema,

  create(ctx: IndicatorContext, params: DonchianParams): IndicatorInstance<DonchianParams> {
    const upper: DataSeries = {
      id: 'DONCHIAN_UP',
      name: `Donchian Upper(${params.period})`,
      visual: 'Line',
      values: new Float64Array(ctx.barsCount()),
      color: params.upperColor,
      width: params.width,
      lineStyle: params.lineStyle,
      visible: true,
    };
    upper.values.fill(NaN);

    const lower: DataSeries = {
      id: 'DONCHIAN_LOW',
      name: `Donchian Lower(${params.period})`,
      visual: 'Line',
      values: new Float64Array(ctx.barsCount()),
      color: params.lowerColor,
      width: params.width,
      lineStyle: params.lineStyle,
      visible: true,
    };
    lower.values.fill(NaN);

    const middle: DataSeries = {
      id: 'DONCHIAN_MID',
      name: `Donchian Mid(${params.period})`,
      visual: 'Line',
      values: new Float64Array(ctx.barsCount()),
      color: params.middleColor,
      width: params.width,
      lineStyle: params.lineStyle,
      visible: params.showMiddle,
    };
    middle.values.fill(NaN);

    const calcBar = (bar: number) => {
      if (bar === 0) {
        upper.values.fill(NaN);
        lower.values.fill(NaN);
        middle.values.fill(NaN);
      }

      const p = Math.max(1, Math.floor(params.period));
      if (bar < p - 1) {
        upper.values[bar] = NaN;
        lower.values[bar] = NaN;
        middle.values[bar] = NaN;
        return;
      }

      let hi = Number.NEGATIVE_INFINITY;
      let lo = Number.POSITIVE_INFINITY;
      for (let i = bar - p + 1; i <= bar; i++) {
        const c = ctx.candles[i];
        if (c.h > hi) hi = c.h;
        if (c.l < lo) lo = c.l;
      }

      upper.values[bar] = hi;
      lower.values[bar] = lo;
      middle.values[bar] = (hi + lo) / 2;
    };

    return {
      type: 'donchian',
      params,
      panel: 'chart',
      series: [upper, middle, lower],
      warmupPeriod: Math.max(0, Math.floor(params.period) - 1),

      onCalculate(bar: number) {
        if (bar < 0 || bar >= ctx.barsCount()) return;
        calcBar(bar);
      },

      onParamsChanged(next: DonchianParams) {
        params = next;
        upper.color = next.upperColor;
        lower.color = next.lowerColor;
        middle.color = next.middleColor;
        for (const s of [upper, lower, middle]) {
          s.width = next.width;
          s.lineStyle = next.lineStyle;
        }
        upper.name = `Donchian Upper(${next.period})`;
        lower.name = `Donchian Lower(${next.period})`;
        middle.name = `Donchian Mid(${next.period})`;
        middle.visible = next.showMiddle;
        upper.values.fill(NaN);
        lower.values.fill(NaN);
        middle.values.fill(NaN);
        this.warmupPeriod = Math.max(0, Math.floor(next.period) - 1);
        ctx.requestRecalc();
      },
    };
  },
};
