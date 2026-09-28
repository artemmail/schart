import { expect, it } from '@jest/globals';
import { of } from 'rxjs';

jest.mock('@angular/core', () => ({ Injectable: () => (target: unknown) => target }));
jest.mock('@angular/common/http', () => ({ HttpErrorResponse: class extends Error {} }));
jest.mock('src/app/service/chart-settings.service', () => ({
  ChartSettingsService: { miniSettings: () => ({ CandlesOnly: false }) },
}), { virtual: true });
jest.mock('src/app/models/footprint-mode', () =>
  jest.requireActual('../../../../models/footprint-mode'), { virtual: true });
jest.mock('src/app/models/volume-heights', () =>
  jest.requireActual('../../../../models/volume-heights'), { virtual: true });
jest.mock('src/app/models//Rectangle', () =>
  jest.requireActual('../../../../models/Rectangle'), { virtual: true });
jest.mock('src/app/models/Rectangle', () =>
  jest.requireActual('../../../../models/Rectangle'), { virtual: true });
jest.mock('src/app/service/FootPrint/Colors/color.service', () => ({
  ColorsService: { ScrollWidth: 0 },
}), { virtual: true });

import { FootprintDataLoaderService } from '../footprint-data-loader.service';
import { FootprintLayoutService } from '../footprint-layout.service';
import { ClusterData } from '../../models/cluster-data';

describe('Footprint empty history', () => {
  it.each(['candles', 'ticks', 'arbitrage'])('publishes an empty %s result without synthetic candles', async mode => {
    const empty = new ClusterData({ priceScale: 1, clusterData: [] });
    const stream = { GetRange: jest.fn(() => of(empty)), getRangeSetArray: jest.fn(() => of([])) };
    const loader = new FootprintDataLoaderService({} as any,
      { load: jest.fn().mockResolvedValue(undefined), invalidateLoad: jest.fn() } as any,
      stream as any, {} as any);
    let published: ClusterData | null = null;
    const subscription = loader.state$.subscribe(state => { published = state.status === 'ready' || state.status === 'empty' ? state.snapshot.data : null; });
    const request = loader.beginSession({ ticker: 'SBER', ticker1: 'SBER', ticker2: 'GAZP',
      type: mode === 'arbitrage' ? 'arbitrage' : undefined,
      period: mode === 'ticks' ? 0 : 1, priceStep: 1, candlesOnly: mode === 'candles' });
    const snapshot = await loader.loadSession(request!);
    const loaded = !!snapshot && loader.commitSnapshot(snapshot);

    expect(loaded).toBe(true);
    expect(published?.clusterData).toEqual([]);
    if (mode === 'arbitrage') {
      expect(stream.getRangeSetArray).toHaveBeenCalledTimes(1);
      expect(published?.rangeSetLines).toEqual([]);
    } else {
      expect(stream.GetRange).toHaveBeenCalledTimes(1);
    }
    subscription.unsubscribe();
    loader.destroy();
  });

  it('keeps an invertible viewport matrix for an empty graph', () => {
    const layout = new FootprintLayoutService({ sscale: () => 1 } as any);
    const data = new ClusterData({ priceScale: 1, clusterData: [] });
    const matrix = layout.getInitialMatrix({ x: 0, y: 0, w: 400, h: 300 }, data,
      { ShrinkY: true, totalMode: 'Hidden' } as any,
      { period: 1, priceStep: 1, candlesOnly: true });
    for (const point of [matrix.applyToPoint(0, 0), matrix.inverse().applyToPoint(100, 100)]) {
      expect(Number.isFinite(point.x)).toBe(true);
      expect(Number.isFinite(point.y)).toBe(true);
    }
  });
});
