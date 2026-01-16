import {
  DataSeries,
  IndicatorContext,
  IndicatorDefinition,
  IndicatorInstance,
  ParamSchema,
} from '../indicator-api';

export type VolumeParams = {
  color: string;
  widthRatio: number;
  useUpDownColor: boolean;
  upColor: string;
  downColor: string;
};

const volumeParamsSchema: ParamSchema<VolumeParams> = {
  color: { type: 'color', title: 'Color', default: '#3498db' },
  widthRatio: { type: 'float', title: 'Bar Width', default: 0.9, min: 0.1, max: 1, step: 0.05 },
  useUpDownColor: { type: 'bool', title: 'Up/Down Colors', default: true },
  upColor: { type: 'color', title: 'Up Color', default: 'rgba(4,163,68,.65)' },
  downColor: { type: 'color', title: 'Down Color', default: 'rgba(214,24,0,.65)' },
};

export const VolumeIndicator: IndicatorDefinition<VolumeParams> = {
  type: 'volume',
  displayName: 'Volume',
  category: 'Volume',
  defaultPanel: 'newPanel',
  paramsSchema: volumeParamsSchema,

  create(ctx: IndicatorContext, params: VolumeParams): IndicatorInstance<VolumeParams> {
    const up: DataSeries = {
      id: 'VOL_UP',
      name: 'Volume (Up)',
      visual: 'Histogram',
      values: new Float64Array(ctx.barsCount()),
      color: params.upColor,
      visible: true,
      histogramBaseline: 'bottom',
      histogramWidthRatio: params.widthRatio,
    };
    up.values.fill(NaN);

    const down: DataSeries = {
      id: 'VOL_DOWN',
      name: 'Volume (Down)',
      visual: 'Histogram',
      values: new Float64Array(ctx.barsCount()),
      color: params.downColor,
      visible: true,
      histogramBaseline: 'bottom',
      histogramWidthRatio: params.widthRatio,
    };
    down.values.fill(NaN);

    const mono: DataSeries = {
      id: 'VOL',
      name: 'Volume',
      visual: 'Histogram',
      values: new Float64Array(ctx.barsCount()),
      color: params.color,
      visible: true,
      histogramBaseline: 'bottom',
      histogramWidthRatio: params.widthRatio,
    };
    mono.values.fill(NaN);

    const calc = (bar: number) => {
      const v = ctx.source(bar, 'volume');
      if (!isFinite(v)) {
        up.values[bar] = NaN;
        down.values[bar] = NaN;
        mono.values[bar] = NaN;
        return;
      }

      const isUp = ctx.source(bar, 'close') >= ctx.source(bar, 'open');

      if (params.useUpDownColor) {
        mono.values[bar] = NaN;
        if (isUp) {
          up.values[bar] = v;
          down.values[bar] = NaN;
        } else {
          down.values[bar] = v;
          up.values[bar] = NaN;
        }
      } else {
        up.values[bar] = NaN;
        down.values[bar] = NaN;
        mono.values[bar] = v;
      }
    };

    return {
      type: 'volume',
      params,
      panel: 'chart',
      series: [up, down, mono],
      warmupPeriod: 0,

      onCalculate(bar: number) {
        if (bar < 0 || bar >= ctx.barsCount()) return;
        calc(bar);
      },

      onParamsChanged(next: VolumeParams) {
        params = next;
        up.color = next.upColor;
        down.color = next.downColor;
        mono.color = next.color;
        up.histogramWidthRatio = next.widthRatio;
        down.histogramWidthRatio = next.widthRatio;
        mono.histogramWidthRatio = next.widthRatio;
        ctx.requestRecalc();
      },
    };
  },
};
