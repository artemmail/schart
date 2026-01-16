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

export type RmaParams = {
  source: SourceType;
  period: number;
  offset: number;
  color: string;
  width: number;
  lineStyle: LineStyle;
};

const rmaParamsSchema: ParamSchema<RmaParams> = {
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
  color: { type: 'color', title: 'Color', default: '#9b59b6' },
  width: { type: 'int', title: 'Width', default: 1, min: 1, max: 5, step: 1 },
  lineStyle: { ...lineStyleField },
};

export const RmaIndicator: IndicatorDefinition<RmaParams> = {
  type: 'rma',
  displayName: 'RMA (SMMA)',
  category: 'Trend',
  defaultPanel: 'chart',
  panelBehavior: 'fixed',
  paramsSchema: rmaParamsSchema,

  create(ctx: IndicatorContext, params: RmaParams): IndicatorInstance<RmaParams> {
    const series: DataSeries = {
      id: 'RMA',
      name: `RMA(${params.period})`,
      visual: 'Line',
      values: new Float64Array(ctx.barsCount()),
      color: params.color,
      width: params.width,
      lineStyle: params.lineStyle,
      visible: true,
    };
    series.values.fill(NaN);

    let rmaRaw = new Float64Array(ctx.barsCount());
    rmaRaw.fill(NaN);

    const ensureRaw = () => {
      const len = ctx.barsCount();
      if (rmaRaw.length === len) return;
      const next = new Float64Array(len);
      next.fill(NaN);
      next.set(rmaRaw.subarray(0, Math.min(rmaRaw.length, len)));
      rmaRaw = next;
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
        rmaRaw.fill(NaN);
      }

      const p = Math.max(1, Math.floor(params.period));
      if (bar < p - 1) {
        rmaRaw[bar] = NaN;
        writeOffset(bar, NaN);
        return;
      }

      if (bar === p - 1 || !isFinite(rmaRaw[bar - 1])) {
        let sum = 0;
        for (let i = bar - p + 1; i <= bar; i++) sum += getSrc(i);
        rmaRaw[bar] = sum / p;
      } else {
        const prev = rmaRaw[bar - 1];
        const src = getSrc(bar);
        rmaRaw[bar] = (prev * (p - 1) + src) / p;
      }

      writeOffset(bar, rmaRaw[bar]);
    };

    return {
      type: 'rma',
      params,
      panel: 'chart',
      series: [series],
      warmupPeriod: Math.max(0, Math.floor(params.period) - 1),

      onCalculate(bar: number) {
        if (bar < 0 || bar >= ctx.barsCount()) return;
        calcBar(bar);
      },

      onParamsChanged(next: RmaParams) {
        params = next;
        series.color = next.color;
        series.width = next.width;
        series.lineStyle = next.lineStyle;
        series.name = `RMA(${next.period})`;
        series.values.fill(NaN);
        rmaRaw.fill(NaN);
        this.warmupPeriod = Math.max(0, Math.floor(next.period) - 1);
        ctx.requestRecalc();
      },
    };
  },
};
