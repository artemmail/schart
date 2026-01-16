import { FootprintIndicatorEngine } from '../indicator-engine';
import { IndicatorRegistry } from '../indicator-registry';
import { registerFootprintBuiltInIndicators } from '../builtins/register-builtins';
import { ClusterData } from '../../models/cluster-data';

function makeClusterData(
  closes: number[],
  volumes: number[] = closes.map(() => 0),
  buyVolumes: number[] = volumes
) {
  const start = new Date('2026-01-01T00:00:00.000Z').getTime();
  const cols = closes.map((c, i) => ({
    Number: i + 1,
    x: new Date(start + i * 60_000),
    o: c,
    h: c,
    l: c,
    c,
    q: 1,
    bq: 1,
    v: volumes[i] ?? 0,
    bv: buyVolumes[i] ?? 0,
    oi: 0,
  }));

  return new ClusterData({ clusterData: cols, priceScale: 1, VolumePerQuantity: 1 });
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
});
