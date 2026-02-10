import {
  DataSeries,
  IndicatorContext,
  IndicatorDefinition,
  IndicatorInstance,
  LineStyle,
  ParamSchema,
} from '../indicator-api';
import { lineStyleField, lineStyleOptions } from './indicator-utils';

export type StochasticParams = {
  kPeriod: number;
  smoothK: number;
  dPeriod: number;
  showLevels: boolean;
  overbought: number;
  oversold: number;
  kColor: string;
  dColor: string;
  levelsColor: string;
  width: number;
  levelsWidth: number;
  lineStyle: LineStyle;
  levelsLineStyle: LineStyle;
};

const stochasticParamsSchema: ParamSchema<StochasticParams> = {
  kPeriod: { type: 'int', title: 'K Period', default: 14, min: 1, max: 500, step: 1 },
  smoothK: { type: 'int', title: 'K Smoothing', default: 3, min: 1, max: 100, step: 1 },
  dPeriod: { type: 'int', title: 'D Period', default: 3, min: 1, max: 100, step: 1 },
  showLevels: { type: 'bool', title: 'Show 20/80 Levels', default: true },
  overbought: { type: 'float', title: 'Overbought', default: 80, min: 0, max: 100, step: 0.1 },
  oversold: { type: 'float', title: 'Oversold', default: 20, min: 0, max: 100, step: 0.1 },
  kColor: { type: 'color', title: '%K Color', default: '#1f77b4' },
  dColor: { type: 'color', title: '%D Color', default: '#ff7f0e' },
  levelsColor: { type: 'color', title: 'Levels Color', default: '#95a5a6' },
  width: { type: 'int', title: 'Line Width', default: 2, min: 1, max: 5, step: 1 },
  levelsWidth: { type: 'int', title: 'Levels Width', default: 1, min: 1, max: 3, step: 1 },
  lineStyle: { ...lineStyleField },
  levelsLineStyle: {
    type: 'enum',
    title: 'Levels Line Style',
    default: 'dashed',
    options: lineStyleOptions,
  },
};

const STOCH_FIXED_RANGE = Object.freeze({ min: 0, max: 100 });

function asPeriod(value: number): number {
  return Math.max(1, Math.floor(value));
}

