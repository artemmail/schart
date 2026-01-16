import { FootprintIndicatorEngine } from '../indicator-engine';
import { IndicatorRegistry } from '../indicator-registry';
import { registerFootprintBuiltInIndicators } from '../builtins/register-builtins';
import { ClusterData } from '../../models/cluster-data';

function makeClusterData(closes: number[], volumes: number[] = closes.map(() => 0)) {
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
    bv: volumes[i] ?? 0,
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
    const data = makeClusterData([1, 2, 3], [10, 20, 15]);
    const engine = makeEngine();

    engine.setData(data);
    engine.setSettings({
      Indicators: [{ id: 'v1', type: 'volume', params: { color: '#0af', widthRatio: 1, useUpDownColor: false, upColor: '#0f0', downColor: '#f00' }, panel: { id: 'vol' }, visible: true }],
      IndicatorPanels: { vol: { height: 100 } },
    } as any);

    engine.prepare();

    expect(engine.getPanels().map((p) => p.id)).toEqual(['vol']);

    const series = engine.getPanelSeries('vol');
    const mono = series.find((s) => s.id === 'VOL');
    expect(mono).toBeTruthy();
    expect(mono!.values[0]).toBeCloseTo(10);
    expect(mono!.values[1]).toBeCloseTo(20);
    expect(mono!.values[2]).toBeCloseTo(15);
  });
});

