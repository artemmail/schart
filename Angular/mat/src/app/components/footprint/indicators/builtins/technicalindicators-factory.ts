import {
  DataSeries,
  IndicatorContext,
  IndicatorDefinition,
  IndicatorInstance,
  LineStyle,
  PanelRef,
  ParamSchema,
  SourceType,
} from '../indicator-api';
import {
  buildTechnicalIndicatorsInput,
  createNanValues,
  fillLevelSeries,
  finiteOrNaN,
  TechnicalIndicatorsInput,
  writeAlignedResults,
} from './technicalindicators-adapter';

type ValueGetter<P, T, V> = V | ((params: P, item?: T) => V);

type SeriesBase<P> = {
  id: string;
  name: ValueGetter<P, any, string>;
  color?: ValueGetter<P, any, string>;
  width?: ValueGetter<P, any, number>;
  lineStyle?: ValueGetter<P, any, LineStyle>;
  fixedRange?: ValueGetter<P, any, { min: number; max: number } | undefined>;
  enabled?: (params: P) => boolean;
};

type LineSeriesDescriptor<P, T> = SeriesBase<P> & {
  kind: 'line';
  value: (item: T) => number | null | undefined;
};

type LevelSeriesDescriptor<P> = SeriesBase<P> & {
  kind: 'level';
  value: (params: P) => number;
};

type HistogramSplitDescriptor<P, T> = {
  kind: 'histogramSplit';
  positiveId: string;
  negativeId: string;
  positiveName: ValueGetter<P, any, string>;
  negativeName: ValueGetter<P, any, string>;
  value: (item: T) => number | null | undefined;
  positiveColor?: ValueGetter<P, any, string>;
  negativeColor?: ValueGetter<P, any, string>;
  widthRatio?: ValueGetter<P, any, number>;
  enabled?: (params: P) => boolean;
};

export type TechnicalSeriesDescriptor<P, T> =
  | LineSeriesDescriptor<P, T>
  | LevelSeriesDescriptor<P>
  | HistogramSplitDescriptor<P, T>;

export interface TechnicalIndicatorDescriptor<P extends object, T> {
  type: string;
  displayName: string;
  category?: string;
  defaultPanel?: 'chart' | 'newPanel';
  panelBehavior?: 'fixed' | 'configurable';
  paramsSchema: ParamSchema<P>;
  sourceParam?: keyof P;
  warmupPeriod?: (params: P) => number;
  signature?: (params: P, input: TechnicalIndicatorsInput) => string;
  calculate: (input: TechnicalIndicatorsInput, params: P) => readonly T[];
  series: TechnicalSeriesDescriptor<P, T>[];
}

type RuntimeSeries<P, T> =
  | { descriptor: LineSeriesDescriptor<P, T>; series: DataSeries }
  | { descriptor: LevelSeriesDescriptor<P>; series: DataSeries }
  | {
      descriptor: HistogramSplitDescriptor<P, T>;
      positive: DataSeries;
      negative: DataSeries;
    };

export function createTechnicalIndicatorDefinition<P extends object, T>(
  descriptor: TechnicalIndicatorDescriptor<P, T>
): IndicatorDefinition<P> {
  return {
    type: descriptor.type,
    displayName: descriptor.displayName,
    category: descriptor.category,
    provider: 'technicalindicators',
    defaultPanel: descriptor.defaultPanel ?? 'newPanel',
    panelBehavior: descriptor.panelBehavior ?? 'fixed',
    paramsSchema: descriptor.paramsSchema,
    create(ctx: IndicatorContext, params: P): IndicatorInstance<P> {
      const runtimeSeries = descriptor.series.map((seriesDescriptor) =>
        createRuntimeSeries(ctx, seriesDescriptor, params)
      );
      const allSeries = runtimeSeries.flatMap((entry) =>
        'series' in entry ? [entry.series] : [entry.positive, entry.negative]
      );

      let lastSignature = '';

      const updateVisualProps = (next: P) => {
        for (const entry of runtimeSeries) {
          applyVisualProps(entry, next);
        }
      };

      const getInput = () => {
        const source = resolveSourceParam(params, descriptor.sourceParam);
        return buildTechnicalIndicatorsInput(ctx.candles, source);
      };

      const getSignature = (input: TechnicalIndicatorsInput) =>
        descriptor.signature?.(params, input) ??
        `${input.signature}|${stableParamsSignature(params)}`;

      const recalculateIfNeeded = () => {
        const input = getInput();
        const signature = getSignature(input);
        if (signature === lastSignature && allSeries[0]?.values.length === input.close.length) {
          return;
        }

        lastSignature = signature;
        let output: readonly T[] = [];
        try {
          output = descriptor.calculate(input, params);
        } catch {
          output = [];
        }
        writeRuntimeSeries(runtimeSeries, output, params);
      };

      return {
        type: descriptor.type,
        params,
        panel: 'chart' as PanelRef,
        series: allSeries,
        warmupPeriod: descriptor.warmupPeriod?.(params) ?? 0,

        onCalculate(bar: number) {
          if (bar < 0 || bar >= ctx.barsCount()) return;
          recalculateIfNeeded();
        },

        onParamsChanged(next: P) {
          params = next;
          updateVisualProps(next);
          lastSignature = '';
          this.warmupPeriod = descriptor.warmupPeriod?.(next) ?? 0;
          ctx.requestRecalc();
        },
      };
    },
  };
}

