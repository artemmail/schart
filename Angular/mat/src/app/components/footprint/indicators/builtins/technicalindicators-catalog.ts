import {
  adx,
  atr,
  awesomeoscillator,
  bollingerbands,
  cci,
  forceindex,
  macd,
  mfi,
  obv,
  roc,
  rsi,
  trix,
  williamsr,
} from 'technicalindicators';
import {
  IndicatorDefinition,
  LineStyle,
  ParamField,
  ParamSchema,
  SourceType,
} from '../indicator-api';
import { IndicatorRegistry } from '../indicator-registry';
import { lineStyleField, lineStyleOptions } from './indicator-utils';
import {
  asPositivePeriod,
  oscillatorRange,
  sourceOptions,
  TechnicalIndicatorsInput,
} from './technicalindicators-adapter';
import { createTechnicalIndicatorDefinition } from './technicalindicators-factory';

type NumberOutput = number;

type MacdOutput = {
  MACD?: number;
  signal?: number;
  histogram?: number;
};

type AdxOutput = {
  adx?: number;
  pdi?: number;
  mdi?: number;
};

type BollingerOutput = {
  middle?: number;
  upper?: number;
  lower?: number;
};

type SourceLineParams = {
  source: SourceType;
  period: number;
  color: string;
  width: number;
  lineStyle: LineStyle;
};

const sourceField: ParamField<SourceType> = {
  type: 'enum',
  title: 'Source',
  default: 'close',
  options: [...sourceOptions],
};

const periodField = (title = 'Length', defaultValue = 14) =>
  ({ type: 'int', title, default: defaultValue, min: 1, max: 500, step: 1 }) as ParamField<number>;

const widthField: ParamField<number> = {
  type: 'int',
  title: 'Line Width',
  default: 2,
  min: 1,
  max: 5,
  step: 1,
};

function sourceLineSchema(defaultColor: string): ParamSchema<SourceLineParams> {
  return {
    source: sourceField,
    period: periodField(),
    color: { type: 'color', title: 'Color', default: defaultColor },
    width: widthField,
    lineStyle: { ...lineStyleField },
  };
}

function periodName(prefix: string, params: { period: number }): string {
  return `${prefix}(${asPositivePeriod(params.period)})`;
}

function hlocPeriodInput(input: TechnicalIndicatorsInput, params: { period: number }) {
  return {
    high: input.high,
    low: input.low,
    close: input.close,
    period: asPositivePeriod(params.period),
  };
}

export type RsiParams = {
  source: SourceType;
  period: number;
  showLevels: boolean;
  overbought: number;
  oversold: number;
  rsiColor: string;
  levelsColor: string;
  width: number;
  levelsWidth: number;
  lineStyle: LineStyle;
  levelsLineStyle: LineStyle;
};

const rsiParamsSchema: ParamSchema<RsiParams> = {
  source: sourceField,
  period: periodField(),
  showLevels: { type: 'bool', title: 'Show 30/70 Levels', default: true },
  overbought: { type: 'float', title: 'Overbought', default: 70, min: 0, max: 100, step: 0.1 },
  oversold: { type: 'float', title: 'Oversold', default: 30, min: 0, max: 100, step: 0.1 },
  rsiColor: { type: 'color', title: 'RSI Color', default: '#7e57c2' },
  levelsColor: { type: 'color', title: 'Levels Color', default: '#95a5a6' },
  width: widthField,
  levelsWidth: { type: 'int', title: 'Levels Width', default: 1, min: 1, max: 3, step: 1 },
  lineStyle: { ...lineStyleField },
  levelsLineStyle: {
    type: 'enum',
    title: 'Levels Line Style',
    default: 'dashed',
    options: lineStyleOptions,
  },
};

