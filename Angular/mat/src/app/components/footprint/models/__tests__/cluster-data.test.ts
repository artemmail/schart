import { ClusterData } from '../cluster-data';

function makeColumn(index: number, time: number, q = index * 10) {
  const price = 100 + index;
  return {
    Number: index,
    x: new Date(time),
    o: price,
    h: price,
    l: price,
    c: price,
    q,
    bq: q / 2,
    v: q,
    bv: q / 2,
    oi: 0,
    cl: [],
  };
}

function makeClusterData(count = 10): ClusterData {
  const start = Date.parse('2026-01-01T10:00:00.000Z');
  return new ClusterData({
    priceScale: 1,
    VolumePerQuantity: 1,
    clusterData: Array.from({ length: count }, (_, index) =>
      makeColumn(index + 1, start + index * 60_000)
    ),
  });
}

describe('ClusterData realtime merge', () => {
  it('supports empty candles and ticks with finite initial statistics', () => {
    const data = new ClusterData({ priceScale: 1, clusterData: [] });

    expect(data.clusterLength()).toBe(0);
    expect(data.ableCluster()).toBe(false);
    expect(data.ableOI()).toBe(false);
    expect(data.lastPrice).toBe(0);
    expect(data.volumePerQuantity).toBe(1);
    expect(Object.values(data.getRenderStats(true)).every(Number.isFinite)).toBe(true);
    expect(data.handleCluster([])).toBe(true);
    expect(data.handleTicks([])).toBe(true);

    const column = makeColumn(1, Date.parse('2026-01-01T10:00:00Z'));
    expect(data.handleCluster([column])).toBe(true);
    expect(data.lastPrice).toBe(column.c);
    expect(data.clusterLength()).toBe(1);
  });

  it('clears aggregates when history becomes empty', () => {
    const data = makeClusterData(3);
    data.clusterData = [];
    data.calcPrices();

    expect(Object.values(data.getRenderStats(true))).toEqual(
      Object.values(data.getRenderStats(true)).map(() => 0)
    );
    expect(data.ColumnNumberByDate).toEqual({});
    expect(data.totalColumn).toBeUndefined();
    expect(data.lastPrice).toBe(0);
  });

  it('invalidates bar revisions for merges but not ladder updates', () => {
    const data = makeClusterData(3);
    const revision = data.revision;
    data.handleLadder({ '100': 10, '101': 20, '102': 30 });
    expect(data.revision).toBe(revision);
    expect(data.handleCluster([{ ...data.clusterData[2], c: 110, q: 999 }])).toBe(true);
    expect(data.revision).toBeGreaterThan(revision);
  });

  it('ignores stale cluster payloads outside the realtime tail', () => {
    const data = makeClusterData(10);
    const firstQ = data.clusterData[0].q;

    const merged = data.handleCluster([
      {
        ...makeColumn(1, Date.parse('2026-01-01T10:01:00.000Z'), 999),
        x: '2026-01-01T10:01:00.000Z',
      },
    ]);

    expect(merged).toBe(true);
    expect(data.clusterData.length).toBe(10);
    expect(data.clusterData[0].q).toBe(firstQ);
  });

  it('appends newer cluster payloads instead of treating them as a bad merge', () => {
    const data = makeClusterData(10);

    const merged = data.handleCluster([
      {
        ...makeColumn(11, Date.parse('2026-01-01T10:10:00.000Z'), 500),
        x: '2026-01-01T10:10:00.000Z',
      },
    ]);

    expect(merged).toBe(true);
    expect(data.clusterData.length).toBe(11);
    expect(data.clusterData[data.clusterData.length - 1].q).toBe(500);
  });

  it('falls back to timestamp merge when incoming Number is not compatible', () => {
    const data = makeClusterData(10);
    const secondQ = data.clusterData[1].q;

    const merged = data.handleCluster([
      {
        ...makeColumn(1, Date.parse('2026-01-01T10:09:00.000Z'), 700),
        x: '2026-01-01T10:09:00.000Z',
      },
    ]);

    expect(merged).toBe(true);
    expect(data.clusterData.length).toBe(10);
    expect(data.clusterData[1].q).toBe(secondQ);
    expect(data.clusterData[data.clusterData.length - 1].q).toBe(700);
    expect(data.clusterData[data.clusterData.length - 1].Number).toBe(10);
  });

  it('does not truncate candle history when ticks carry trade numbers', () => {
    const data = makeClusterData(3);

    const merged = data.handleTicks([
      {
        number: 1,
        tradeDate: '2026-01-01T10:02:30.000Z',
        price: 105,
        quantity: 1,
        direction: 1,
        volume: 105,
        oi: 0,
      },
    ]);

    expect(merged).toBe(true);
    expect(data.clusterData.length).toBeGreaterThanOrEqual(3);
    expect(data.clusterData[0].Number).toBe(1);
    expect(data.clusterData[1].Number).toBe(2);
    expect(data.clusterData[2].Number).toBe(3);
  });
});
