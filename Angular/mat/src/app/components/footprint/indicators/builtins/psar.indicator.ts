import {
  DataSeries,
  IndicatorContext,
  IndicatorDefinition,
  IndicatorInstance,
  ParamSchema,
} from '../indicator-api';

export type ParabolicSarParams = {
  step: number;
  maxStep: number;
  dotSize: number;
  color: string;
  highlightReversals: boolean;
};

const psarParamsSchema: ParamSchema<ParabolicSarParams> = {
  step: { type: 'float', title: 'Step', default: 0.02, min: 0.001, max: 1, step: 0.01 },
  maxStep: { type: 'float', title: 'Max Step', default: 0.2, min: 0.01, max: 1, step: 0.01 },
  dotSize: { type: 'int', title: 'Dot Size', default: 4, min: 2, max: 10, step: 1 },
  color: { type: 'color', title: 'Color', default: '#f39c12' },
  highlightReversals: { type: 'bool', title: 'Highlight Reversals', default: false },
};

export const ParabolicSarIndicator: IndicatorDefinition<ParabolicSarParams> = {
  type: 'psar',
  displayName: 'Parabolic SAR',
  category: 'Trend',
  defaultPanel: 'chart',
  panelBehavior: 'fixed',
  paramsSchema: psarParamsSchema,

  create(ctx: IndicatorContext, params: ParabolicSarParams): IndicatorInstance<ParabolicSarParams> {
    const sar: DataSeries = {
      id: 'PSAR',
      name: 'Parabolic SAR',
      visual: 'Points',
      values: new Float64Array(ctx.barsCount()),
      color: params.color,
      pointStyle: 'circle',
      pointSize: params.dotSize,
      visible: true,
    };
    sar.values.fill(NaN);

    const reversal: DataSeries = {
      id: 'PSAR_REV',
      name: 'SAR Reversal',
      visual: 'Points',
      values: new Float64Array(ctx.barsCount()),
      color: params.color,
      pointStyle: 'diamond',
      pointSize: Math.max(2, params.dotSize + 2),
      visible: params.highlightReversals,
    };
    reversal.values.fill(NaN);

    let sarRaw = new Float64Array(ctx.barsCount());
    let epRaw = new Float64Array(ctx.barsCount());
    let afRaw = new Float64Array(ctx.barsCount());
    let trendRaw = new Int8Array(ctx.barsCount());
    sarRaw.fill(NaN);
    epRaw.fill(NaN);
    afRaw.fill(NaN);

    const ensureArrays = () => {
      const len = ctx.barsCount();
      if (sarRaw.length !== len) {
        const next = new Float64Array(len);
        next.fill(NaN);
        next.set(sarRaw.subarray(0, Math.min(sarRaw.length, len)));
        sarRaw = next;
      }
      if (epRaw.length !== len) {
        const next = new Float64Array(len);
        next.fill(NaN);
        next.set(epRaw.subarray(0, Math.min(epRaw.length, len)));
        epRaw = next;
      }
      if (afRaw.length !== len) {
        const next = new Float64Array(len);
        next.fill(NaN);
        next.set(afRaw.subarray(0, Math.min(afRaw.length, len)));
        afRaw = next;
      }
      if (trendRaw.length !== len) {
        const next = new Int8Array(len);
        next.set(trendRaw.subarray(0, Math.min(trendRaw.length, len)));
        trendRaw = next;
      }
    };

    const calcBar = (bar: number) => {
      ensureArrays();
      if (bar === 0) {
        sar.values.fill(NaN);
        reversal.values.fill(NaN);
        sarRaw.fill(NaN);
        epRaw.fill(NaN);
        afRaw.fill(NaN);
        trendRaw.fill(0);
      }

      const candle = ctx.candles[bar];
      let reversalHit = false;

      if (bar === 0) {
        const up = candle.c >= candle.o;
        trendRaw[bar] = up ? 1 : -1;
        epRaw[bar] = up ? candle.h : candle.l;
        afRaw[bar] = params.step;
        sarRaw[bar] = up ? candle.l : candle.h;
      } else {
        const prevTrend = trendRaw[bar - 1] === 0 ? 1 : trendRaw[bar - 1];
        const prevSar = sarRaw[bar - 1];
        const prevEp = epRaw[bar - 1];
        const prevAf = afRaw[bar - 1];

        let nextSar = prevSar + prevAf * (prevEp - prevSar);
        let nextTrend = prevTrend;
        let nextEp = prevEp;
        let nextAf = prevAf;

        if (prevTrend === 1) {
          if (bar >= 2) {
            nextSar = Math.min(nextSar, ctx.candles[bar - 1].l, ctx.candles[bar - 2].l);
          } else {
            nextSar = Math.min(nextSar, ctx.candles[bar - 1].l);
          }

          if (candle.l < nextSar) {
            nextTrend = -1;
            reversalHit = true;
            nextSar = prevEp;
            nextEp = candle.l;
            nextAf = params.step;
          } else {
            if (candle.h > prevEp) {
              nextEp = candle.h;
              nextAf = Math.min(prevAf + params.step, params.maxStep);
            }
          }
        } else {
          if (bar >= 2) {
            nextSar = Math.max(nextSar, ctx.candles[bar - 1].h, ctx.candles[bar - 2].h);
          } else {
            nextSar = Math.max(nextSar, ctx.candles[bar - 1].h);
          }

          if (candle.h > nextSar) {
            nextTrend = 1;
            reversalHit = true;
            nextSar = prevEp;
            nextEp = candle.h;
            nextAf = params.step;
          } else {
            if (candle.l < prevEp) {
              nextEp = candle.l;
              nextAf = Math.min(prevAf + params.step, params.maxStep);
            }
          }
        }

        trendRaw[bar] = nextTrend;
        sarRaw[bar] = nextSar;
        epRaw[bar] = nextEp;
        afRaw[bar] = nextAf;
      }

      sar.values[bar] = sarRaw[bar];
      reversal.values[bar] = params.highlightReversals && reversalHit ? sarRaw[bar] : NaN;
    };

    return {
      type: 'psar',
      params,
      panel: 'chart',
      series: [sar, reversal],
      warmupPeriod: 1,

      onCalculate(bar: number) {
        if (bar < 0 || bar >= ctx.barsCount()) return;
        calcBar(bar);
      },

      onParamsChanged(next: ParabolicSarParams) {
        params = next;
        sar.color = next.color;
        sar.pointSize = next.dotSize;
        reversal.color = next.color;
        reversal.pointSize = Math.max(2, next.dotSize + 2);
        reversal.visible = next.highlightReversals;
        sar.values.fill(NaN);
        reversal.values.fill(NaN);
        sarRaw.fill(NaN);
        epRaw.fill(NaN);
        afRaw.fill(NaN);
        trendRaw.fill(0);
        ctx.requestRecalc();
      },
    };
  },
};