const RsiIndicator = createTechnicalIndicatorDefinition<RsiParams, NumberOutput>({
  type: 'rsi',
  displayName: 'RSI',
  category: 'Momentum',
  paramsSchema: rsiParamsSchema,
  sourceParam: 'source',
  warmupPeriod: (params) => asPositivePeriod(params.period),
  calculate: (input, params) =>
    rsi({ period: asPositivePeriod(params.period), values: input.values }),
  series: [
    {
      kind: 'line',
      id: 'RSI',
      name: (params) => periodName('RSI', params),
      value: (x) => x,
      color: (params) => params.rsiColor,
      width: (params) => params.width,
      lineStyle: (params) => params.lineStyle,
      fixedRange: oscillatorRange,
    },
    {
      kind: 'level',
      id: 'RSI_OB',
      name: (params) => `Overbought ${params.overbought}`,
      value: (params) => params.overbought,
      enabled: (params) => params.showLevels,
      color: (params) => params.levelsColor,
      width: (params) => params.levelsWidth,
      lineStyle: (params) => params.levelsLineStyle,
      fixedRange: oscillatorRange,
    },
    {
      kind: 'level',
      id: 'RSI_OS',
      name: (params) => `Oversold ${params.oversold}`,
      value: (params) => params.oversold,
      enabled: (params) => params.showLevels,
      color: (params) => params.levelsColor,
      width: (params) => params.levelsWidth,
      lineStyle: (params) => params.levelsLineStyle,
      fixedRange: oscillatorRange,
    },
  ],
});

export type MacdParams = {
  source: SourceType;
  fastPeriod: number;
  slowPeriod: number;
  signalPeriod: number;
  simpleMAOscillator: boolean;
  simpleMASignal: boolean;
  macdColor: string;
  signalColor: string;
  histogramUpColor: string;
  histogramDownColor: string;
  width: number;
  lineStyle: LineStyle;
  histogramWidthRatio: number;
};

const macdParamsSchema: ParamSchema<MacdParams> = {
  source: sourceField,
  fastPeriod: periodField('Fast Length', 12),
  slowPeriod: periodField('Slow Length', 26),
  signalPeriod: periodField('Signal Length', 9),
  simpleMAOscillator: { type: 'bool', title: 'Simple MA Oscillator', default: false },
  simpleMASignal: { type: 'bool', title: 'Simple MA Signal', default: false },
  macdColor: { type: 'color', title: 'MACD Color', default: '#1f77b4' },
  signalColor: { type: 'color', title: 'Signal Color', default: '#ff7f0e' },
  histogramUpColor: { type: 'color', title: 'Histogram Up', default: 'rgba(46, 204, 113, .7)' },
  histogramDownColor: { type: 'color', title: 'Histogram Down', default: 'rgba(231, 76, 60, .7)' },
  width: widthField,
  lineStyle: { ...lineStyleField },
  histogramWidthRatio: { type: 'float', title: 'Histogram Width', default: 0.8, min: 0.1, max: 1, step: 0.05 },
};

function macdPeriods(params: MacdParams): { fast: number; slow: number; signal: number } {
  const fast = asPositivePeriod(params.fastPeriod);
  const slow = Math.max(fast + 1, asPositivePeriod(params.slowPeriod));
  return { fast, slow, signal: asPositivePeriod(params.signalPeriod) };
}

function macdName(params: MacdParams): string {
  const p = macdPeriods(params);
  return `MACD(${p.fast}, ${p.slow}, ${p.signal})`;
}

