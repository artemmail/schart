import {
  DataSeries,
  IndicatorContext,
  IndicatorDefinition,
  IndicatorInstance,
  LineStyle,
  ParamSchema,
  SourceType,
} from '../indicator-api';
import { lineStyleField } from './indicator-utils';

export type SuperTrendParams = {
  atrLength: number;
  multiplier: number;
  source: SourceType;
  showTrendColoring: boolean;
  upColor: string;
  downColor: string;
  width: number;
  lineStyle: LineStyle;
};

const superTrendParamsSchema: ParamSchema<SuperTrendParams> = {
  atrLength: { type: 'int', title: 'ATR Length', default: 10, min: 1, max: 200, step: 1 },
  multiplier: { type: 'float', title: 'Multiplier', default: 3, min: 0.1, max: 10, step: 0.1 },
  source: {
    type: 'enum',
    title: 'Source',
    default: 'hl2',
    options: [
      { value: 'hl2', label: 'HL2' },
      { value: 'hlc3', label: 'HLC3' },
      { value: 'ohlc4', label: 'OHLC4' },
      { value: 'close', label: 'Close' },
    ],
  },
  showTrendColoring: { type: 'bool', title: 'Show Trend Coloring', default: true },
  upColor: { type: 'color', title: 'Up Color', default: '#2ecc71' },
  downColor: { type: 'color', title: 'Down Color', default: '#e74c3c' },
  width: { type: 'int', title: 'Width', default: 2, min: 1, max: 5, step: 1 },
  lineStyle: { ...lineStyleField },
};