function createRuntimeSeries<P, T>(
  ctx: IndicatorContext,
  descriptor: TechnicalSeriesDescriptor<P, T>,
  params: P
): RuntimeSeries<P, T> {
  if (descriptor.kind === 'histogramSplit') {
    const positive: DataSeries = {
      id: descriptor.positiveId,
      name: resolveValue(descriptor.positiveName, params),
      visual: 'Histogram',
      values: createNanValues(ctx.barsCount()),
      histogramBaseline: 'zero',
      histogramWidthRatio: resolveOptionalValue(descriptor.widthRatio, params),
      color: resolveOptionalValue(descriptor.positiveColor, params),
      visible: true,
    };
    const negative: DataSeries = {
      id: descriptor.negativeId,
      name: resolveValue(descriptor.negativeName, params),
      visual: 'Histogram',
      values: createNanValues(ctx.barsCount()),
      histogramBaseline: 'zero',
      histogramWidthRatio: resolveOptionalValue(descriptor.widthRatio, params),
      color: resolveOptionalValue(descriptor.negativeColor, params),
      visible: true,
    };

    return { descriptor, positive, negative };
  }

  const series: DataSeries = {
    id: descriptor.id,
    name: resolveValue(descriptor.name, params),
    visual: 'Line',
    values: createNanValues(ctx.barsCount()),
    color: resolveOptionalValue(descriptor.color, params),
    width: resolveOptionalValue(descriptor.width, params),
    lineStyle: resolveOptionalValue(descriptor.lineStyle, params),
    fixedRange: resolveOptionalValue(descriptor.fixedRange, params),
    visible: true,
  };

  return { descriptor, series } as RuntimeSeries<P, T>;
}

function applyVisualProps<P, T>(entry: RuntimeSeries<P, T>, params: P): void {
  if ('positive' in entry) {
    const descriptor = entry.descriptor;
    entry.positive.name = resolveValue(descriptor.positiveName, params);
    entry.negative.name = resolveValue(descriptor.negativeName, params);
    entry.positive.color = resolveOptionalValue(descriptor.positiveColor, params);
    entry.negative.color = resolveOptionalValue(descriptor.negativeColor, params);
    entry.positive.histogramWidthRatio = resolveOptionalValue(descriptor.widthRatio, params);
    entry.negative.histogramWidthRatio = resolveOptionalValue(descriptor.widthRatio, params);
    return;
  }

  const descriptor = entry.descriptor;
  entry.series.name = resolveValue(descriptor.name, params);
  entry.series.color = resolveOptionalValue(descriptor.color, params);
  entry.series.width = resolveOptionalValue(descriptor.width, params);
  entry.series.lineStyle = resolveOptionalValue(descriptor.lineStyle, params);
  entry.series.fixedRange = resolveOptionalValue(descriptor.fixedRange, params);
}

function writeRuntimeSeries<P, T>(
  entries: RuntimeSeries<P, T>[],
  output: readonly T[],
  params: P
): void {
  for (const entry of entries) {
    if ('positive' in entry) {
      writeHistogramSplit(entry, output, params);
      continue;
    }

    if (entry.descriptor.kind === 'level') {
      fillLevelSeries(
        entry.series,
        entry.descriptor.value(params),
        entry.descriptor.enabled?.(params) ?? true
      );
      continue;
    }

    if (entry.descriptor.enabled?.(params) === false) {
      entry.series.values.fill(NaN);
    } else {
      writeAlignedResults(entry.series.values, output, entry.descriptor.value);
    }
  }
}

function writeHistogramSplit<P, T>(
  entry: Extract<RuntimeSeries<P, T>, { positive: DataSeries }>,
  output: readonly T[],
  params: P
): void {
  entry.positive.values.fill(NaN);
  entry.negative.values.fill(NaN);
  if (entry.descriptor.enabled?.(params) === false) return;

  const offset = Math.max(0, entry.positive.values.length - output.length);
  for (let i = 0; i < output.length; i++) {
    const targetIndex = offset + i;
    if (targetIndex < 0 || targetIndex >= entry.positive.values.length) continue;

    const value = finiteOrNaN(entry.descriptor.value(output[i]));
    if (!isFinite(value)) continue;
    if (value >= 0) {
      entry.positive.values[targetIndex] = value;
    } else {
      entry.negative.values[targetIndex] = value;
    }
  }
}

function resolveSourceParam<P extends object>(params: P, key?: keyof P): SourceType {
  if (!key) return 'close';

  const raw = params[key];
  return typeof raw === 'string' ? (raw as SourceType) : 'close';
}

function resolveValue<P, T, V>(value: ValueGetter<P, T, V>, params: P): V {
  return typeof value === 'function'
    ? (value as (params: P) => V)(params)
    : value;
}

function resolveOptionalValue<P, T, V>(
  value: ValueGetter<P, T, V> | undefined,
  params: P
): V | undefined {
  return value === undefined ? undefined : resolveValue(value, params);
}

function stableParamsSignature(params: object): string {
  return JSON.stringify(
    Object.keys(params)
      .sort()
      .reduce((acc, key) => {
        (acc as any)[key] = (params as any)[key];
        return acc;
      }, {} as Record<string, unknown>)
  );
}
