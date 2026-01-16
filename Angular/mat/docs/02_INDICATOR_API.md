<!-- 02_INDICATOR_API.md -->

# 02. API и контракты индикаторов (TypeScript)

## 1) Типы источников
Индикатор может брать данные из разных источников.
Минимум для v1:
- close, open, high, low
- volume

---

## 2) DataSeries и визуальные типы
DataSeries — основной контракт между индикатором и рендером.

Минимум v1:
- Line
- Histogram

Серия должна содержать массив значений по индексам баров.

---

## 3) PanelRef
- "chart" — поверх основного графика
- { id: string } — отдельная панель

---

## 4) ParamSchema
Используется для автогенерации UI-формы параметров.

---

## 5) Контекст индикатора
Контекст предоставляет:
- candles
- доступ к значениям источников
- сервис пересчета/перерисовки
- panel creation

---

## 6) Интерфейсы (обязательная реализация)

```ts
export type SourceType =
  | "close" | "open" | "high" | "low"
  | "hl2" | "hlc3" | "ohlc4"
  | "volume";

export interface Candle {
  t: number;
  o: number; h: number; l: number; c: number;
  v?: number;
}

export type VisualMode = "Line" | "Histogram";

export type HistogramBaseline = "bottom" | "zero";

export interface DataSeries {
  id: string;
  name: string;
  visual: VisualMode;
  values: Float64Array;     // по индексу баров
  color?: string;
  width?: number;
  visible?: boolean;
  histogramBaseline?: HistogramBaseline; // v1: для Volume = "bottom"
  histogramWidthRatio?: number;          // 0..1
}

export type PanelRef = "chart" | { id: string };

export type ParamType = "int" | "float" | "bool" | "color" | "enum";

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

  // возвращает числовой источник по бару
  source: (bar: number, src: SourceType) => number;

  // служебные методы
  currentBar: () => number;
  barsCount: () => number;

  // перерисовка / пересчет
  requestRender: () => void;
  requestRecalc: () => void;

  // панели
  ensurePanel: (kind: "chart" | "new", preferredId?: string) => PanelRef;
}

export interface IndicatorDefinition<P extends object = any> {
  type: string;
  displayName: string;
  category?: string;

  defaultPanel: "chart" | "newPanel";
  paramsSchema: ParamSchema<P>;

  create: (ctx: IndicatorContext, params: P) => IndicatorInstance<P>;
}

export interface IndicatorInstance<P extends object = any> {
  readonly type: string;
  params: P;

  panel: PanelRef;
  denyToChangePanel?: boolean;

  series: DataSeries[];

  // warmup/lookback: сколько предыдущих баров нужно пересчитывать
  warmupPeriod?: number;

  // lifecycle
  onInit?: () => void;
  onReset?: () => void;

  // расчет по бару (аналог OnCalculate(bar))
  onCalculate: (bar: number) => void;

  // изменение параметров
  onParamsChanged?: (next: P) => void;

  // optional custom drawing in future v2
  enableCustomDrawing?: boolean;
  onRender?: (rc: any) => void;

  dispose?: () => void;
}
