import {
  DataSeries,
  IndicatorContext,
  IndicatorDefinition,
  IndicatorInstance,
  ParamSchema,
} from '../indicator-api';

export type VolumeParams = {
  widthRatio: number;
  askColor: string;
  bidColor: string;
};

const volumeParamsSchema: ParamSchema<VolumeParams> = {
  widthRatio: { type: 'float', title: 'Bar Width', default: 0.9, min: 0.1, max: 1, step: 0.05 },
  askColor: { type: 'color', title: 'Ask Color', default: 'rgba(4,163,68,.65)' },
  bidColor: { type: 'color', title: 'Bid Color', default: 'rgba(214,24,0,.65)' },
};

export const VolumeIndicator: IndicatorDefinition<VolumeParams> = {
  type: 'volume',
  displayName: 'Volume',
  category: 'Volume',
  defaultPanel: 'newPanel',
  panelBehavior: 'fixed',
  paramsSchema: volumeParamsSchema,

  create(ctx: IndicatorContext, params: VolumeParams): IndicatorInstance<VolumeParams> {
    const ask: DataSeries = {
      id: 'VOL_ASK',
      name: 'Volume (Ask)',
      visual: 'Histogram',
      values: new Float64Array(ctx.barsCount()),
      color: params.askColor,
      visible: true,
      histogramBaseline: 'bottom',
      histogramWidthRatio: params.widthRatio,
      histogramStackId: 'volume',
    };
    ask.values.fill(NaN);

    const bid: DataSeries = {
      id: 'VOL_BID',
      name: 'Volume (Bid)',
      visual: 'Histogram',
      values: new Float64Array(ctx.barsCount()),
      color: params.bidColor,
      visible: true,
      histogramBaseline: 'bottom',
      histogramWidthRatio: params.widthRatio,
      histogramStackId: 'volume',
    };
    bid.values.fill(NaN);

    const calc = (bar: number) => {
      const askVol = ctx.source(bar, 'askVolume');
      const bidVol = ctx.source(bar, 'bidVolume');
      if (!isFinite(askVol) || !isFinite(bidVol)) {
        ask.values[bar] = NaN;
        bid.values[bar] = NaN;
        return;
      }

      ask.values[bar] = askVol;
      bid.values[bar] = bidVol;
    };

    return {
      type: 'volume',
      params,
      panel: 'chart',
      series: [ask, bid],
      warmupPeriod: 0,

      onCalculate(bar: number) {
        if (bar < 0 || bar >= ctx.barsCount()) return;
        calc(bar);
      },

      onParamsChanged(next: VolumeParams) {
        params = next;
        ask.color = next.askColor;
        bid.color = next.bidColor;
        ask.histogramWidthRatio = next.widthRatio;
        bid.histogramWidthRatio = next.widthRatio;
        ctx.requestRecalc();
      },
    };
  },
};
