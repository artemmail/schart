import { FootprintIndicatorEngine } from '../indicator-engine';
import { IndicatorRegistry } from '../indicator-registry';
import { registerFootprintBuiltInIndicators } from '../builtins/register-builtins';
import { ClusterData } from '../../models/cluster-data';
import { atr, macd, roc, rsi } from 'technicalindicators';
import { IndicatorContext } from '../indicator-api';

function makeClusterData(
  closes: number[],
  volumes: number[] = closes.map(() => 0),
  buyVolumes: number[] = volumes,
  quantities: number[] = closes.map(() => 1),
  volumePerQuantity: number = 1
) {
  const start = new Date('2026-01-01T00:00:00.000Z').getTime();
  const cols = closes.map((c, i) => ({
    Number: i + 1,
    x: new Date(start + i * 60_000),
    o: c,
    h: c,
    l: c,
    c,
    q: quantities[i] ?? 1,
    bq: quantities[i] ?? 1,
    v: volumes[i] ?? 0,
    bv: buyVolumes[i] ?? 0,
    oi: 0,
  }));

  return new ClusterData({ clusterData: cols, priceScale: 1, VolumePerQuantity: volumePerQuantity });
}

function makeFootprintClusterData() {
  const start = new Date('2026-01-01T10:00:00.000Z').getTime();
  return new ClusterData({
    priceScale: 1,
    VolumePerQuantity: 1,
    clusterData: [
      {
        Number: 1,
        x: new Date(start),
        o: 100,
        h: 101,
        l: 100,
        c: 101,
        q: 300,
        bq: 150,
        v: 300,
        bv: 150,
        oi: 0,
        cl: [
          { p: 100, q: 100, bq: 70, ct: 10, mx: 0 },
          { p: 101, q: 200, bq: 80, ct: 20, mx: 0 },
        ],
      },
      {
        Number: 2,
        x: new Date(start + 60_000),
        o: 101,
        h: 102,
        l: 100,
        c: 100,
        q: 470,
        bq: 310,
        v: 470,
        bv: 310,
        oi: 0,
        cl: [
          { p: 100, q: 50, bq: 10, ct: 5, mx: 0 },
          { p: 101, q: 300, bq: 240, ct: 30, mx: 0 },
          { p: 102, q: 120, bq: 60, ct: 10, mx: 0 },
        ],
      },
    ],
  });
}

function makeEngine() {
  const registry = new IndicatorRegistry();
  registerFootprintBuiltInIndicators(registry);

  const engine = new FootprintIndicatorEngine(
    registry,
    { requestRender: () => undefined, requestRecalc: () => undefined },
    {
      ensurePanel: (kind: 'chart' | 'new', preferredId?: string) => (kind === 'chart' ? 'chart' : { id: preferredId ?? 'p1' }),
      getPanelHeight: () => 100,
    }
  );

  return engine;
}

