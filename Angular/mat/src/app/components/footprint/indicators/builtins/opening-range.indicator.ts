import {
  DataSeries,
  IndicatorContext,
  IndicatorDefinition,
  IndicatorInstance,
  LineStyle,
  ParamSchema,
} from '../indicator-api';
import { lineStyleField } from './indicator-utils';

export type OpeningRangeParams = {
  sessionMode: 'exchange' | 'custom';
  customStartHour: number;
  customStartMinute: number;
  durationMode: '5m' | '15m' | '30m' | '60m' | 'bars';
  durationBars: number;
  extend: boolean;
  showMid: boolean;
  highColor: string;
  lowColor: string;
  midColor: string;
  width: number;
  lineStyle: LineStyle;
};

const openingRangeParamsSchema: ParamSchema<OpeningRangeParams> = {
  sessionMode: {
    type: 'enum',
    title: 'Session Definition',
    default: 'exchange',
    options: [
      { value: 'exchange', label: 'Exchange Session' },
      { value: 'custom', label: 'Custom Time' },
    ],
  },
  customStartHour: { type: 'int', title: 'Custom Start Hour', default: 9, min: 0, max: 23, step: 1 },
  customStartMinute: { type: 'int', title: 'Custom Start Minute', default: 30, min: 0, max: 59, step: 1 },
  durationMode: {
    type: 'enum',
    title: 'OR Duration',
    default: '30m',
    options: [
      { value: '5m', label: '5m' },
      { value: '15m', label: '15m' },
      { value: '30m', label: '30m' },
      { value: '60m', label: '60m' },
      { value: 'bars', label: 'Bars' },
    ],
  },
  durationBars: { type: 'int', title: 'Bars (if Bars mode)', default: 5, min: 1, max: 500, step: 1 },
  extend: { type: 'bool', title: 'Extend to Session End', default: true },
  showMid: { type: 'bool', title: 'Show Mid', default: false },
  highColor: { type: 'color', title: 'High Color', default: '#e67e22' },
  lowColor: { type: 'color', title: 'Low Color', default: '#27ae60' },
  midColor: { type: 'color', title: 'Mid Color', default: '#7f8c8d' },
  width: { type: 'int', title: 'Width', default: 1, min: 1, max: 5, step: 1 },
  lineStyle: { ...lineStyleField },
};

export const OpeningRangeIndicator: IndicatorDefinition<OpeningRangeParams> = {
  type: 'openingrange',
  displayName: 'Opening Range',
  category: 'Levels',
  defaultPanel: 'chart',
  panelBehavior: 'fixed',
  paramsSchema: openingRangeParamsSchema,

  create(ctx: IndicatorContext, params: OpeningRangeParams): IndicatorInstance<OpeningRangeParams> {
    const high: DataSeries = {
      id: 'OR_HIGH',
      name: 'OR High',
      visual: 'Line',
      values: new Float64Array(ctx.barsCount()),
      color: params.highColor,
      width: params.width,
      lineStyle: params.lineStyle,
      visible: true,
    };
    const low: DataSeries = {
      id: 'OR_LOW',
      name: 'OR Low',
      visual: 'Line',
      values: new Float64Array(ctx.barsCount()),
      color: params.lowColor,
      width: params.width,
      lineStyle: params.lineStyle,
      visible: true,
    };
    const mid: DataSeries = {
      id: 'OR_MID',
      name: 'OR Mid',
      visual: 'Line',
      values: new Float64Array(ctx.barsCount()),
      color: params.midColor,
      width: params.width,
      lineStyle: params.lineStyle,
      visible: params.showMid,
    };
    for (const s of [high, low, mid]) s.values.fill(NaN);

    const getSessionStart = (date: Date) => {
      const hour = params.sessionMode === 'custom' ? params.customStartHour : 0;
      const minute = params.sessionMode === 'custom' ? params.customStartMinute : 0;
      const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, minute, 0, 0);
      if (date.getTime() < start.getTime()) {
        start.setDate(start.getDate() - 1);
      }
      return start;
    };

    const getDurationMs = () => {
      switch (params.durationMode) {
        case '5m':
          return 5 * 60 * 1000;
        case '15m':
          return 15 * 60 * 1000;
        case '30m':
          return 30 * 60 * 1000;
        case '60m':
          return 60 * 60 * 1000;
        default:
          return null;
      }
    };

    const recalcAll = () => {
      const candles = ctx.candles;
      const n = candles.length;
      for (const s of [high, low, mid]) s.values.fill(NaN);
      if (!n) return;

      let sessionStart = getSessionStart(new Date(candles[0].t));
      let sessionKey = sessionStart.getTime();
      let sessionBarIndex = 0;
      let orHigh = Number.NEGATIVE_INFINITY;
      let orLow = Number.POSITIVE_INFINITY;
      let orReady = false;

      const durationMs = getDurationMs();

      for (let i = 0; i < n; i++) {
        const candle = candles[i];
        const date = new Date(candle.t);
        const start = getSessionStart(date);
        const key = start.getTime();

        if (key !== sessionKey) {
          sessionStart = start;
          sessionKey = key;
          sessionBarIndex = 0;
          orHigh = Number.NEGATIVE_INFINITY;
          orLow = Number.POSITIVE_INFINITY;
          orReady = false;
        }

        let inWindow = false;
        if (params.durationMode === 'bars') {
          inWindow = sessionBarIndex < Math.max(1, Math.floor(params.durationBars));
        } else if (durationMs !== null) {
          const diff = date.getTime() - sessionStart.getTime();
          inWindow = diff >= 0 && diff <= durationMs;
        }

        if (inWindow) {
          orHigh = Math.max(orHigh, candle.h);
          orLow = Math.min(orLow, candle.l);
          orReady = true;
        }

        const shouldDraw = params.extend ? orReady : inWindow && orReady;
        if (shouldDraw) {
          high.values[i] = orHigh;
          low.values[i] = orLow;
          mid.values[i] = params.showMid ? (orHigh + orLow) / 2 : NaN;
        } else {
          high.values[i] = NaN;
          low.values[i] = NaN;
          mid.values[i] = NaN;
        }

        sessionBarIndex += 1;
      }
    };

    return {
      type: 'openingrange',
      params,
      panel: 'chart',
      series: [high, low, mid],
      warmupPeriod: 0,

      onCalculate(bar: number) {
        if (bar !== ctx.barsCount() - 1) return;
        recalcAll();
      },

      onParamsChanged(next: OpeningRangeParams) {
        params = next;
        high.color = next.highColor;
        low.color = next.lowColor;
        mid.color = next.midColor;
        for (const s of [high, low, mid]) {
          s.width = next.width;
          s.lineStyle = next.lineStyle;
        }
        mid.visible = next.showMid;
        ctx.requestRecalc();
      },
    };
  },
};
