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