describe('FootprintIndicatorEngine', () => {
  test('keeps candle snapshots consistent with live sources after replacing a bar', () => {
    const registry = new IndicatorRegistry();
    let context: IndicatorContext;
    registry.register({
      type: 'snapshot-test', displayName: 'Snapshot', defaultPanel: 'chart', paramsSchema: {},
      create(ctx, params) {
        context = ctx;
        return { type: 'snapshot-test', params, panel: 'chart', series: [], onCalculate: () => undefined };
      },
    });
    const engine = new FootprintIndicatorEngine(registry,
      { requestRender: () => undefined, requestRecalc: () => undefined },
      { ensurePanel: () => 'chart', getPanelHeight: () => 100 });
    const data = makeClusterData([100, 101, 102]);
    engine.setData(data);
    engine.setSettings({ Indicators: [{ id: 'snapshot', type: 'snapshot-test', params: {} }] } as any);
    engine.prepare();
    data.handleCluster([{ ...data.clusterData[2], oiRaw: undefined,
      c: 110, h: 110, v: 500, bv: 300, q: 5, oi: 10 }]);
    engine.prepare();

    expect(context.candles[2].c).toBe(110);
    expect(context.candles[2].c).toBe(context.source(2, 'close'));
    const { h, v, bv, q, oi } = context.candles[2];
    expect({ h, v, bv, q, oi }).toEqual({ h: 110, v: 500, bv: 300, q: 5, oi: 10 });
  });

  test.each(['replaceTail', 'appendWithCorrection'])(
    'matches a fresh calculation after %s, including adapters and recursive indicators', (kind) => {
      const closes = Array.from({ length: 60 }, (_, i) => 100 + Math.sin(i) * 5);
      const data = makeClusterData(closes);
      const settings = {
        Indicators: [
          { id: 'ema', type: 'ema', params: { source: 'close', period: 5 }, panel: 'chart' },
          { id: 'rsi', type: 'rsi', params: { source: 'close', period: 14 }, panel: { id: 'rsi' } },
        ], IndicatorPanels: { rsi: { height: 100 } },
      } as any;
      const engine = makeEngine();
      engine.setData(data);
      engine.setSettings(settings);
      engine.prepare();
      const oldRsi = Array.from(engine.getPanelSeries('rsi').find(s => s.id === 'RSI')!.values);
      const payload = data.clusterData.slice(-4).map((bar, i) => ({
        ...bar, c: i === 1 ? bar.c + 25 : bar.c,
      }));
      if (kind === 'appendWithCorrection') {
        payload.push({ ...payload[payload.length - 1], Number: 61,
          x: new Date(payload[payload.length - 1].x.getTime() + 60_000), c: 103 });
      }
      expect(data.handleCluster(payload)).toBe(true);
      engine.prepare();

      const fresh = makeEngine();
      fresh.setData(new ClusterData({ priceScale: 1, VolumePerQuantity: 1, clusterData: data.clusterData }));
      fresh.setSettings(settings);
      fresh.prepare();
      expect(engine.getChartSeries().map(s => Array.from(s.values)))
        .toEqual(fresh.getChartSeries().map(s => Array.from(s.values)));
      expect(engine.getPanelSeries('rsi').map(s => Array.from(s.values)))
        .toEqual(fresh.getPanelSeries('rsi').map(s => Array.from(s.values)));
      expect(Array.from(engine.getPanelSeries('rsi').find(s => s.id === 'RSI')!.values)).not.toEqual(oldRsi);
    }
  );

  test('clears indicator series for an empty history and accepts later bars', () => {
    const engine = makeEngine();
    const data = makeClusterData([1, 2, 3]);
    engine.setData(data);
    engine.setSettings({ Indicators: [{ id: 'sma', type: 'sma', params: { period: 2 } }] } as any);
    engine.prepare();
    data.clusterData = [];
    data.calcPrices();
    engine.prepare();
    expect(engine.getChartSeries()[0].values.length).toBe(0);
    const next = makeClusterData([10, 20, 30]);
    data.handleCluster(next.clusterData);
    engine.prepare();
    expect(engine.getChartSeries()[0].values[2]).toBe(25);
  });

  test('lists technicalindicators catalog definitions', () => {
    const registry = new IndicatorRegistry();
    registerFootprintBuiltInIndicators(registry);

    const types = registry
      .list()
      .filter((definition) => definition.provider === 'technicalindicators')
      .map((definition) => definition.type);

    for (const type of [
      'rsi',
      'macd-ti',
      'atr-ti',
      'adx-ti',
      'cci-ti',
      'roc-ti',
      'williamsr-ti',
      'mfi-ti',
      'obv-ti',
      'forceindex-ti',
      'ao-ti',
      'trix-ti',
      'bb-ti',
    ]) {
      expect(types).toContain(type);
    }

    expect(registry.list().map((definition) => definition.type)).toContain('cluster-search');
  });

  test('calculates SMA correctly', () => {
    const data = makeClusterData([1, 2, 3, 4, 5]);
    const engine = makeEngine();

    engine.setData(data);
    engine.setSettings({
      Indicators: [{ id: 'i1', type: 'sma', params: { source: 'close', period: 3, color: '#fff', width: 1 }, panel: 'chart', visible: true }],
      IndicatorPanels: {},
    } as any);

    engine.prepare();

    const sma = engine.getChartSeries().find((s) => s.id === 'SMA');
    expect(sma).toBeTruthy();
    expect(Number.isNaN(sma!.values[0])).toBe(true);
    expect(Number.isNaN(sma!.values[1])).toBe(true);
    expect(sma!.values[2]).toBeCloseTo(2);
    expect(sma!.values[4]).toBeCloseTo(4);
  });

  test('calculates Bollinger Bands correctly', () => {
    const data = makeClusterData([1, 2, 3, 4, 5]);
    const engine = makeEngine();

    engine.setData(data);
    engine.setSettings({
      Indicators: [
        {
          id: 'b1',
          type: 'bb',
          params: {
            source: 'close',
            period: 5,
            mult: 2,
            middleColor: '#fff',
            upperColor: '#0af',
            lowerColor: '#0af',
            width: 1,
          },
          panel: 'chart',
          visible: true,
        },
      ],
      IndicatorPanels: {},
    } as any);

    engine.prepare();

    const mid = engine.getChartSeries().find((s) => s.id === 'BB_MID');
    const up = engine.getChartSeries().find((s) => s.id === 'BB_UP');
    const low = engine.getChartSeries().find((s) => s.id === 'BB_LOW');

    expect(mid).toBeTruthy();
    expect(up).toBeTruthy();
    expect(low).toBeTruthy();

    expect(Number.isNaN(mid!.values[3])).toBe(true);
    expect(mid!.values[4]).toBeCloseTo(3);

    // population stddev for [1..5] is sqrt(2)
    expect(up!.values[4]).toBeCloseTo(3 + 2 * Math.sqrt(2));
    expect(low!.values[4]).toBeCloseTo(3 - 2 * Math.sqrt(2));
  });

  test('incrementally updates on append', () => {
    const data = makeClusterData([1, 2, 3, 4, 5]);
    const engine = makeEngine();

    engine.setData(data);
    engine.setSettings({
      Indicators: [{ id: 'i1', type: 'sma', params: { source: 'close', period: 3, color: '#fff', width: 1 }, panel: 'chart', visible: true }],
      IndicatorPanels: {},
    } as any);

    engine.prepare();

    data.clusterData.push(
      data.addColumnInfo({
        Number: 6,
        x: new Date('2026-01-01T00:05:00.000Z'),
        o: 6,
        h: 6,
        l: 6,
        c: 6,
        q: 1,
        bq: 1,
        v: 10,
        bv: 10,
        oi: 0,
      })
    );
    data.calcPrices();

    engine.prepare();

    const sma = engine.getChartSeries().find((s) => s.id === 'SMA');
    expect(sma).toBeTruthy();
    expect(sma!.values[5]).toBeCloseTo(5);
  });

  test('routes Volume to a subpanel', () => {
    const data = makeClusterData([1, 2, 3], [10, 20, 15], [4, 12, 5]);
    const engine = makeEngine();

    engine.setData(data);
    engine.setSettings({
      Indicators: [{ id: 'v1', type: 'volume', params: { widthRatio: 1, askColor: '#0f0', bidColor: '#f00' }, panel: { id: 'vol' }, visible: true }],
      IndicatorPanels: { vol: { height: 100 } },
    } as any);

    engine.prepare();

    expect(engine.getPanels().map((p) => p.id)).toEqual(['vol']);

    const series = engine.getPanelSeries('vol');
    const ask = series.find((s) => s.id === 'VOL_ASK');
    const bid = series.find((s) => s.id === 'VOL_BID');
    expect(ask).toBeTruthy();
    expect(bid).toBeTruthy();
    expect(ask!.values[0]).toBeCloseTo(4);
    expect(ask!.values[1]).toBeCloseTo(12);
    expect(ask!.values[2]).toBeCloseTo(5);
    expect(bid!.values[0]).toBeCloseTo(6);
    expect(bid!.values[1]).toBeCloseTo(8);
    expect(bid!.values[2]).toBeCloseTo(10);
  });

  test('calculates WAP line from per-bar turnover and quantity', () => {
    const data = makeClusterData([100, 1], [20, 20], [20, 20], [2, 1]);
    const engine = makeEngine();

    engine.setData(data);
    engine.setSettings({
      Indicators: [
        {
          id: 'wap1',
          type: 'weightedAveragePrice',
          params: {
            color: '#f39c12',
            lineStyle: 'solid',
          },
          panel: 'chart',
          visible: true,
        },
      ],
      IndicatorPanels: {},
    } as any);

    engine.prepare();

    const wap = engine.getChartSeries().find((s) => s.id === 'WAP');
    expect(wap).toBeTruthy();
    expect(wap!.values[0]).toBeCloseTo(10);
    expect(wap!.values[1]).toBeCloseTo(20);
  });

  test('uses VolumePerQuantity when converting quantity to WAP denominator', () => {
    const data = makeClusterData([100, 1], [20, 20], [20, 20], [2, 1], 10);
    const engine = makeEngine();

    engine.setData(data);
    engine.setSettings({
      Indicators: [
        {
          id: 'wap1',
          type: 'weightedAveragePrice',
          params: {
            color: '#f39c12',
            lineStyle: 'solid',
          },
          panel: 'chart',
          visible: true,
        },
      ],
      IndicatorPanels: {},
    } as any);

    engine.prepare();

    const wap = engine.getChartSeries().find((s) => s.id === 'WAP');
    expect(wap).toBeTruthy();
    expect(wap!.values[0]).toBeCloseTo(1);
    expect(wap!.values[1]).toBeCloseTo(2);
  });

  test('calculates Stochastic in fixed 0..100 subpanel', () => {
    const data = makeClusterData([1, 2, 3, 4, 5, 6]);
    const engine = makeEngine();

    engine.setData(data);
    engine.setSettings({
      Indicators: [
        {
          id: 's1',
          type: 'stochastic',
          params: {
            kPeriod: 3,
            smoothK: 2,
            dPeriod: 2,
            showLevels: true,
            overbought: 80,
            oversold: 20,
            kColor: '#1f77b4',
            dColor: '#ff7f0e',
            levelsColor: '#95a5a6',
            width: 2,
            levelsWidth: 1,
            lineStyle: 'solid',
            levelsLineStyle: 'dashed',
          },
          panel: { id: 'stoch' },
          visible: true,
        },
      ],
      IndicatorPanels: { stoch: { height: 100 } },
    } as any);

    engine.prepare();

    expect(engine.getPanels().map((p) => p.id)).toEqual(['stoch']);

    const series = engine.getPanelSeries('stoch');
    const k = series.find((s) => s.id === 'STOCH_K');
    const d = series.find((s) => s.id === 'STOCH_D');
    const ob = series.find((s) => s.id === 'STOCH_OB');
    const os = series.find((s) => s.id === 'STOCH_OS');

    expect(k).toBeTruthy();
    expect(d).toBeTruthy();
    expect(ob).toBeTruthy();
    expect(os).toBeTruthy();

    expect(Number.isNaN(k!.values[2])).toBe(true);
    expect(k!.values[3]).toBeCloseTo(100);
    expect(Number.isNaN(d!.values[3])).toBe(true);
    expect(d!.values[4]).toBeCloseTo(100);
    expect(ob!.values[4]).toBeCloseTo(80);
    expect(os!.values[4]).toBeCloseTo(20);

    expect(k!.fixedRange).toEqual({ min: 0, max: 100 });
    expect(d!.fixedRange).toEqual({ min: 0, max: 100 });
  });

  test('calculates RSI through technicalindicators adapter', () => {
    const closes = Array.from({ length: 20 }, (_, i) => i + 1);
    const data = makeClusterData(closes);
    const engine = makeEngine();

    engine.setData(data);
    engine.setSettings({
      Indicators: [
        {
          id: 'rsi1',
          type: 'rsi',
          params: {
            source: 'close',
            period: 14,
            showLevels: true,
            overbought: 70,
            oversold: 30,
            rsiColor: '#7e57c2',
            levelsColor: '#95a5a6',
            width: 2,
            levelsWidth: 1,
            lineStyle: 'solid',
            levelsLineStyle: 'dashed',
          },
          panel: { id: 'rsi' },
          visible: true,
        },
      ],
      IndicatorPanels: { rsi: { height: 100 } },
    } as any);

    engine.prepare();

    const series = engine.getPanelSeries('rsi');
    const rsiLine = series.find((s) => s.id === 'RSI');
    const overbought = series.find((s) => s.id === 'RSI_OB');
    const oversold = series.find((s) => s.id === 'RSI_OS');
    const expected = rsi({ period: 14, values: closes });
    const offset = closes.length - expected.length;

    expect(rsiLine).toBeTruthy();
    expect(overbought).toBeTruthy();
    expect(oversold).toBeTruthy();
    expect(Number.isNaN(rsiLine!.values[offset - 1])).toBe(true);
    expect(rsiLine!.values[offset]).toBeCloseTo(expected[0]);
    expect(rsiLine!.values[closes.length - 1]).toBeCloseTo(expected[expected.length - 1]);
    expect(overbought!.values[0]).toBeCloseTo(70);
    expect(oversold!.values[0]).toBeCloseTo(30);
    expect(rsiLine!.fixedRange).toEqual({ min: 0, max: 100 });
  });

  test('calculates MACD through technicalindicators adapter', () => {
    const closes = Array.from({ length: 20 }, (_, i) => i + 1);
    const data = makeClusterData(closes);
    const engine = makeEngine();

    engine.setData(data);
    engine.setSettings({
      Indicators: [
        {
          id: 'macd1',
          type: 'macd-ti',
          params: {
            source: 'close',
            fastPeriod: 3,
            slowPeriod: 6,
            signalPeriod: 3,
            simpleMAOscillator: false,
            simpleMASignal: false,
            macdColor: '#1f77b4',
            signalColor: '#ff7f0e',
            histogramUpColor: '#2ecc71',
            histogramDownColor: '#e74c3c',
            width: 2,
            lineStyle: 'solid',
            histogramWidthRatio: 0.8,
          },
          panel: { id: 'macd' },
          visible: true,
        },
      ],
      IndicatorPanels: { macd: { height: 100 } },
    } as any);

    engine.prepare();

    const series = engine.getPanelSeries('macd');
    const macdLine = series.find((s) => s.id === 'MACD');
    const signalLine = series.find((s) => s.id === 'MACD_SIGNAL');
    const histogramUp = series.find((s) => s.id === 'MACD_HIST_UP');
    const histogramDown = series.find((s) => s.id === 'MACD_HIST_DOWN');
    const expected = macd({
      values: closes,
      fastPeriod: 3,
      slowPeriod: 6,
      signalPeriod: 3,
      SimpleMAOscillator: false,
      SimpleMASignal: false,
    });
    const offset = closes.length - expected.length;
    const firstSignalIndex = expected.findIndex((x) => typeof x.signal === 'number');

    expect(macdLine).toBeTruthy();
    expect(signalLine).toBeTruthy();
    expect(histogramUp).toBeTruthy();
    expect(histogramDown).toBeTruthy();
    expect(macdLine!.values[offset]).toBeCloseTo(expected[0].MACD!);
    expect(Number.isNaN(signalLine!.values[offset])).toBe(true);
    expect(signalLine!.values[offset + firstSignalIndex]).toBeCloseTo(expected[firstSignalIndex].signal!);
    expect(histogramUp!.values[offset + firstSignalIndex]).toBeCloseTo(expected[firstSignalIndex].histogram!);
    expect(Number.isNaN(histogramDown!.values[offset + firstSignalIndex])).toBe(true);
  });

  test('calculates ATR through technicalindicators adapter', () => {
    const closes = Array.from({ length: 20 }, (_, i) => i + 1);
    const data = makeClusterData(closes);
    const engine = makeEngine();

    engine.setData(data);
    engine.setSettings({
      Indicators: [
        {
          id: 'atr1',
          type: 'atr-ti',
          params: {
            period: 14,
            color: '#00acc1',
            width: 2,
            lineStyle: 'solid',
          },
          panel: { id: 'atr' },
          visible: true,
        },
      ],
      IndicatorPanels: { atr: { height: 100 } },
    } as any);

    engine.prepare();

    const atrLine = engine.getPanelSeries('atr').find((s) => s.id === 'ATR');
    const expected = atr({ high: closes, low: closes, close: closes, period: 14 });
    const offset = closes.length - expected.length;

    expect(atrLine).toBeTruthy();
    expect(Number.isNaN(atrLine!.values[offset - 1])).toBe(true);
    expect(atrLine!.values[offset]).toBeCloseTo(expected[0]);
    expect(atrLine!.values[closes.length - 1]).toBeCloseTo(expected[expected.length - 1]);
  });

  test('registers catalog technical indicators without a custom wrapper class', () => {
    const closes = Array.from({ length: 10 }, (_, i) => i + 1);
    const data = makeClusterData(closes);
    const engine = makeEngine();

    engine.setData(data);
    engine.setSettings({
      Indicators: [
        {
          id: 'roc1',
          type: 'roc-ti',
          params: {
            source: 'close',
            period: 3,
            color: '#26a69a',
            width: 2,
            lineStyle: 'solid',
          },
          panel: { id: 'roc' },
          visible: true,
        },
      ],
      IndicatorPanels: { roc: { height: 100 } },
    } as any);

    engine.prepare();

    const rocLine = engine.getPanelSeries('roc').find((s) => s.id === 'ROC');
    const expected = roc({ values: closes, period: 3 });
    const offset = closes.length - expected.length;

    expect(rocLine).toBeTruthy();
    expect(Number.isNaN(rocLine!.values[offset - 1])).toBe(true);
    expect(rocLine!.values[offset]).toBeCloseTo(expected[0]);
    expect(rocLine!.values[closes.length - 1]).toBeCloseTo(expected[expected.length - 1]);
  });

  test('finds cluster search hits in cluster cells', () => {
    const data = makeFootprintClusterData();
    const engine = makeEngine();

    engine.setData(data);
    engine.setSettings({
      Indicators: [
        {
          id: 'cs1',
          type: 'cluster-search',
          params: {
            dataType: 'volume',
            minimum: 250,
          },
          panel: 'chart',
          visible: true,
        },
      ],
      IndicatorPanels: {},
    } as any);

    engine.prepare();

    const overlays = engine.getClusterOverlays();
    expect(overlays.length).toBe(1);
    expect(overlays[0].items.length).toBe(1);
    expect(overlays[0].items[0].bar).toBe(1);
    expect(overlays[0].items[0].priceLow).toBe(101);
    expect(overlays[0].items[0].priceHigh).toBe(101);
    expect(overlays[0].items[0].value).toBe(300);
  });

  test('merges prices and applies bid ask imbalance in cluster search', () => {
    const data = makeFootprintClusterData();
    const engine = makeEngine();

    engine.setData(data);
    engine.setSettings({
      Indicators: [
        {
          id: 'cs1',
          type: 'cluster-search',
          params: {
            dataType: 'ask',
            minimum: 90,
            priceRange: 2,
            priceRangeDirection: 'upward',
            bidAskImbalance: 150,
          },
          panel: 'chart',
          visible: true,
        },
      ],
      IndicatorPanels: {},
    } as any);

    engine.prepare();

    const items = engine.getClusterOverlays()[0].items;
    const mergedHit = items.find(
      (item) =>
        item.bar === 1 &&
        item.priceLow === 100 &&
        item.priceHigh === 101 &&
        item.value === 250
    );
    expect(mergedHit).toBeTruthy();
  });

  test('keeps one largest cluster search hit per bar when single selection is enabled', () => {
    const data = makeFootprintClusterData();
    const engine = makeEngine();

    engine.setData(data);
    engine.setSettings({
      Indicators: [
        {
          id: 'cs1',
          type: 'cluster-search',
          params: {
            dataType: 'volume',
            minimum: 100,
            singleSelection: true,
          },
          panel: 'chart',
          visible: true,
        },
      ],
      IndicatorPanels: {},
    } as any);

    engine.prepare();

    const items = engine.getClusterOverlays()[0].items;
    expect(items.filter((item) => item.bar === 0).length).toBe(1);
    expect(items.filter((item) => item.bar === 1).length).toBe(1);
    expect(items.find((item) => item.bar === 0)?.value).toBe(200);
    expect(items.find((item) => item.bar === 1)?.value).toBe(300);
  });
});

