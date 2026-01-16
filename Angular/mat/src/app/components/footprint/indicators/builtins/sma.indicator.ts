import {
  DataSeries,
  IndicatorContext,
  IndicatorDefinition,
  IndicatorInstance,
  ParamSchema,
  SourceType,
} from '../indicator-api';

export type SmaParams = {
  source: 'close' | 'open' | 'high' | 'low';
  period: number;
  color: string;
  width: number;
};

const smaParamsSchema: ParamSchema<SmaParams> = {
  source: {
    type: 'enum',
    title: 'Source',
    default: 'close',
    options: [
      { value: 'close', label: 'Close' },
      { value: 'open', label: 'Open' },
      { value: 'high', label: 'High' },
      { value: 'low', label: 'Low' },
    ],
  },
  period: { type: 'int', title: 'Period', default: 20, min: 1, max: 500, step: 1 },
  color: { type: 'color', title: 'Color', default: '#f1c40f' },
  width: { type: 'int', title: 'Width', default: 1, min: 1, max: 5, step: 1 },
};

export const SmaIndicator: IndicatorDefinition<SmaParams> = {
  type: 'sma',
  displayName: 'SMA',
  category: 'Trend',
  defaultPanel: 'chart',
  panelBehavior: 'fixed',
  paramsSchema: smaParamsSchema,

  create(ctx: IndicatorContext, params: SmaParams): IndicatorInstance<SmaParams> {
    const series: DataSeries = {
      id: 'SMA',
      name: `SMA(${params.period})`,
      visual: 'Line',
      values: new Float64Array(ctx.barsCount()),
      color: params.color,
      width: params.width,
      visible: true,
    };
    series.values.fill(NaN);

    const getSrc = (bar: number) => ctx.source(bar, params.source as SourceType);

    const calcBar = (bar: number) => {
      const p = Math.max(1, Math.floor(params.period));
      if (bar < p - 1) {
        series.values[bar] = NaN;
        return;
      }

      let sum = 0;
      for (let i = bar - p + 1; i <= bar; i++) sum += getSrc(i);
      series.values[bar] = sum / p;
    };

    return {
      type: 'sma',
      params,
      panel: 'chart',
      series: [series],
      warmupPeriod: Math.max(0, Math.floor(params.period) - 1),

      onCalculate(bar: number) {
        if (bar < 0 || bar >= ctx.barsCount()) return;
        calcBar(bar);
      },

      onParamsChanged(next: SmaParams) {
        params = next;
        series.color = next.color;
        series.width = next.width;
        series.name = `SMA(${next.period})`;
        this.warmupPeriod = Math.max(0, Math.floor(next.period) - 1);
        ctx.requestRecalc();
      },
    };
  },
};
