import {
  DataSeries,
  IndicatorContext,
  IndicatorDefinition,
  IndicatorInstance,
  ParamSchema,
  SourceType,
} from '../indicator-api';

export type BollingerParams = {
  source: 'close' | 'open' | 'high' | 'low';
  period: number;
  mult: number;
  middleColor: string;
  upperColor: string;
  lowerColor: string;
  width: number;
};

const bollingerParamsSchema: ParamSchema<BollingerParams> = {
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
  period: { type: 'int', title: 'Period', default: 10, min: 1, max: 500, step: 1 },
  mult: { type: 'float', title: 'StdDev Mult', default: 2, min: 0.1, max: 10, step: 0.1 },
  middleColor: { type: 'color', title: 'Middle Color', default: '#f1c40f' },
  upperColor: { type: 'color', title: 'Upper Color', default: '#3498db' },
  lowerColor: { type: 'color', title: 'Lower Color', default: '#3498db' },
  width: { type: 'int', title: 'Width', default: 1, min: 1, max: 5, step: 1 },
};

export const BollingerBandsIndicator: IndicatorDefinition<BollingerParams> = {
  type: 'bb',
  displayName: 'Bollinger Bands',
  category: 'Volatility',
  defaultPanel: 'chart',
  panelBehavior: 'fixed',
  paramsSchema: bollingerParamsSchema,

  create(ctx: IndicatorContext, params: BollingerParams): IndicatorInstance<BollingerParams> {
    const makeSeries = (id: string, name: string, color: string): DataSeries => {
      const s: DataSeries = {
        id,
        name,
        visual: 'Line',
        values: new Float64Array(ctx.barsCount()),
        color,
        width: params.width,
        visible: true,
      };
      s.values.fill(NaN);
      return s;
    };

    const name = () => `BB(${params.period}, ${params.mult})`;
    const middle = makeSeries('BB_MID', name(), params.middleColor);
    const upper = makeSeries('BB_UP', name(), params.upperColor);
    const lower = makeSeries('BB_LOW', name(), params.lowerColor);

    const getSrc = (bar: number) => ctx.source(bar, params.source as SourceType);

    const calcBar = (bar: number) => {
      const p = Math.max(1, Math.floor(params.period));
      if (bar < p - 1) {
        middle.values[bar] = NaN;
        upper.values[bar] = NaN;
        lower.values[bar] = NaN;
        return;
      }

      let sum = 0;
      for (let i = bar - p + 1; i <= bar; i++) sum += getSrc(i);
      const mean = sum / p;

      let sumSq = 0;
      for (let i = bar - p + 1; i <= bar; i++) {
        const d = getSrc(i) - mean;
        sumSq += d * d;
      }

      const variance = sumSq / p;
      const sd = Math.sqrt(Math.max(0, variance));
      const k = params.mult;

      middle.values[bar] = mean;
      upper.values[bar] = mean + k * sd;
      lower.values[bar] = mean - k * sd;
    };

    return {
      type: 'bb',
      params,
      panel: 'chart',
      series: [middle, upper, lower],
      warmupPeriod: Math.max(0, Math.floor(params.period) - 1),

      onCalculate(bar: number) {
        if (bar < 0 || bar >= ctx.barsCount()) return;
        calcBar(bar);
      },

      onParamsChanged(next: BollingerParams) {
        params = next;
        const nextName = `BB(${next.period}, ${next.mult})`;
        for (const s of [middle, upper, lower]) {
          s.name = nextName;
          s.width = next.width;
        }
        middle.color = next.middleColor;
        upper.color = next.upperColor;
        lower.color = next.lowerColor;
        this.warmupPeriod = Math.max(0, Math.floor(next.period) - 1);
        ctx.requestRecalc();
      },
    };
  },
};
