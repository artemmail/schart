export type SourceType =
  | 'close'
  | 'open'
  | 'high'
  | 'low'
  | 'hl2'
  | 'hlc3'
  | 'ohlc4'
  | 'volume'
  | 'oi'
  | 'askVolume'
  | 'bidVolume';

export interface Candle {
  t: number; // unix ms
  o: number;
  h: number;
  l: number;
  c: number;
  v?: number;
  bv?: number;
  oi?: number;
}

export type VisualMode = 'Line' | 'Histogram' | 'Points';

export type LineStyle = 'solid' | 'dashed' | 'dotted';

export type PointStyle = 'circle' | 'triangleUp' | 'triangleDown' | 'diamond';

export type HistogramBaseline = 'bottom' | 'zero';

export interface DataSeries {
  id: string;
  name: string;
  visual: VisualMode;
  values: Float64Array; // per bar index
  color?: string;
  width?: number;
  lineStyle?: LineStyle;
  pointStyle?: PointStyle;
  pointSize?: number;
  visible?: boolean;
  histogramBaseline?: HistogramBaseline;
  histogramWidthRatio?: number; // 0..1
  histogramStackId?: string;
}

export type PanelRef = 'chart' | { id: string };

export type ParamType = 'int' | 'float' | 'bool' | 'color' | 'enum';

export interface ParamField<T> {
  type: ParamType;
  title: string;
  group?: string;
  min?: number;
  max?: number;
  step?: number;
  default: T;
  options?: { value: any; label: string }[];
}

export type ParamSchema<P> = { [K in keyof P]: ParamField<P[K]> };

export interface IndicatorContext {
  candles: Candle[];

  source: (bar: number, src: SourceType) => number;

  currentBar: () => number;
  barsCount: () => number;

  requestRender: () => void;
  requestRecalc: () => void;

  ensurePanel: (kind: 'chart' | 'new', preferredId?: string) => PanelRef;
}

export interface IndicatorDefinition<P extends object = any> {
  type: string;
  displayName: string;
  category?: string;

  defaultPanel: 'chart' | 'newPanel';
  panelBehavior?: 'fixed' | 'configurable';
  paramsSchema: ParamSchema<P>;

  create: (ctx: IndicatorContext, params: P) => IndicatorInstance<P>;
}

export interface IndicatorInstance<P extends object = any> {
  readonly type: string;
  params: P;

  panel: PanelRef;
  denyToChangePanel?: boolean;

  series: DataSeries[];

  warmupPeriod?: number; // how many previous bars are required

  onInit?: () => void;
  onReset?: () => void;

  onCalculate: (bar: number) => void;

  onParamsChanged?: (next: P) => void;

  dispose?: () => void;
}
