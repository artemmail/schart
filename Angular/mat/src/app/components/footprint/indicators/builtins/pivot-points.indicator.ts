import {
  DataSeries,
  IndicatorContext,
  IndicatorDefinition,
  IndicatorInstance,
  LineStyle,
  ParamSchema,
} from '../indicator-api';
import { dayKey, isoWeekKey, lineStyleField, monthKey } from './indicator-utils';

export type PivotPointsParams = {
  timeframe: 'daily' | 'weekly' | 'monthly';
  method: 'classic' | 'fibonacci' | 'camarilla' | 'woodie';
  levels: number;
  showLabels: boolean;
  extend: 'current' | 'right' | 'full';
  pivotColor: string;
  resistanceColor: string;
  supportColor: string;
  width: number;
  lineStyle: LineStyle;
};

const pivotPointsParamsSchema: ParamSchema<PivotPointsParams> = {
  timeframe: {
    type: 'enum',
    title: 'Pivot Timeframe',
    default: 'daily',
    options: [
      { value: 'daily', label: 'Daily' },
      { value: 'weekly', label: 'Weekly' },
      { value: 'monthly', label: 'Monthly' },
    ],
  },
  method: {
    type: 'enum',
    title: 'Method',
    default: 'classic',
    options: [
      { value: 'classic', label: 'Classic' },
      { value: 'fibonacci', label: 'Fibonacci' },
      { value: 'camarilla', label: 'Camarilla' },
      { value: 'woodie', label: 'Woodie' },
    ],
  },
  levels: { type: 'int', title: 'Levels', default: 3, min: 1, max: 3, step: 1 },
  showLabels: { type: 'bool', title: 'Show Labels', default: false },
  extend: {
    type: 'enum',
    title: 'Extend Lines',
    default: 'full',
    options: [
      { value: 'current', label: 'Current Period' },
      { value: 'right', label: 'To Right' },
      { value: 'full', label: 'Full Chart' },
    ],
  },
  pivotColor: { type: 'color', title: 'Pivot Color', default: '#f1c40f' },
  resistanceColor: { type: 'color', title: 'Resistance Color', default: '#e67e22' },
  supportColor: { type: 'color', title: 'Support Color', default: '#27ae60' },
  width: { type: 'int', title: 'Width', default: 1, min: 1, max: 5, step: 1 },
  lineStyle: { ...lineStyleField },
};

