import {
  DataSeries,
  IndicatorContext,
  IndicatorDefinition,
  IndicatorInstance,
  LineStyle,
  ParamSchema,
} from '../indicator-api';
import { dayKey, isoWeekKey, lineStyleField, monthKey } from './indicator-utils';

export type VwapParams = {
  anchor: 'session' | 'day' | 'week' | 'month';
  showBands: boolean;
  bandMode: 'stdev' | 'percent';
  bandValue: number;
  color: string;
  bandColor: string;
  width: number;
  lineStyle: LineStyle;
};

const vwapParamsSchema: ParamSchema<VwapParams> = {
  anchor: {
    type: 'enum',
    title: 'Anchor',
    default: 'session',
    options: [
      { value: 'session', label: 'Session' },
      { value: 'day', label: 'Day' },
      { value: 'week', label: 'Week' },
      { value: 'month', label: 'Month' },
    ],
  },
  showBands: { type: 'bool', title: 'Show Bands', default: false },
  bandMode: {
    type: 'enum',
    title: 'Band Mode',
    default: 'stdev',
    options: [
      { value: 'stdev', label: 'StDev' },
      { value: 'percent', label: 'Percent' },
    ],
  },
  bandValue: { type: 'float', title: 'Band Value', default: 1, min: 0.1, max: 10, step: 0.1 },
  color: { type: 'color', title: 'Color', default: '#16a085' },
  bandColor: { type: 'color', title: 'Band Color', default: '#1abc9c' },
  width: { type: 'int', title: 'Width', default: 1, min: 1, max: 5, step: 1 },
  lineStyle: { ...lineStyleField },
};

