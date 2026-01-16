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

export type WmaParams = {
  source: SourceType;
  period: number;
  offset: number;
  color: string;
  width: number;
  lineStyle: LineStyle;
};

const wmaParamsSchema: ParamSchema<WmaParams> = {
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
  color: { type: 'color', title: 'Color', default: '#e67e22' },
  width: { type: 'int', title: 'Width', default: 1, min: 1, max: 5, step: 1 },
  lineStyle: { ...lineStyleField },
};

export const WmaIndicator: IndicatorDefinition<WmaParams> = {
  type: 'wma',
  displayName: 'WMA',
  category: 'Trend',
  defaultPanel: 'chart',
  panelBehavior: 'fixed',
  paramsSchema: wmaParamsSchema,

  create(ctx: IndicatorContext, params: WmaParams): IndicatorInstance<WmaParams> {
    const series: DataSeries = {
      id: 'WMA',
      name: `WMA(${params.period})`,
      visual: 'Line',
      values: new Float64Array(ctx.barsCount()),
      color: params.color,
      width: params.width,
      lineStyle: params.lineStyle,
      visible: true,
    };
    series.values.fill(NaN);

    const getSrc = (bar: number) => ctx.source(bar, params.source);

    const writeOffset = (bar: number, value: number) => {
      const target = bar + Math.floor(params.offset);
      if (target < 0 || target >= series.values.length) return;
      series.values[target] = value;
    };

    const calcBar = (bar: number) => {
      if (bar === 0) {
        series.values.fill(NaN);
      }

      const p = Math.max(1, Math.floor(params.period));
      if (bar < p - 1) {
        writeOffset(bar, NaN);
        return;
      }

      const weightSum = (p * (p + 1)) / 2;
      let weighted = 0;
      let w = 1;
      for (let i = bar - p + 1; i <= bar; i++) {
        weighted += w * getSrc(i);
        w += 1;
      }
      writeOffset(bar, weighted / weightSum);
    };

    return {
      type: 'wma',
      params,
      panel: 'chart',
      series: [series],
      warmupPeriod: Math.max(0, Math.floor(params.period) - 1),

      onCalculate(bar: number) {
        if (bar < 0 || bar >= ctx.barsCount()) return;
        calcBar(bar);
      },

      onParamsChanged(next: WmaParams) {
        params = next;
        series.color = next.color;
        series.width = next.width;
        series.lineStyle = next.lineStyle;
        series.name = `WMA(${next.period})`;
        series.values.fill(NaN);
        this.warmupPeriod = Math.max(0, Math.floor(next.period) - 1);
        ctx.requestRecalc();
      },
    };
  },
};
