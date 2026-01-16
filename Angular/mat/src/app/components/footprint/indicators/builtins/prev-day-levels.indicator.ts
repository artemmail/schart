import {
  DataSeries,
  IndicatorContext,
  IndicatorDefinition,
  IndicatorInstance,
  LineStyle,
  ParamSchema,
} from '../indicator-api';
import { dayKey, lineStyleField } from './indicator-utils';

export type PrevDayLevelsParams = {
  showPrevHigh: boolean;
  showPrevLow: boolean;
  showPrevClose: boolean;
  showTodayOpen: boolean;
  extend: 'today' | 'full';
  prevHighColor: string;
  prevLowColor: string;
  prevCloseColor: string;
  todayOpenColor: string;
  width: number;
  lineStyle: LineStyle;
};

const prevDayLevelsParamsSchema: ParamSchema<PrevDayLevelsParams> = {
  showPrevHigh: { type: 'bool', title: 'Show Prev High', default: true },
  showPrevLow: { type: 'bool', title: 'Show Prev Low', default: true },
  showPrevClose: { type: 'bool', title: 'Show Prev Close', default: true },
  showTodayOpen: { type: 'bool', title: 'Show Today Open', default: true },
  extend: {
    type: 'enum',
    title: 'Extend',
    default: 'full',
    options: [
      { value: 'today', label: 'Only Today' },
      { value: 'full', label: 'Full Right' },
    ],
  },
  prevHighColor: { type: 'color', title: 'Prev High Color', default: '#e67e22' },
  prevLowColor: { type: 'color', title: 'Prev Low Color', default: '#27ae60' },
  prevCloseColor: { type: 'color', title: 'Prev Close Color', default: '#3498db' },
  todayOpenColor: { type: 'color', title: 'Today Open Color', default: '#9b59b6' },
  width: { type: 'int', title: 'Width', default: 1, min: 1, max: 5, step: 1 },
  lineStyle: { ...lineStyleField },
};

export const PrevDayLevelsIndicator: IndicatorDefinition<PrevDayLevelsParams> = {
  type: 'prevday',
  displayName: 'Previous Day Levels',
  category: 'Levels',
  defaultPanel: 'chart',
  panelBehavior: 'fixed',
  paramsSchema: prevDayLevelsParamsSchema,

  create(ctx: IndicatorContext, params: PrevDayLevelsParams): IndicatorInstance<PrevDayLevelsParams> {
    const prevHigh: DataSeries = {
      id: 'PDH',
      name: 'Prev High',
      visual: 'Line',
      values: new Float64Array(ctx.barsCount()),
      color: params.prevHighColor,
      width: params.width,
      lineStyle: params.lineStyle,
      visible: params.showPrevHigh,
    };
    const prevLow: DataSeries = {
      id: 'PDL',
      name: 'Prev Low',
      visual: 'Line',
      values: new Float64Array(ctx.barsCount()),
      color: params.prevLowColor,
      width: params.width,
      lineStyle: params.lineStyle,
      visible: params.showPrevLow,
    };
    const prevClose: DataSeries = {
      id: 'PDC',
      name: 'Prev Close',
      visual: 'Line',
      values: new Float64Array(ctx.barsCount()),
      color: params.prevCloseColor,
      width: params.width,
      lineStyle: params.lineStyle,
      visible: params.showPrevClose,
    };
    const todayOpen: DataSeries = {
      id: 'TDO',
      name: 'Today Open',
      visual: 'Line',
      values: new Float64Array(ctx.barsCount()),
      color: params.todayOpenColor,
      width: params.width,
      lineStyle: params.lineStyle,
      visible: params.showTodayOpen,
    };
    for (const s of [prevHigh, prevLow, prevClose, todayOpen]) s.values.fill(NaN);

    const recalcAll = () => {
      const candles = ctx.candles;
      const n = candles.length;
      for (const s of [prevHigh, prevLow, prevClose, todayOpen]) s.values.fill(NaN);
      if (!n) return;

      let currentKey = dayKey(new Date(candles[0].t));
      let dayStart = 0;
      let dayOpen = candles[0].o;
      let dayHigh = candles[0].h;
      let dayLow = candles[0].l;
      let prevStats: { h: number; l: number; c: number } | null = null;

      for (let i = 0; i < n; i++) {
        const candle = candles[i];
        const key = dayKey(new Date(candle.t));

        if (key !== currentKey) {
          const close = candles[i - 1].c;
          if (prevStats) {
            for (let j = dayStart; j <= i - 1; j++) {
              prevHigh.values[j] = prevStats.h;
              prevLow.values[j] = prevStats.l;
              prevClose.values[j] = prevStats.c;
            }
          }
          for (let j = dayStart; j <= i - 1; j++) {
            todayOpen.values[j] = dayOpen;
          }

          prevStats = { h: dayHigh, l: dayLow, c: close };
          currentKey = key;
          dayStart = i;
          dayOpen = candle.o;
          dayHigh = candle.h;
          dayLow = candle.l;
        } else {
          if (candle.h > dayHigh) dayHigh = candle.h;
          if (candle.l < dayLow) dayLow = candle.l;
        }
      }

      if (prevStats) {
        for (let j = dayStart; j <= n - 1; j++) {
          prevHigh.values[j] = prevStats.h;
          prevLow.values[j] = prevStats.l;
          prevClose.values[j] = prevStats.c;
        }
      }
      for (let j = dayStart; j <= n - 1; j++) {
        todayOpen.values[j] = dayOpen;
      }

      if (params.extend === 'today') {
        for (let i = 0; i < dayStart; i++) {
          prevHigh.values[i] = NaN;
          prevLow.values[i] = NaN;
          prevClose.values[i] = NaN;
          todayOpen.values[i] = NaN;
        }
      }
    };

    return {
      type: 'prevday',
      params,
      panel: 'chart',
      series: [prevHigh, prevLow, prevClose, todayOpen],
      warmupPeriod: 0,

      onCalculate(bar: number) {
        if (bar !== ctx.barsCount() - 1) return;
        recalcAll();
      },

      onParamsChanged(next: PrevDayLevelsParams) {
        params = next;
        prevHigh.color = next.prevHighColor;
        prevLow.color = next.prevLowColor;
        prevClose.color = next.prevCloseColor;
        todayOpen.color = next.todayOpenColor;
        for (const s of [prevHigh, prevLow, prevClose, todayOpen]) {
          s.width = next.width;
          s.lineStyle = next.lineStyle;
        }
        prevHigh.visible = next.showPrevHigh;
        prevLow.visible = next.showPrevLow;
        prevClose.visible = next.showPrevClose;
        todayOpen.visible = next.showTodayOpen;
        ctx.requestRecalc();
      },
    };
  },
};
