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

export type KeltnerParams = {
  maLength: number;
  atrLength: number;
  maSource: SourceType;
  atrMultiplier: number;
  maType: 'ema' | 'sma';
  basisColor: string;
  upperColor: string;
  lowerColor: string;
  width: number;
  lineStyle: LineStyle;
};

const keltnerParamsSchema: ParamSchema<KeltnerParams> = {
  maLength: { type: 'int', title: 'MA Length', default: 10, min: 1, max: 500, step: 1 },
  atrLength: { type: 'int', title: 'ATR Length', default: 10, min: 1, max: 500, step: 1 },
  maSource: {
    type: 'enum',
    title: 'MA Source',
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
  atrMultiplier: { type: 'float', title: 'ATR Multiplier', default: 2, min: 0.1, max: 10, step: 0.1 },
  maType: {
    type: 'enum',
    title: 'MA Type',
    default: 'ema',
    options: [
      { value: 'ema', label: 'EMA' },
      { value: 'sma', label: 'SMA' },
    ],
  },
  basisColor: { type: 'color', title: 'Basis Color', default: '#f1c40f' },
  upperColor: { type: 'color', title: 'Upper Color', default: '#3498db' },
  lowerColor: { type: 'color', title: 'Lower Color', default: '#3498db' },
  width: { type: 'int', title: 'Width', default: 1, min: 1, max: 5, step: 1 },
  lineStyle: { ...lineStyleField },
};

export const KeltnerIndicator: IndicatorDefinition<KeltnerParams> = {
  type: 'keltner',
  displayName: 'Keltner Channels',
  category: 'Volatility',
  defaultPanel: 'chart',
  panelBehavior: 'fixed',
  paramsSchema: keltnerParamsSchema,

  create(ctx: IndicatorContext, params: KeltnerParams): IndicatorInstance<KeltnerParams> {
    const basis: DataSeries = {
      id: 'KELTNER_BASIS',
      name: 'Keltner Basis',
      visual: 'Line',
      values: new Float64Array(ctx.barsCount()),
      color: params.basisColor,
      width: params.width,
      lineStyle: params.lineStyle,
      visible: true,
    };
    basis.values.fill(NaN);

    const upper: DataSeries = {
      id: 'KELTNER_UP',
      name: 'Keltner Upper',
      visual: 'Line',
      values: new Float64Array(ctx.barsCount()),
      color: params.upperColor,
      width: params.width,
      lineStyle: params.lineStyle,
      visible: true,
    };
    upper.values.fill(NaN);

    const lower: DataSeries = {
      id: 'KELTNER_LOW',
      name: 'Keltner Lower',
      visual: 'Line',
      values: new Float64Array(ctx.barsCount()),
      color: params.lowerColor,
      width: params.width,
      lineStyle: params.lineStyle,
      visible: true,
    };
    lower.values.fill(NaN);

    let emaBasis = new Float64Array(ctx.barsCount());
    let atrRaw = new Float64Array(ctx.barsCount());
    emaBasis.fill(NaN);
    atrRaw.fill(NaN);

    const ensureArrays = () => {
      const len = ctx.barsCount();
      if (emaBasis.length !== len) {
        const next = new Float64Array(len);
        next.fill(NaN);
        next.set(emaBasis.subarray(0, Math.min(emaBasis.length, len)));
        emaBasis = next;
      }
      if (atrRaw.length !== len) {
        const next = new Float64Array(len);
        next.fill(NaN);
        next.set(atrRaw.subarray(0, Math.min(atrRaw.length, len)));
        atrRaw = next;
      }
    };

    const calcBar = (bar: number) => {
      ensureArrays();
      if (bar === 0) {
        basis.values.fill(NaN);
        upper.values.fill(NaN);
        lower.values.fill(NaN);
        emaBasis.fill(NaN);
        atrRaw.fill(NaN);
      }

      const maLen = Math.max(1, Math.floor(params.maLength));
      const atrLen = Math.max(1, Math.floor(params.atrLength));

      // ATR (Wilder)
      const candle = ctx.candles[bar];
      const prevClose = bar > 0 ? ctx.candles[bar - 1].c : candle.c;
      const tr = Math.max(
        candle.h - candle.l,
        Math.abs(candle.h - prevClose),
        Math.abs(candle.l - prevClose)
      );

      if (bar < atrLen - 1) {
        atrRaw[bar] = NaN;
      } else if (bar === atrLen - 1 || !isFinite(atrRaw[bar - 1])) {
        let sum = 0;
        for (let i = bar - atrLen + 1; i <= bar; i++) {
          const c = ctx.candles[i];
          const prev = i > 0 ? ctx.candles[i - 1].c : c.c;
          const trI = Math.max(c.h - c.l, Math.abs(c.h - prev), Math.abs(c.l - prev));
          sum += trI;
        }
        atrRaw[bar] = sum / atrLen;
      } else {
        atrRaw[bar] = (atrRaw[bar - 1] * (atrLen - 1) + tr) / atrLen;
      }

      // Basis
      let basisValue = NaN;
      if (params.maType === 'sma') {
        if (bar >= maLen - 1) {
          let sum = 0;
          for (let i = bar - maLen + 1; i <= bar; i++) sum += ctx.source(i, params.maSource);
          basisValue = sum / maLen;
        }
      } else {
        if (bar < maLen - 1) {
          emaBasis[bar] = NaN;
        } else if (bar === maLen - 1 || !isFinite(emaBasis[bar - 1])) {
          let sum = 0;
          for (let i = bar - maLen + 1; i <= bar; i++) sum += ctx.source(i, params.maSource);
          emaBasis[bar] = sum / maLen;
        } else {
          const alpha = 2 / (maLen + 1);
          const prev = emaBasis[bar - 1];
          const src = ctx.source(bar, params.maSource);
          emaBasis[bar] = prev + alpha * (src - prev);
        }
        basisValue = emaBasis[bar];
      }

      if (!isFinite(basisValue) || !isFinite(atrRaw[bar])) {
        basis.values[bar] = NaN;
        upper.values[bar] = NaN;
        lower.values[bar] = NaN;
        return;
      }

      const atr = atrRaw[bar];
      const mult = params.atrMultiplier;
      basis.values[bar] = basisValue;
      upper.values[bar] = basisValue + mult * atr;
      lower.values[bar] = basisValue - mult * atr;
    };

    return {
      type: 'keltner',
      params,
      panel: 'chart',
      series: [basis, upper, lower],
      warmupPeriod: Math.max(0, Math.max(params.maLength, params.atrLength) - 1),

      onCalculate(bar: number) {
        if (bar < 0 || bar >= ctx.barsCount()) return;
        calcBar(bar);
      },

      onParamsChanged(next: KeltnerParams) {
        params = next;
        basis.color = next.basisColor;
        upper.color = next.upperColor;
        lower.color = next.lowerColor;
        for (const s of [basis, upper, lower]) {
          s.width = next.width;
          s.lineStyle = next.lineStyle;
        }
        basis.values.fill(NaN);
        upper.values.fill(NaN);
        lower.values.fill(NaN);
        emaBasis.fill(NaN);
        atrRaw.fill(NaN);
        this.warmupPeriod = Math.max(0, Math.max(next.maLength, next.atrLength) - 1);
        ctx.requestRecalc();
      },
    };
  },
};