describe('FootprintIndicatorEngine disposal', () => {
  test('disposes each instance once, releases data and rejects callbacks retained by indicators', async () => {
    const registry = new IndicatorRegistry();
    let context: IndicatorContext;
    const dispose = jest.fn();
    const calculate = jest.fn();
    const create = jest.fn((ctx: IndicatorContext, params: any) => {
      context = ctx;
      return { type: 'disposable', params, panel: 'chart' as const, series: [], onCalculate: calculate, dispose };
    });
    registry.register({ type: 'disposable', displayName: 'Disposable', defaultPanel: 'chart', paramsSchema: {}, create });
    const callbacks = { requestRender: jest.fn(), requestRecalc: jest.fn() };
    const loader = jest.fn(async () => ({ status: 'noData' as const, message: '' }));
    const engine = new FootprintIndicatorEngine(registry, callbacks,
      { ensurePanel: () => 'chart', getPanelHeight: () => 100 }, { loadOpenPositionsByTicker: loader });
    const history = makeClusterData([100, 101]);
    const settings = { Indicators: [{ id: 'one', type: 'disposable', params: {} }] } as any;
    engine.setData(history); engine.setSettings(settings); engine.prepare();
    engine.dispose(); engine.dispose();
    context.requestRender(); context.requestRecalc();
    await context.loadOpenPositionsByTicker('Si');
    engine.setData(history); engine.setSettings(settings); engine.prepare();
    expect(dispose).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledTimes(1);
    expect(calculate).toHaveBeenCalledTimes(2);
    expect(callbacks.requestRender).not.toHaveBeenCalled();
    expect(callbacks.requestRecalc).not.toHaveBeenCalled();
    expect(loader).not.toHaveBeenCalled();
    expect(context.candles).toEqual([]);
    expect(context.getClusterData()).toBeNull();
    expect(engine.getChartSeries()).toEqual([]);
    expect(engine.getPanels()).toEqual([]);
  });
});
