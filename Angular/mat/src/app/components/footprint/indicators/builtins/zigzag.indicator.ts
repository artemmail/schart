import {
  DataSeries,
  IndicatorContext,
  IndicatorDefinition,
  IndicatorInstance,
  LineStyle,
  ParamSchema,
} from '../indicator-api';
import { lineStyleField } from './indicator-utils';

export type ZigZagParams = {
  deviationMode: 'percent' | 'points';
  deviation: number;
  depth: number;
  backstep: number;
  showPivotLabels: boolean;
  color: string;
  width: number;
  lineStyle: LineStyle;
};

const zigzagParamsSchema: ParamSchema<ZigZagParams> = {
  deviationMode: {
    type: 'enum',
    title: 'Deviation Mode',
    default: 'percent',
    options: [
      { value: 'percent', label: 'Percent' },
      { value: 'points', label: 'Points' },
    ],
  },
  deviation: { type: 'float', title: 'Deviation', default: 5, min: 0.1, max: 50, step: 0.1 },
  depth: { type: 'int', title: 'Depth', default: 5, min: 1, max: 200, step: 1 },
  backstep: { type: 'int', title: 'Backstep', default: 3, min: 0, max: 50, step: 1 },
  showPivotLabels: { type: 'bool', title: 'Show Pivot Labels', default: false },
  color: { type: 'color', title: 'Color', default: '#f1c40f' },
  width: { type: 'int', title: 'Width', default: 2, min: 1, max: 5, step: 1 },
  lineStyle: { ...lineStyleField },
};

export const ZigZagIndicator: IndicatorDefinition<ZigZagParams> = {
  type: 'zigzag',
  displayName: 'ZigZag',
  category: 'Trend',
  defaultPanel: 'chart',
  panelBehavior: 'fixed',
  paramsSchema: zigzagParamsSchema,

  create(ctx: IndicatorContext, params: ZigZagParams): IndicatorInstance<ZigZagParams> {
    const line: DataSeries = {
      id: 'ZIGZAG',
      name: 'ZigZag',
      visual: 'Line',
      values: new Float64Array(ctx.barsCount()),
      color: params.color,
      width: params.width,
      lineStyle: params.lineStyle,
      visible: true,
    };
    line.values.fill(NaN);

    const isMoveUp = (from: number, to: number) => {
      if (params.deviationMode === 'points') {
        return to - from >= params.deviation;
      }
      if (from === 0) return false;
      return (to - from) / Math.abs(from) >= params.deviation / 100;
    };

    const isMoveDown = (from: number, to: number) => {
      if (params.deviationMode === 'points') {
        return from - to >= params.deviation;
      }
      if (from === 0) return false;
      return (from - to) / Math.abs(from) >= params.deviation / 100;
    };

    const recalcAll = () => {
      const candles = ctx.candles;
      const n = candles.length;
      line.values.fill(NaN);
      if (!n) return;

      const minBars = Math.max(1, Math.max(Math.floor(params.depth), Math.floor(params.backstep)));

      const pivots: { index: number; price: number }[] = [];
      pivots.push({ index: 0, price: candles[0].c });

      let trend = 0; // 1 up, -1 down, 0 unknown
      let lastPivotIndex = 0;

      let candidateHigh = candles[0].h;
      let candidateHighIndex = 0;
      let candidateLow = candles[0].l;
      let candidateLowIndex = 0;

      for (let i = 1; i < n; i++) {
        const hi = candles[i].h;
        const lo = candles[i].l;

        if (hi >= candidateHigh) {
          candidateHigh = hi;
          candidateHighIndex = i;
        }
        if (lo <= candidateLow) {
          candidateLow = lo;
          candidateLowIndex = i;
        }

        if (trend === 0) {
          if (isMoveDown(candidateHigh, lo) && candidateHighIndex - lastPivotIndex >= minBars) {
            pivots.push({ index: candidateHighIndex, price: candidateHigh });
            trend = -1;
            lastPivotIndex = candidateHighIndex;
            candidateLow = lo;
            candidateLowIndex = i;
          } else if (isMoveUp(candidateLow, hi) && candidateLowIndex - lastPivotIndex >= minBars) {
            pivots.push({ index: candidateLowIndex, price: candidateLow });
            trend = 1;
            lastPivotIndex = candidateLowIndex;
            candidateHigh = hi;
            candidateHighIndex = i;
          }
        } else if (trend === 1) {
          if (isMoveDown(candidateHigh, lo) && candidateHighIndex - lastPivotIndex >= minBars) {
            pivots.push({ index: candidateHighIndex, price: candidateHigh });
            trend = -1;
            lastPivotIndex = candidateHighIndex;
            candidateLow = lo;
            candidateLowIndex = i;
          }
        } else if (trend === -1) {
          if (isMoveUp(candidateLow, hi) && candidateLowIndex - lastPivotIndex >= minBars) {
            pivots.push({ index: candidateLowIndex, price: candidateLow });
            trend = 1;
            lastPivotIndex = candidateLowIndex;
            candidateHigh = hi;
            candidateHighIndex = i;
          }
        }
      }

      if (trend >= 0) {
        pivots.push({ index: candidateHighIndex, price: candidateHigh });
      } else {
        pivots.push({ index: candidateLowIndex, price: candidateLow });
      }

      for (let p = 0; p < pivots.length - 1; p++) {
        const a = pivots[p];
        const b = pivots[p + 1];
        if (a.index === b.index) continue;
        const span = b.index - a.index;
        for (let i = a.index; i <= b.index; i++) {
          const t = (i - a.index) / span;
          line.values[i] = a.price + (b.price - a.price) * t;
        }
      }
    };

    return {
      type: 'zigzag',
      params,
      panel: 'chart',
      series: [line],
      warmupPeriod: Math.max(params.depth, params.backstep),

      onCalculate(bar: number) {
        if (bar !== ctx.barsCount() - 1) return;
        recalcAll();
      },

      onParamsChanged(next: ZigZagParams) {
        params = next;
        line.color = next.color;
        line.width = next.width;
        line.lineStyle = next.lineStyle;
        this.warmupPeriod = Math.max(next.depth, next.backstep);
        ctx.requestRecalc();
      },
    };
  },
};