function clamp01Hundred(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function computeWarmup(params: StochasticParams): number {
  return Math.max(0, asPeriod(params.kPeriod) + asPeriod(params.smoothK) + asPeriod(params.dPeriod) - 3);
}

function seriesName(params: StochasticParams): string {
  return `Stoch(${asPeriod(params.kPeriod)}, ${asPeriod(params.smoothK)}, ${asPeriod(params.dPeriod)})`;
}

export const StochasticIndicator: IndicatorDefinition<StochasticParams> = {
  type: 'stochastic',
  displayName: 'Stochastic Oscillator',
  category: 'Momentum',
  defaultPanel: 'newPanel',
  panelBehavior: 'fixed',
  paramsSchema: stochasticParamsSchema,

  create(ctx: IndicatorContext, params: StochasticParams): IndicatorInstance<StochasticParams> {
    const createValues = () => {
      const values = new Float64Array(ctx.barsCount());
      values.fill(NaN);
      return values;
    };

    const stochK: DataSeries = {
      id: 'STOCH_K',
      name: `%K ${seriesName(params)}`,
      visual: 'Line',
      values: createValues(),
      color: params.kColor,
      width: params.width,
      lineStyle: params.lineStyle,
      visible: true,
      fixedRange: STOCH_FIXED_RANGE,
    };

    const stochD: DataSeries = {
      id: 'STOCH_D',
      name: `%D ${seriesName(params)}`,
      visual: 'Line',
      values: createValues(),
      color: params.dColor,
      width: params.width,
      lineStyle: params.lineStyle,
      visible: true,
      fixedRange: STOCH_FIXED_RANGE,
    };

    const overbought: DataSeries = {
      id: 'STOCH_OB',
      name: 'Overbought',
      visual: 'Line',
      values: createValues(),
      color: params.levelsColor,
      width: params.levelsWidth,
      lineStyle: params.levelsLineStyle,
      visible: params.showLevels,
      fixedRange: STOCH_FIXED_RANGE,
    };

    const oversold: DataSeries = {
      id: 'STOCH_OS',
      name: 'Oversold',
      visual: 'Line',
      values: createValues(),
      color: params.levelsColor,
      width: params.levelsWidth,
      lineStyle: params.levelsLineStyle,
      visible: params.showLevels,
      fixedRange: STOCH_FIXED_RANGE,
    };

    let rawK = createValues();
    let smoothK = createValues();

    const ensureBuffers = () => {
      const barsCount = ctx.barsCount();
      if (rawK.length !== barsCount) {
        const next = new Float64Array(barsCount);
        next.fill(NaN);
        next.set(rawK.subarray(0, Math.min(rawK.length, barsCount)));
        rawK = next;
      }
      if (smoothK.length !== barsCount) {
        const next = new Float64Array(barsCount);
        next.fill(NaN);
        next.set(smoothK.subarray(0, Math.min(smoothK.length, barsCount)));
        smoothK = next;
      }
    };

    const sma = (arr: Float64Array, bar: number, period: number): number => {
      const p = asPeriod(period);
      if (bar < p - 1) return NaN;
      let sum = 0;
      for (let i = bar - p + 1; i <= bar; i++) {
        const v = arr[i];
        if (!isFinite(v)) return NaN;
        sum += v;
      }
      return sum / p;
    };

    const calcRawK = (bar: number): number => {
      const p = asPeriod(params.kPeriod);
      if (bar < p - 1) return NaN;

      let highest = Number.NEGATIVE_INFINITY;
      let lowest = Number.POSITIVE_INFINITY;
      for (let i = bar - p + 1; i <= bar; i++) {
        const h = ctx.source(i, 'high');
        const l = ctx.source(i, 'low');
        if (!isFinite(h) || !isFinite(l)) return NaN;
        highest = Math.max(highest, h);
        lowest = Math.min(lowest, l);
      }

      const close = ctx.source(bar, 'close');
      if (!isFinite(close)) return NaN;

      const span = highest - lowest;
      if (span <= 0) {
        const prev = bar > 0 ? rawK[bar - 1] : NaN;
        return isFinite(prev) ? prev : 50;
      }

      return clamp01Hundred(((close - lowest) / span) * 100);
    };

    const updateVisualProps = (next: StochasticParams) => {
      stochK.color = next.kColor;
      stochD.color = next.dColor;
      stochK.width = next.width;
      stochD.width = next.width;
      stochK.lineStyle = next.lineStyle;
      stochD.lineStyle = next.lineStyle;
      stochK.name = `%K ${seriesName(next)}`;
      stochD.name = `%D ${seriesName(next)}`;

      overbought.color = next.levelsColor;
      oversold.color = next.levelsColor;
      overbought.width = next.levelsWidth;
      oversold.width = next.levelsWidth;
      overbought.lineStyle = next.levelsLineStyle;
      oversold.lineStyle = next.levelsLineStyle;
      overbought.visible = next.showLevels;
      oversold.visible = next.showLevels;
      overbought.name = `Overbought ${next.overbought}`;
      oversold.name = `Oversold ${next.oversold}`;
    };

    updateVisualProps(params);

    return {
      type: 'stochastic',
      params,
      panel: 'chart',
      series: [stochK, stochD, overbought, oversold],
      warmupPeriod: computeWarmup(params),

      onCalculate(bar: number) {
        if (bar < 0 || bar >= ctx.barsCount()) return;
        ensureBuffers();

        const kRaw = calcRawK(bar);
        rawK[bar] = kRaw;

        const kSmoothed = sma(rawK, bar, params.smoothK);
        smoothK[bar] = kSmoothed;

        const dSmoothed = sma(smoothK, bar, params.dPeriod);
        stochK.values[bar] = kSmoothed;
        stochD.values[bar] = dSmoothed;

        if (params.showLevels) {
          overbought.values[bar] = params.overbought;
          oversold.values[bar] = params.oversold;
        } else {
          overbought.values[bar] = NaN;
          oversold.values[bar] = NaN;
        }
      },

      onParamsChanged(next: StochasticParams) {
        params = next;
        updateVisualProps(next);

        rawK.fill(NaN);
        smoothK.fill(NaN);
        stochK.values.fill(NaN);
        stochD.values.fill(NaN);
        overbought.values.fill(NaN);
        oversold.values.fill(NaN);

        this.warmupPeriod = computeWarmup(next);
        ctx.requestRecalc();
      },
    };
  },
};
