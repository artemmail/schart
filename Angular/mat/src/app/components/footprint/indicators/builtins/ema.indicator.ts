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

export type EmaParams = {
  source: SourceType;
  period: number;
  offset: number;
  color: string;
  width: number;
  lineStyle: LineStyle;
};

const emaParamsSchema: ParamSchema<EmaParams> = {
  source: {
    type: 'enum',
    title: 'Source',
    default: 'close',
    options: [
      { value: 'close', label: 'Close' },
      { value: 'open', label: 'Open' },
      { value: 'high', label: 'High' },
      { value: 'low', label: 'Low' },
      { value: 'hl2', label: 'HL2' },
      { value: 'hlc3', label: 'HLC3' },
      { value: 'ohlc4', label: 'OHLC4' },
    ],
  },
  period: { type: 'int', title: 'Length', default: 10, min: 1, max: 500, step: 1 },
  offset: { type: 'int', title: 'Offset', default: 0, min: -500, max: 500, step: 1 },
  color: { type: 'color', title: 'Color', default: '#f39c12' },
  width: { type: 'int', title: 'Width', default: 1, min: 1, max: 5, step: 1 },
  lineStyle: { ...lineStyleField },
};

export const EmaIndicator: IndicatorDefinition<EmaParams> = {
  type: 'ema',
  displayName: 'EMA',
  category: 'Trend',
  defaultPanel: 'chart',
  panelBehavior: 'fixed',
  paramsSchema: emaParamsSchema,

  create(ctx: IndicatorContext, params: EmaParams): IndicatorInstance<EmaParams> {
    const series: DataSeries = {
      id: 'EMA',
      name: `EMA(${params.period})`,
      visual: 'Line',
      values: new Float64Array(ctx.barsCount()),
      color: params.color,
      width: params.width,
      lineStyle: params.lineStyle,
      visible: true,
    };
    series.values.fill(NaN);

    let emaRaw = new Float64Array(ctx.barsCount());
    emaRaw.fill(NaN);

    const ensureRaw = () => {
      const len = ctx.barsCount();
      if (emaRaw.length === len) return;
      const next = new Float64Array(len);
      next.fill(NaN);
      next.set(emaRaw.subarray(0, Math.min(emaRaw.length, len)));
      emaRaw = next;
    };

    const getSrc = (bar: number) => ctx.source(bar, params.source);

    const writeOffset = (bar: number, value: number) => {
      const target = bar + Math.floor(params.offset);
      if (target < 0 || target >= series.values.length) return;
      series.values[target] = value;
    };

    const calcBar = (bar: number) => {
      ensureRaw();
      if (bar === 0) {
        series.values.fill(NaN);
        emaRaw.fill(NaN);
      }

      const p = Math.max(1, Math.floor(params.period));
      const alpha = 2 / (p + 1);

      if (bar < p - 1) {
        emaRaw[bar] = NaN;
        writeOffset(bar, NaN);
        return;
      }

      if (bar === p - 1 || !isFinite(emaRaw[bar - 1])) {
        let sum = 0;
        for (let i = bar - p + 1; i <= bar; i++) sum += getSrc(i);
        emaRaw[bar] = sum / p;
      } else {
        const prev = emaRaw[bar - 1];
        const src = getSrc(bar);
        emaRaw[bar] = prev + alpha * (src - prev);
      }

      writeOffset(bar, emaRaw[bar]);
    };

    return {
      type: 'ema',
      params,
      panel: 'chart',
      series: [series],
      warmupPeriod: Math.max(0, Math.floor(params.period) - 1),

      onCalculate(bar: number) {
        if (bar < 0 || bar >= ctx.barsCount()) return;
        calcBar(bar);
      },

      onParamsChanged(next: EmaParams) {
        params = next;
        series.color = next.color;
        series.width = next.width;
        series.lineStyle = next.lineStyle;
        series.name = `EMA(${next.period})`;
        series.values.fill(NaN);
        emaRaw.fill(NaN);
        this.warmupPeriod = Math.max(0, Math.floor(next.period) - 1);
        ctx.requestRecalc();
      },
    };
  },
};