const MacdIndicator = createTechnicalIndicatorDefinition<MacdParams, MacdOutput>({
  type: 'macd-ti',
  displayName: 'MACD',
  category: 'Momentum',
  paramsSchema: macdParamsSchema,
  sourceParam: 'source',
  warmupPeriod: (params) => {
    const p = macdPeriods(params);
    return Math.max(0, p.slow + p.signal - 2);
  },
  calculate: (input, params) => {
    const p = macdPeriods(params);
    return macd({
      values: input.values,
      fastPeriod: p.fast,
      slowPeriod: p.slow,
      signalPeriod: p.signal,
      SimpleMAOscillator: params.simpleMAOscillator,
      SimpleMASignal: params.simpleMASignal,
    }) as MacdOutput[];
  },
  series: [
    {
      kind: 'histogramSplit',
      positiveId: 'MACD_HIST_UP',
      negativeId: 'MACD_HIST_DOWN',
      positiveName: 'Histogram +',
      negativeName: 'Histogram -',
      value: (x) => x.histogram,
      positiveColor: (params) => params.histogramUpColor,
      negativeColor: (params) => params.histogramDownColor,
      widthRatio: (params) => params.histogramWidthRatio,
    },
    {
      kind: 'line',
      id: 'MACD',
      name: macdName,
      value: (x) => x.MACD,
      color: (params) => params.macdColor,
      width: (params) => params.width,
      lineStyle: (params) => params.lineStyle,
    },
    {
      kind: 'line',
      id: 'MACD_SIGNAL',
      name: (params) => `Signal ${macdName(params)}`,
      value: (x) => x.signal,
      color: (params) => params.signalColor,
      width: (params) => params.width,
      lineStyle: (params) => params.lineStyle,
    },
  ],
});

export type AtrParams = {
  period: number;
  color: string;
  width: number;
  lineStyle: LineStyle;
};

const atrParamsSchema: ParamSchema<AtrParams> = {
  period: periodField(),
  color: { type: 'color', title: 'ATR Color', default: '#00acc1' },
  width: widthField,
  lineStyle: { ...lineStyleField },
};

const AtrIndicator = createTechnicalIndicatorDefinition<AtrParams, NumberOutput>({
  type: 'atr-ti',
  displayName: 'ATR',
  category: 'Volatility',
  paramsSchema: atrParamsSchema,
  warmupPeriod: (params) => asPositivePeriod(params.period),
  calculate: (input, params) => atr(hlocPeriodInput(input, params)),
  series: [
    {
      kind: 'line',
      id: 'ATR',
      name: (params) => periodName('ATR', params),
      value: (x) => x,
      color: (params) => params.color,
      width: (params) => params.width,
      lineStyle: (params) => params.lineStyle,
    },
  ],
});

export type AdxParams = {
  period: number;
  showDi: boolean;
  adxColor: string;
  pdiColor: string;
  mdiColor: string;
  width: number;
  lineStyle: LineStyle;
};

const adxParamsSchema: ParamSchema<AdxParams> = {
  period: periodField(),
  showDi: { type: 'bool', title: 'Show +DI/-DI', default: true },
  adxColor: { type: 'color', title: 'ADX Color', default: '#f1c40f' },
  pdiColor: { type: 'color', title: '+DI Color', default: '#2ecc71' },
  mdiColor: { type: 'color', title: '-DI Color', default: '#e74c3c' },
  width: widthField,
  lineStyle: { ...lineStyleField },
};

const AdxIndicator = createTechnicalIndicatorDefinition<AdxParams, AdxOutput>({
  type: 'adx-ti',
  displayName: 'ADX',
  category: 'Trend',
  paramsSchema: adxParamsSchema,
  warmupPeriod: (params) => Math.max(0, asPositivePeriod(params.period) * 2 - 1),
  calculate: (input, params) => adx(hlocPeriodInput(input, params)) as AdxOutput[],
  series: [
    {
      kind: 'line',
      id: 'ADX',
      name: (params) => periodName('ADX', params),
      value: (x) => x.adx,
      color: (params) => params.adxColor,
      width: (params) => params.width,
      lineStyle: (params) => params.lineStyle,
      fixedRange: oscillatorRange,
    },
    {
      kind: 'line',
      id: 'ADX_PDI',
      name: '+DI',
      value: (x) => x.pdi,
      enabled: (params) => params.showDi,
      color: (params) => params.pdiColor,
      width: (params) => params.width,
      lineStyle: (params) => params.lineStyle,
      fixedRange: oscillatorRange,
    },
    {
      kind: 'line',
      id: 'ADX_MDI',
      name: '-DI',
      value: (x) => x.mdi,
      enabled: (params) => params.showDi,
      color: (params) => params.mdiColor,
      width: (params) => params.width,
      lineStyle: (params) => params.lineStyle,
      fixedRange: oscillatorRange,
    },
  ],
});

