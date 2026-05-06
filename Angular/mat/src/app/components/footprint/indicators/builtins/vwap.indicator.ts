import {
  DataSeries,
  IndicatorContext,
  IndicatorDefinition,
  IndicatorInstance,
  LineStyle,
  ParamSchema,
  SourceType,
} from '../indicator-api';
import { dayKey, isoWeekKey, lineStyleField, monthKey } from './indicator-utils';

export type VwapParams = {
  anchor: 'session' | 'day' | 'week' | 'month';
  priceSource: SourceType;
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
  priceSource: {
    type: 'enum',
    title: 'Price Source',
    default: 'hlc3',
    options: [
      { value: 'hlc3', label: 'HLC3' },
      { value: 'hl2', label: 'HL2' },
      { value: 'ohlc4', label: 'OHLC4' },
      { value: 'close', label: 'Close' },
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

    let cumPV = new Float64Array(ctx.barsCount());
    let cumVol = new Float64Array(ctx.barsCount());
    let cumPV2 = new Float64Array(ctx.barsCount());
    cumPV.fill(NaN);
    cumVol.fill(NaN);
    cumPV2.fill(NaN);

    const ensureArrays = () => {
      const len = ctx.barsCount();
      if (cumPV.length !== len) {
        const next = new Float64Array(len);
        next.fill(NaN);
        next.set(cumPV.subarray(0, Math.min(cumPV.length, len)));
        cumPV = next;
      }
      if (cumVol.length !== len) {
        const next = new Float64Array(len);
        next.fill(NaN);
        next.set(cumVol.subarray(0, Math.min(cumVol.length, len)));
        cumVol = next;
      }
      if (cumPV2.length !== len) {
        const next = new Float64Array(len);
        next.fill(NaN);
        next.set(cumPV2.subarray(0, Math.min(cumPV2.length, len)));
        cumPV2 = next;
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

    const getPrice = (bar: number) => ctx.source(bar, params.priceSource);

    const calcBar = (bar: number) => {
      ensureArrays();
      if (bar === 0) {
        vwapSeries.values.fill(NaN);
        upperSeries.values.fill(NaN);
        lowerSeries.values.fill(NaN);
        cumPV.fill(NaN);
        cumVol.fill(NaN);
        cumPV2.fill(NaN);
      }

      const candle = ctx.candles[bar];
      const date = new Date(candle.t);
      const key = getKey(date);
      const prevKey = bar > 0 ? getKey(new Date(ctx.candles[bar - 1].t)) : null;
      const isNewPeriod = bar === 0 || key !== prevKey;

      const prevPV = !isNewPeriod && isFinite(cumPV[bar - 1]) ? cumPV[bar - 1] : 0;
      const prevVol = !isNewPeriod && isFinite(cumVol[bar - 1]) ? cumVol[bar - 1] : 0;
      const prevPV2 = !isNewPeriod && isFinite(cumPV2[bar - 1]) ? cumPV2[bar - 1] : 0;

      const volume = ctx.source(bar, 'volume');
      const price = getPrice(bar);
      const vol = isFinite(volume) ? volume : 0;

      const pv = vol > 0 ? price * vol : 0;
      cumPV[bar] = prevPV + pv;
      cumVol[bar] = prevVol + vol;
      cumPV2[bar] = prevPV2 + (vol > 0 ? price * price * vol : 0);

      if (cumVol[bar] <= 0) {
        vwapSeries.values[bar] = NaN;
        upperSeries.values[bar] = NaN;
        lowerSeries.values[bar] = NaN;
        return;
      }

      const vwap = cumPV[bar] / cumVol[bar];
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
        const meanSq = cumPV2[bar] / cumVol[bar];
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
        cumPV.fill(NaN);
        cumVol.fill(NaN);
        cumPV2.fill(NaN);
        ctx.requestRecalc();
      },
    };
  },
};