export const VwapIndicator: IndicatorDefinition<VwapParams> = {
  type: 'vwap',
  displayName: 'VWAP',
  category: 'Volume',
  defaultPanel: 'chart',
  panelBehavior: 'fixed',
  paramsSchema: vwapParamsSchema,

  create(ctx: IndicatorContext, params: VwapParams): IndicatorInstance<VwapParams> {
    const vwapSeries: DataSeries = {
      id: 'VWAP',
      name: 'VWAP',
      visual: 'Line',
      values: new Float64Array(ctx.barsCount()),
      color: params.color,
      width: params.width,
      lineStyle: params.lineStyle,
      visible: true,
    };
    vwapSeries.values.fill(NaN);

    const upperSeries: DataSeries = {
      id: 'VWAP_UP',
      name: 'VWAP Upper',
      visual: 'Line',
      values: new Float64Array(ctx.barsCount()),
      color: params.bandColor,
      width: params.width,
      lineStyle: params.lineStyle,
      visible: params.showBands,
    };
    upperSeries.values.fill(NaN);

    const lowerSeries: DataSeries = {
      id: 'VWAP_LOW',
      name: 'VWAP Lower',
      visual: 'Line',
      values: new Float64Array(ctx.barsCount()),
      color: params.bandColor,
      width: params.width,
      lineStyle: params.lineStyle,
      visible: params.showBands,
    };
    lowerSeries.values.fill(NaN);

    let cumTurnover = new Float64Array(ctx.barsCount());
    let cumQuantity = new Float64Array(ctx.barsCount());
    let cumWeightedPriceSq = new Float64Array(ctx.barsCount());
    cumTurnover.fill(NaN);
    cumQuantity.fill(NaN);
    cumWeightedPriceSq.fill(NaN);

    const ensureArrays = () => {
      const len = ctx.barsCount();
      if (cumTurnover.length !== len) {
        const next = new Float64Array(len);
        next.fill(NaN);
        next.set(cumTurnover.subarray(0, Math.min(cumTurnover.length, len)));
        cumTurnover = next;
      }
      if (cumQuantity.length !== len) {
        const next = new Float64Array(len);
        next.fill(NaN);
        next.set(cumQuantity.subarray(0, Math.min(cumQuantity.length, len)));
        cumQuantity = next;
      }
      if (cumWeightedPriceSq.length !== len) {
        const next = new Float64Array(len);
        next.fill(NaN);
        next.set(cumWeightedPriceSq.subarray(0, Math.min(cumWeightedPriceSq.length, len)));
        cumWeightedPriceSq = next;
      }
    };

    const getKey = (date: Date) => {
      switch (params.anchor) {
        case 'week':
          return isoWeekKey(date);
        case 'month':
          return monthKey(date);
        case 'day':
        case 'session':
        default:
          return dayKey(date);
      }
    };

    const calcBar = (bar: number) => {
      ensureArrays();
      if (bar === 0) {
        vwapSeries.values.fill(NaN);
        upperSeries.values.fill(NaN);
        lowerSeries.values.fill(NaN);
        cumTurnover.fill(NaN);
        cumQuantity.fill(NaN);
        cumWeightedPriceSq.fill(NaN);
      }

      const candle = ctx.candles[bar];
      const date = new Date(candle.t);
      const key = getKey(date);
      const prevKey = bar > 0 ? getKey(new Date(ctx.candles[bar - 1].t)) : null;
      const isNewPeriod = bar === 0 || key !== prevKey;

      const prevTurnover =
        !isNewPeriod && isFinite(cumTurnover[bar - 1])
          ? cumTurnover[bar - 1]
          : 0;
      const prevQuantity =
        !isNewPeriod && isFinite(cumQuantity[bar - 1])
          ? cumQuantity[bar - 1]
          : 0;
      const prevWeightedPriceSq =
        !isNewPeriod && isFinite(cumWeightedPriceSq[bar - 1])
          ? cumWeightedPriceSq[bar - 1]
          : 0;

      const turnover = ctx.source(bar, 'volume');
      const quantity = ctx.source(bar, 'quantity');
      const validQuantity = isFinite(quantity) && quantity > 0 ? quantity : 0;
      const validTurnover =
        validQuantity > 0 && isFinite(turnover) ? turnover : 0;
      const barVwap = validQuantity > 0 ? validTurnover / validQuantity : NaN;

      cumTurnover[bar] = prevTurnover + validTurnover;
      cumQuantity[bar] = prevQuantity + validQuantity;
      cumWeightedPriceSq[bar] =
        prevWeightedPriceSq +
        (validQuantity > 0 && isFinite(barVwap)
          ? barVwap * barVwap * validQuantity
          : 0);

      if (cumQuantity[bar] <= 0) {
        vwapSeries.values[bar] = NaN;
        upperSeries.values[bar] = NaN;
        lowerSeries.values[bar] = NaN;
        return;
      }

      const vwap = cumTurnover[bar] / cumQuantity[bar];
      vwapSeries.values[bar] = vwap;

      if (!params.showBands) {
        upperSeries.values[bar] = NaN;
        lowerSeries.values[bar] = NaN;
        return;
      }

      if (params.bandMode === 'percent') {
        const pct = params.bandValue / 100;
        upperSeries.values[bar] = vwap * (1 + pct);
        lowerSeries.values[bar] = vwap * (1 - pct);
      } else {
        const meanSq = cumWeightedPriceSq[bar] / cumQuantity[bar];
        const variance = Math.max(0, meanSq - vwap * vwap);
        const stdev = Math.sqrt(variance);
        const k = params.bandValue;
        upperSeries.values[bar] = vwap + k * stdev;
        lowerSeries.values[bar] = vwap - k * stdev;
      }
    };

    return {
      type: 'vwap',
      params,
      panel: 'chart',
      series: [vwapSeries, upperSeries, lowerSeries],
      warmupPeriod: 0,

      onCalculate(bar: number) {
        if (bar < 0 || bar >= ctx.barsCount()) return;
        calcBar(bar);
      },

      onParamsChanged(next: VwapParams) {
        params = next;
        vwapSeries.color = next.color;
        vwapSeries.width = next.width;
        vwapSeries.lineStyle = next.lineStyle;
        upperSeries.color = next.bandColor;
        lowerSeries.color = next.bandColor;
        upperSeries.width = next.width;
        lowerSeries.width = next.width;
        upperSeries.lineStyle = next.lineStyle;
        lowerSeries.lineStyle = next.lineStyle;
        upperSeries.visible = next.showBands;
        lowerSeries.visible = next.showBands;
        vwapSeries.values.fill(NaN);
        upperSeries.values.fill(NaN);
        lowerSeries.values.fill(NaN);
        cumTurnover.fill(NaN);
        cumQuantity.fill(NaN);
        cumWeightedPriceSq.fill(NaN);
        ctx.requestRecalc();
      },
    };
  },
};