export type CciParams = {
  period: number;
  showLevels: boolean;
  upperLevel: number;
  lowerLevel: number;
  cciColor: string;
  levelsColor: string;
  width: number;
  levelsWidth: number;
  lineStyle: LineStyle;
  levelsLineStyle: LineStyle;
};

const cciParamsSchema: ParamSchema<CciParams> = {
  period: periodField('Length', 20),
  showLevels: { type: 'bool', title: 'Show +/-100 Levels', default: true },
  upperLevel: { type: 'float', title: 'Upper Level', default: 100, min: -1000, max: 1000, step: 1 },
  lowerLevel: { type: 'float', title: 'Lower Level', default: -100, min: -1000, max: 1000, step: 1 },
  cciColor: { type: 'color', title: 'CCI Color', default: '#ab47bc' },
  levelsColor: { type: 'color', title: 'Levels Color', default: '#95a5a6' },
  width: widthField,
  levelsWidth: { type: 'int', title: 'Levels Width', default: 1, min: 1, max: 3, step: 1 },
  lineStyle: { ...lineStyleField },
  levelsLineStyle: {
    type: 'enum',
    title: 'Levels Line Style',
    default: 'dashed',
    options: lineStyleOptions,
  },
};

const CciIndicator = createTechnicalIndicatorDefinition<CciParams, NumberOutput>({
  type: 'cci-ti',
  displayName: 'CCI',
  category: 'Momentum',
  paramsSchema: cciParamsSchema,
  warmupPeriod: (params) => Math.max(0, asPositivePeriod(params.period) - 1),
  calculate: (input, params) => cci(hlocPeriodInput(input, params)),
  series: [
    {
      kind: 'line',
      id: 'CCI',
      name: (params) => periodName('CCI', params),
      value: (x) => x,
      color: (params) => params.cciColor,
      width: (params) => params.width,
      lineStyle: (params) => params.lineStyle,
    },
    {
      kind: 'level',
      id: 'CCI_UPPER',
      name: (params) => `Upper ${params.upperLevel}`,
      value: (params) => params.upperLevel,
      enabled: (params) => params.showLevels,
      color: (params) => params.levelsColor,
      width: (params) => params.levelsWidth,
      lineStyle: (params) => params.levelsLineStyle,
    },
    {
      kind: 'level',
      id: 'CCI_LOWER',
      name: (params) => `Lower ${params.lowerLevel}`,
      value: (params) => params.lowerLevel,
      enabled: (params) => params.showLevels,
      color: (params) => params.levelsColor,
      width: (params) => params.levelsWidth,
      lineStyle: (params) => params.levelsLineStyle,
    },
  ],
});

const RocIndicator = createTechnicalIndicatorDefinition<SourceLineParams, NumberOutput>({
  type: 'roc-ti',
  displayName: 'ROC',
  category: 'Momentum',
  paramsSchema: sourceLineSchema('#26a69a'),
  sourceParam: 'source',
  warmupPeriod: (params) => asPositivePeriod(params.period),
  calculate: (input, params) =>
    roc({ values: input.values, period: asPositivePeriod(params.period) }),
  series: [
    {
      kind: 'line',
      id: 'ROC',
      name: (params) => periodName('ROC', params),
      value: (x) => x,
      color: (params) => params.color,
      width: (params) => params.width,
      lineStyle: (params) => params.lineStyle,
    },
  ],
});

export type WilliamsRParams = {
  period: number;
  showLevels: boolean;
  overbought: number;
  oversold: number;
  color: string;
  levelsColor: string;
  width: number;
  levelsWidth: number;
  lineStyle: LineStyle;
  levelsLineStyle: LineStyle;
};