export const PivotPointsIndicator: IndicatorDefinition<PivotPointsParams> = {
  type: 'pivot',
  displayName: 'Pivot Points',
  category: 'Levels',
  defaultPanel: 'chart',
  panelBehavior: 'fixed',
  paramsSchema: pivotPointsParamsSchema,

  create(ctx: IndicatorContext, params: PivotPointsParams): IndicatorInstance<PivotPointsParams> {
    const makeLine = (id: string, name: string, color: string): DataSeries => ({
      id,
      name,
      visual: 'Line',
      values: new Float64Array(ctx.barsCount()),
      color,
      width: params.width,
      lineStyle: params.lineStyle,
      visible: true,
    });

    const p = makeLine('PIVOT_P', 'Pivot P', params.pivotColor);
    const r1 = makeLine('PIVOT_R1', 'R1', params.resistanceColor);
    const r2 = makeLine('PIVOT_R2', 'R2', params.resistanceColor);
    const r3 = makeLine('PIVOT_R3', 'R3', params.resistanceColor);
    const s1 = makeLine('PIVOT_S1', 'S1', params.supportColor);
    const s2 = makeLine('PIVOT_S2', 'S2', params.supportColor);
    const s3 = makeLine('PIVOT_S3', 'S3', params.supportColor);
    for (const s of [p, r1, r2, r3, s1, s2, s3]) s.values.fill(NaN);

    const getKey = (date: Date) => {
      switch (params.timeframe) {
        case 'weekly':
          return isoWeekKey(date);
        case 'monthly':
          return monthKey(date);
        case 'daily':
        default:
          return dayKey(date);
      }
    };

    const computeLevels = (h: number, l: number, c: number) => {
      const range = h - l;
      let pivot = 0;
      let r1v = 0;
      let s1v = 0;
      let r2v = 0;
      let s2v = 0;
      let r3v = 0;
      let s3v = 0;

      switch (params.method) {
        case 'fibonacci':
          pivot = (h + l + c) / 3;
          r1v = pivot + 0.382 * range;
          s1v = pivot - 0.382 * range;
          r2v = pivot + 0.618 * range;
          s2v = pivot - 0.618 * range;
          r3v = pivot + 1.0 * range;
          s3v = pivot - 1.0 * range;
          break;
        case 'camarilla': {
          pivot = (h + l + c) / 3;
          const k = 1.1;
          r1v = c + (range * k) / 12;
          r2v = c + (range * k) / 6;
          r3v = c + (range * k) / 4;
          s1v = c - (range * k) / 12;
          s2v = c - (range * k) / 6;
          s3v = c - (range * k) / 4;
          break;
        }
        case 'woodie':
          pivot = (h + l + 2 * c) / 4;
          r1v = 2 * pivot - l;
          s1v = 2 * pivot - h;
          r2v = pivot + range;
          s2v = pivot - range;
          r3v = h + 2 * (pivot - l);
          s3v = l - 2 * (h - pivot);
          break;
        case 'classic':
        default:
          pivot = (h + l + c) / 3;
          r1v = 2 * pivot - l;
          s1v = 2 * pivot - h;
          r2v = pivot + range;
          s2v = pivot - range;
          r3v = pivot + 2 * range;
          s3v = pivot - 2 * range;
          break;
      }

      return { pivot, r1v, r2v, r3v, s1v, s2v, s3v };
    };

    const fillRange = (
      start: number,
      end: number,
      levels: { pivot: number; r1v: number; r2v: number; r3v: number; s1v: number; s2v: number; s3v: number }
    ) => {
      for (let i = start; i <= end; i++) {
        p.values[i] = levels.pivot;
        r1.values[i] = levels.r1v;
        r2.values[i] = levels.r2v;
        r3.values[i] = levels.r3v;
        s1.values[i] = levels.s1v;
        s2.values[i] = levels.s2v;
        s3.values[i] = levels.s3v;
      }
    };

    const recalcAll = () => {
      const candles = ctx.candles;
      const n = candles.length;
      for (const s of [p, r1, r2, r3, s1, s2, s3]) s.values.fill(NaN);
      if (!n) return;

      let currentKey = getKey(new Date(candles[0].t));
      let periodStart = 0;
      let high = candles[0].h;
      let low = candles[0].l;
      let prevStats: { h: number; l: number; c: number } | null = null;

      for (let i = 0; i < n; i++) {
        const candle = candles[i];
        const key = getKey(new Date(candle.t));

        if (key !== currentKey) {
          const close = candles[i - 1].c;
          if (prevStats) {
            const levels = computeLevels(prevStats.h, prevStats.l, prevStats.c);
            fillRange(periodStart, i - 1, levels);
          }

          prevStats = { h: high, l: low, c: close };
          currentKey = key;
          periodStart = i;
          high = candle.h;
          low = candle.l;
        } else {
          if (candle.h > high) high = candle.h;
          if (candle.l < low) low = candle.l;
        }
      }

      if (prevStats) {
        const levels = computeLevels(prevStats.h, prevStats.l, prevStats.c);
        fillRange(periodStart, n - 1, levels);
      }

      if (params.extend === 'current') {
        for (let i = 0; i < periodStart; i++) {
          p.values[i] = NaN;
          r1.values[i] = NaN;
          r2.values[i] = NaN;
          r3.values[i] = NaN;
          s1.values[i] = NaN;
          s2.values[i] = NaN;
          s3.values[i] = NaN;
        }
      }
    };

    return {
      type: 'pivot',
      params,
      panel: 'chart',
      series: [p, r1, r2, r3, s1, s2, s3],
      warmupPeriod: 0,

      onCalculate(bar: number) {
        if (bar !== ctx.barsCount() - 1) return;
        recalcAll();
      },

      onParamsChanged(next: PivotPointsParams) {
        params = next;
        p.color = next.pivotColor;
        r1.color = next.resistanceColor;
        r2.color = next.resistanceColor;
        r3.color = next.resistanceColor;
        s1.color = next.supportColor;
        s2.color = next.supportColor;
        s3.color = next.supportColor;
        for (const s of [p, r1, r2, r3, s1, s2, s3]) {
          s.width = next.width;
          s.lineStyle = next.lineStyle;
        }
        r2.visible = next.levels >= 2;
        s2.visible = next.levels >= 2;
        r3.visible = next.levels >= 3;
        s3.visible = next.levels >= 3;
        ctx.requestRecalc();
      },
    };
  },
};
