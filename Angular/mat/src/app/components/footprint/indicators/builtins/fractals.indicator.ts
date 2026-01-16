import {
  DataSeries,
  IndicatorContext,
  IndicatorDefinition,
  IndicatorInstance,
  ParamSchema,
} from '../indicator-api';

export type FractalsParams = {
  leftBars: number;
  rightBars: number;
  markerStyle: 'triangle' | 'arrow' | 'dot';
  upColor: string;
  downColor: string;
  size: number;
};

const fractalsParamsSchema: ParamSchema<FractalsParams> = {
  leftBars: { type: 'int', title: 'Left Bars', default: 2, min: 1, max: 10, step: 1 },
  rightBars: { type: 'int', title: 'Right Bars', default: 2, min: 1, max: 10, step: 1 },
  markerStyle: {
    type: 'enum',
    title: 'Marker Style',
    default: 'triangle',
    options: [
      { value: 'triangle', label: 'Triangle' },
      { value: 'arrow', label: 'Arrow' },
      { value: 'dot', label: 'Dot' },
    ],
  },
  upColor: { type: 'color', title: 'Up Color', default: '#2ecc71' },
  downColor: { type: 'color', title: 'Down Color', default: '#e74c3c' },
  size: { type: 'int', title: 'Marker Size', default: 6, min: 2, max: 12, step: 1 },
};

export const FractalsIndicator: IndicatorDefinition<FractalsParams> = {
  type: 'fractals',
  displayName: 'Fractals',
  category: 'Pattern',
  defaultPanel: 'chart',
  panelBehavior: 'fixed',
  paramsSchema: fractalsParamsSchema,

  create(ctx: IndicatorContext, params: FractalsParams): IndicatorInstance<FractalsParams> {
    const up: DataSeries = {
      id: 'FRACTAL_UP',
      name: 'Fractal Up',
      visual: 'Points',
      values: new Float64Array(ctx.barsCount()),
      color: params.upColor,
      pointStyle: params.markerStyle === 'dot' ? 'circle' : 'triangleUp',
      pointSize: params.size,
      visible: true,
    };
    const down: DataSeries = {
      id: 'FRACTAL_DOWN',
      name: 'Fractal Down',
      visual: 'Points',
      values: new Float64Array(ctx.barsCount()),
      color: params.downColor,
      pointStyle: params.markerStyle === 'dot' ? 'circle' : 'triangleDown',
      pointSize: params.size,
      visible: true,
    };
    up.values.fill(NaN);
    down.values.fill(NaN);

    const recalcAll = () => {
      const candles = ctx.candles;
      const n = candles.length;
      up.values.fill(NaN);
      down.values.fill(NaN);
      if (!n) return;

      const left = Math.max(1, Math.floor(params.leftBars));
      const right = Math.max(1, Math.floor(params.rightBars));

      for (let i = left; i <= n - right - 1; i++) {
        const h = candles[i].h;
        const l = candles[i].l;

        let isUp = true;
        let isDown = true;

        for (let j = 1; j <= left; j++) {
          if (candles[i - j].h >= h) isUp = false;
          if (candles[i - j].l <= l) isDown = false;
        }
        for (let j = 1; j <= right; j++) {
          if (candles[i + j].h >= h) isUp = false;
          if (candles[i + j].l <= l) isDown = false;
        }

        if (isUp) up.values[i] = h;
        if (isDown) down.values[i] = l;
      }
    };

    return {
      type: 'fractals',
      params,
      panel: 'chart',
      series: [up, down],
      warmupPeriod: Math.max(params.leftBars, params.rightBars),

      onCalculate(bar: number) {
        if (bar !== ctx.barsCount() - 1) return;
        recalcAll();
      },

      onParamsChanged(next: FractalsParams) {
        params = next;
        up.color = next.upColor;
        down.color = next.downColor;
        const style = next.markerStyle === 'dot' ? 'circle' : 'triangleUp';
        up.pointStyle = style;
        down.pointStyle = next.markerStyle === 'dot' ? 'circle' : 'triangleDown';
        up.pointSize = next.size;
        down.pointSize = next.size;
        this.warmupPeriod = Math.max(next.leftBars, next.rightBars);
        ctx.requestRecalc();
      },
    };
  },
};