const williamsRParamsSchema: ParamSchema<WilliamsRParams> = {
  period: periodField(),
  showLevels: { type: 'bool', title: 'Show -20/-80 Levels', default: true },
  overbought: { type: 'float', title: 'Overbought', default: -20, min: -100, max: 0, step: 1 },
  oversold: { type: 'float', title: 'Oversold', default: -80, min: -100, max: 0, step: 1 },
  color: { type: 'color', title: 'Williams %R Color', default: '#ff7043' },
  levelsColor: { type: 'color', title: 'Levels Color', default: '#95a5a6' },
  width: widthField,
  levelsWidth: { type: 'int', title: 'Levels Width', default: 1, min: 1, max: 3, step: 1 },
  lineStyle: { ...lineStyleField },
  levelsLineStyle: {
    type: 'enum',
    title: 'Levels Line Style',
    default: 'dashed',
    options: lineStyleOptions,
  },
};

const williamsRange = Object.freeze({ min: -100, max: 0 });

const WilliamsRIndicator = createTechnicalIndicatorDefinition<WilliamsRParams, NumberOutput>({
  type: 'williamsr-ti',
  displayName: 'Williams %R',
  category: 'Momentum',
  paramsSchema: williamsRParamsSchema,
  warmupPeriod: (params) => asPositivePeriod(params.period),
  calculate: (input, params) => williamsr(hlocPeriodInput(input, params)),
  series: [
    {
      kind: 'line',
      id: 'WILLIAMS_R',
      name: (params) => periodName('Williams %R', params),
      value: (x) => x,
      color: (params) => params.color,
      width: (params) => params.width,
      lineStyle: (params) => params.lineStyle,
      fixedRange: williamsRange,
    },
    {
      kind: 'level',
      id: 'WILLIAMS_R_OB',
      name: (params) => `Overbought ${params.overbought}`,
      value: (params) => params.overbought,
      enabled: (params) => params.showLevels,
      color: (params) => params.levelsColor,
      width: (params) => params.levelsWidth,
      lineStyle: (params) => params.levelsLineStyle,
      fixedRange: williamsRange,
    },
    {
      kind: 'level',
      id: 'WILLIAMS_R_OS',
      name: (params) => `Oversold ${params.oversold}`,
      value: (params) => params.oversold,
      enabled: (params) => params.showLevels,
      color: (params) => params.levelsColor,
      width: (params) => params.levelsWidth,
      lineStyle: (params) => params.levelsLineStyle,
      fixedRange: williamsRange,
    },
  ],
});

const MfiIndicator = createTechnicalIndicatorDefinition<Omit<RsiParams, 'source' | 'rsiColor'> & { color: string }, NumberOutput>({
  type: 'mfi-ti',
  displayName: 'MFI',
  category: 'Volume',
  paramsSchema: {
    period: periodField(),
    showLevels: { type: 'bool', title: 'Show 20/80 Levels', default: true },
    overbought: { type: 'float', title: 'Overbought', default: 80, min: 0, max: 100, step: 0.1 },
    oversold: { type: 'float', title: 'Oversold', default: 20, min: 0, max: 100, step: 0.1 },
    color: { type: 'color', title: 'MFI Color', default: '#66bb6a' },
    levelsColor: { type: 'color', title: 'Levels Color', default: '#95a5a6' },
    width: widthField,
    levelsWidth: { type: 'int', title: 'Levels Width', default: 1, min: 1, max: 3, step: 1 },
    lineStyle: { ...lineStyleField },
    levelsLineStyle: {
      type: 'enum',
      title: 'Levels Line Style',
      default: 'dashed',
      options: lineStyleOptions,
    },
  } as ParamSchema<Omit<RsiParams, 'source' | 'rsiColor'> & { color: string }>,
  warmupPeriod: (params) => asPositivePeriod(params.period),
  calculate: (input, params) =>
    mfi({
      high: input.high,
      low: input.low,
      close: input.close,
      volume: input.volume,
      period: asPositivePeriod(params.period),
    }),
  series: [
    {
      kind: 'line',
      id: 'MFI',
      name: (params) => periodName('MFI', params),
      value: (x) => x,
      color: (params) => params.color,
      width: (params) => params.width,
      lineStyle: (params) => params.lineStyle,
      fixedRange: oscillatorRange,
    },
    {
      kind: 'level',
      id: 'MFI_OB',
      name: (params) => `Overbought ${params.overbought}`,
      value: (params) => params.overbought,
      enabled: (params) => params.showLevels,
      color: (params) => params.levelsColor,
      width: (params) => params.levelsWidth,
      lineStyle: (params) => params.levelsLineStyle,
      fixedRange: oscillatorRange,
    },
    {
      kind: 'level',
      id: 'MFI_OS',
      name: (params) => `Oversold ${params.oversold}`,
      value: (params) => params.oversold,
      enabled: (params) => params.showLevels,
      color: (params) => params.levelsColor,
      width: (params) => params.levelsWidth,
      lineStyle: (params) => params.levelsLineStyle,
      fixedRange: oscillatorRange,
    },
  ],
});