export const SuperTrendIndicator: IndicatorDefinition<SuperTrendParams> = {
  type: 'supertrend',
  displayName: 'SuperTrend',
  category: 'Trend',
  defaultPanel: 'chart',
  panelBehavior: 'fixed',
  paramsSchema: superTrendParamsSchema,

  create(ctx: IndicatorContext, params: SuperTrendParams): IndicatorInstance<SuperTrendParams> {
    const upSeries: DataSeries = {
      id: 'ST_UP',
      name: 'SuperTrend Up',
      visual: 'Line',
      values: new Float64Array(ctx.barsCount()),
      color: params.upColor,
      width: params.width,
      lineStyle: params.lineStyle,
      visible: true,
    };
    upSeries.values.fill(NaN);

    const downSeries: DataSeries = {
      id: 'ST_DOWN',
      name: 'SuperTrend Down',
      visual: 'Line',
      values: new Float64Array(ctx.barsCount()),
      color: params.downColor,
      width: params.width,
      lineStyle: params.lineStyle,
      visible: params.showTrendColoring,
    };
    downSeries.values.fill(NaN);

    let atrRaw = new Float64Array(ctx.barsCount());
    let finalUpper = new Float64Array(ctx.barsCount());
    let finalLower = new Float64Array(ctx.barsCount());
    let trend = new Int8Array(ctx.barsCount());
    atrRaw.fill(NaN);
    finalUpper.fill(NaN);
    finalLower.fill(NaN);

    const ensureArrays = () => {
      const len = ctx.barsCount();
      if (atrRaw.length !== len) {
        const next = new Float64Array(len);
        next.fill(NaN);
        next.set(atrRaw.subarray(0, Math.min(atrRaw.length, len)));
        atrRaw = next;
      }
      if (finalUpper.length !== len) {
        const next = new Float64Array(len);
        next.fill(NaN);
        next.set(finalUpper.subarray(0, Math.min(finalUpper.length, len)));
        finalUpper = next;
      }
      if (finalLower.length !== len) {
        const next = new Float64Array(len);
        next.fill(NaN);
        next.set(finalLower.subarray(0, Math.min(finalLower.length, len)));
        finalLower = next;
      }
      if (trend.length !== len) {
        const next = new Int8Array(len);
        next.set(trend.subarray(0, Math.min(trend.length, len)));
        trend = next;
      }
    };

    const calcBar = (bar: number) => {
      ensureArrays();
      if (bar === 0) {
        upSeries.values.fill(NaN);
        downSeries.values.fill(NaN);
        atrRaw.fill(NaN);
        finalUpper.fill(NaN);
        finalLower.fill(NaN);
        trend.fill(0);
      }

      const len = Math.max(1, Math.floor(params.atrLength));
      const candle = ctx.candles[bar];
      const prevClose = bar > 0 ? ctx.candles[bar - 1].c : candle.c;
      const tr = Math.max(
        candle.h - candle.l,
        Math.abs(candle.h - prevClose),
        Math.abs(candle.l - prevClose)
      );

      if (bar < len - 1) {
        atrRaw[bar] = NaN;
        upSeries.values[bar] = NaN;
        downSeries.values[bar] = NaN;
        return;
      }

      if (bar === len - 1 || !isFinite(atrRaw[bar - 1])) {
        let sum = 0;
        for (let i = bar - len + 1; i <= bar; i++) {
          const c = ctx.candles[i];
          const prev = i > 0 ? ctx.candles[i - 1].c : c.c;
          const trI = Math.max(c.h - c.l, Math.abs(c.h - prev), Math.abs(c.l - prev));
          sum += trI;
        }
        atrRaw[bar] = sum / len;
      } else {
        atrRaw[bar] = (atrRaw[bar - 1] * (len - 1) + tr) / len;
      }

      if (!isFinite(atrRaw[bar])) {
        upSeries.values[bar] = NaN;
        downSeries.values[bar] = NaN;
        return;
      }

      const middle = ctx.source(bar, params.source);
      const mult = params.multiplier;
      const basicUpper = middle + mult * atrRaw[bar];
      const basicLower = middle - mult * atrRaw[bar];

      if (bar === len - 1) {
        finalUpper[bar] = basicUpper;
        finalLower[bar] = basicLower;
        trend[bar] = 1;
      } else {
        const prevUpper = finalUpper[bar - 1];
        const prevLower = finalLower[bar - 1];
        const prevCloseLocal = ctx.candles[bar - 1].c;

        finalUpper[bar] =
          basicUpper < prevUpper || prevCloseLocal > prevUpper ? basicUpper : prevUpper;
        finalLower[bar] =
          basicLower > prevLower || prevCloseLocal < prevLower ? basicLower : prevLower;

        const prevTrend = trend[bar - 1] === 0 ? 1 : trend[bar - 1];
        let nextTrend = prevTrend;
        if (prevTrend === -1 && candle.c > prevUpper) {
          nextTrend = 1;
        } else if (prevTrend === 1 && candle.c < prevLower) {
          nextTrend = -1;
        }
        trend[bar] = nextTrend;
      }

      const stValue = trend[bar] === 1 ? finalLower[bar] : finalUpper[bar];
      if (params.showTrendColoring) {
        upSeries.values[bar] = trend[bar] === 1 ? stValue : NaN;
        downSeries.values[bar] = trend[bar] === -1 ? stValue : NaN;
      } else {
        upSeries.values[bar] = stValue;
        downSeries.values[bar] = NaN;
      }
    };

    return {
      type: 'supertrend',
      params,
      panel: 'chart',
      series: [upSeries, downSeries],
      warmupPeriod: Math.max(0, Math.floor(params.atrLength) - 1),

      onCalculate(bar: number) {
        if (bar < 0 || bar >= ctx.barsCount()) return;
        calcBar(bar);
      },

      onParamsChanged(next: SuperTrendParams) {
        params = next;
        upSeries.color = next.upColor;
        downSeries.color = next.downColor;
        for (const s of [upSeries, downSeries]) {
          s.width = next.width;
          s.lineStyle = next.lineStyle;
        }
        downSeries.visible = next.showTrendColoring;
        upSeries.values.fill(NaN);
        downSeries.values.fill(NaN);
        atrRaw.fill(NaN);
        finalUpper.fill(NaN);
        finalLower.fill(NaN);
        trend.fill(0);
        this.warmupPeriod = Math.max(0, Math.floor(next.atrLength) - 1);
        ctx.requestRecalc();
      },
    };
  },
};