const ObvIndicator = createTechnicalIndicatorDefinition<Omit<SourceLineParams, 'source' | 'period'>, NumberOutput>({
  type: 'obv-ti',
  displayName: 'OBV',
  category: 'Volume',
  paramsSchema: {
    color: { type: 'color', title: 'OBV Color', default: '#42a5f5' },
    width: widthField,
    lineStyle: { ...lineStyleField },
  },
  warmupPeriod: () => 1,
  calculate: (input) => obv({ close: input.close, volume: input.volume }),
  series: [
    {
      kind: 'line',
      id: 'OBV',
      name: 'OBV',
      value: (x) => x,
      color: (params) => params.color,
      width: (params) => params.width,
      lineStyle: (params) => params.lineStyle,
    },
  ],
});

const ForceIndexIndicator = createTechnicalIndicatorDefinition<Omit<SourceLineParams, 'source'>, NumberOutput>({
  type: 'forceindex-ti',
  displayName: 'Force Index',
  category: 'Volume',
  paramsSchema: {
    period: periodField(),
    color: { type: 'color', title: 'Force Index Color', default: '#ec407a' },
    width: widthField,
    lineStyle: { ...lineStyleField },
  },
  warmupPeriod: (params) => asPositivePeriod(params.period),
  calculate: (input, params) =>
    forceindex({
      close: input.close,
      volume: input.volume,
      period: asPositivePeriod(params.period),
    }),
  series: [
    {
      kind: 'line',
      id: 'FORCE_INDEX',
      name: (params) => periodName('Force Index', params),
      value: (x) => x,
      color: (params) => params.color,
      width: (params) => params.width,
      lineStyle: (params) => params.lineStyle,
    },
  ],
});

export type AwesomeOscillatorParams = {
  fastPeriod: number;
  slowPeriod: number;
  upColor: string;
  downColor: string;
  histogramWidthRatio: number;
};

const AwesomeOscillatorIndicator = createTechnicalIndicatorDefinition<AwesomeOscillatorParams, NumberOutput>({
  type: 'ao-ti',
  displayName: 'Awesome Oscillator',
  category: 'Momentum',
  paramsSchema: {
    fastPeriod: periodField('Fast Length', 5),
    slowPeriod: periodField('Slow Length', 34),
    upColor: { type: 'color', title: 'Histogram Up', default: 'rgba(46, 204, 113, .7)' },
    downColor: { type: 'color', title: 'Histogram Down', default: 'rgba(231, 76, 60, .7)' },
    histogramWidthRatio: { type: 'float', title: 'Histogram Width', default: 0.8, min: 0.1, max: 1, step: 0.05 },
  },
  warmupPeriod: (params) => Math.max(asPositivePeriod(params.fastPeriod), asPositivePeriod(params.slowPeriod)),
  calculate: (input, params) =>
    awesomeoscillator({
      high: input.high,
      low: input.low,
      fastPeriod: asPositivePeriod(params.fastPeriod),
      slowPeriod: Math.max(asPositivePeriod(params.fastPeriod) + 1, asPositivePeriod(params.slowPeriod)),
    }),
  series: [
    {
      kind: 'histogramSplit',
      positiveId: 'AO_HIST_UP',
      negativeId: 'AO_HIST_DOWN',
      positiveName: 'AO +',
      negativeName: 'AO -',
      value: (x) => x,
      positiveColor: (params) => params.upColor,
      negativeColor: (params) => params.downColor,
      widthRatio: (params) => params.histogramWidthRatio,
    },
  ],
});

const TrixIndicator = createTechnicalIndicatorDefinition<SourceLineParams, NumberOutput>({
  type: 'trix-ti',
  displayName: 'TRIX',
  category: 'Momentum',
  paramsSchema: sourceLineSchema('#26c6da'),
  sourceParam: 'source',
  warmupPeriod: (params) => asPositivePeriod(params.period) * 3,
  calculate: (input, params) =>
    trix({ values: input.values, period: asPositivePeriod(params.period) }),
  series: [
    {
      kind: 'line',
      id: 'TRIX',
      name: (params) => periodName('TRIX', params),
      value: (x) => x,
      color: (params) => params.color,
      width: (params) => params.width,
      lineStyle: (params) => params.lineStyle,
    },
  ],
});

export type BollingerTiParams = {
  source: SourceType;
  period: number;
  stdDev: number;
  middleColor: string;
  upperColor: string;
  lowerColor: string;
  width: number;
  lineStyle: LineStyle;
};

const BollingerTiIndicator = createTechnicalIndicatorDefinition<BollingerTiParams, BollingerOutput>({
  type: 'bb-ti',
  displayName: 'Bollinger Bands',
  category: 'Volatility',
  defaultPanel: 'chart',
  panelBehavior: 'configurable',
  paramsSchema: {
    source: sourceField,
    period: periodField('Length', 20),
    stdDev: { type: 'float', title: 'StdDev', default: 2, min: 0.1, max: 10, step: 0.1 },
    middleColor: { type: 'color', title: 'Middle Color', default: '#f1c40f' },
    upperColor: { type: 'color', title: 'Upper Color', default: '#3498db' },
    lowerColor: { type: 'color', title: 'Lower Color', default: '#3498db' },
    width: widthField,
    lineStyle: { ...lineStyleField },
  },
  sourceParam: 'source',
  warmupPeriod: (params) => Math.max(0, asPositivePeriod(params.period) - 1),
  calculate: (input, params) =>
    bollingerbands({
      values: input.values,
      period: asPositivePeriod(params.period),
      stdDev: params.stdDev,
    }) as BollingerOutput[],
  series: [
    {
      kind: 'line',
      id: 'BB_TI_UP',
      name: (params) => `BB Upper(${asPositivePeriod(params.period)})`,
      value: (x) => x.upper,
      color: (params) => params.upperColor,
      width: (params) => params.width,
      lineStyle: (params) => params.lineStyle,
    },
    {
      kind: 'line',
      id: 'BB_TI_MID',
      name: (params) => `BB Middle(${asPositivePeriod(params.period)})`,
      value: (x) => x.middle,
      color: (params) => params.middleColor,
      width: (params) => params.width,
      lineStyle: (params) => params.lineStyle,
    },
    {
      kind: 'line',
      id: 'BB_TI_LOW',
      name: (params) => `BB Lower(${asPositivePeriod(params.period)})`,
      value: (x) => x.lower,
      color: (params) => params.lowerColor,
      width: (params) => params.width,
      lineStyle: (params) => params.lineStyle,
    },
  ],
});

export const TechnicalIndicatorDefinitions: IndicatorDefinition<any>[] = [
  RsiIndicator,
  MacdIndicator,
  AtrIndicator,
  AdxIndicator,
  CciIndicator,
  RocIndicator,
  WilliamsRIndicator,
  MfiIndicator,
  ObvIndicator,
  ForceIndexIndicator,
  AwesomeOscillatorIndicator,
  TrixIndicator,
  BollingerTiIndicator,
];

export function registerTechnicalIndicators(registry: IndicatorRegistry): void {
  TechnicalIndicatorDefinitions.forEach((definition) => registry.register(definition));
}
