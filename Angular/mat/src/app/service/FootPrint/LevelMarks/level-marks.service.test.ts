import { expect } from '@jest/globals';
import { of, Subject } from 'rxjs';

jest.mock('@angular/core', () => ({ Injectable: () => (target: unknown) => target }));
jest.mock('@angular/common/http', () => ({ HttpErrorResponse: class extends Error {} }));
jest.mock('src/app/environment', () => ({ environment: { apiUrl: '' } }), { virtual: true });

import { LevelMarksService, MarkLineLevel } from './level-marks.service';

describe('LevelMarks per-widget state', () => {
  const originalWindow = globalThis.window;

  beforeEach(() => {
    Object.assign(globalThis, { window: { localStorage: {
      getItem: jest.fn().mockReturnValue(null), setItem: jest.fn(), removeItem: jest.fn(),
    } } });
  });

  afterEach(() => {
    if (originalWindow === undefined) {
      delete (globalThis as any).window;
    } else {
      globalThis.window = originalWindow;
    }
  });

  it('loads independent tickers and saves each mark to its owner ticker', async () => {
    const http = {
      get: jest.fn((_url, options) => of([{ price: 100, comment: options.params.ticker, color: '#fff' }])),
      post: jest.fn(() => of({})),
    };
    const first = new LevelMarksService(http as any);
    const second = new LevelMarksService(http as any);
    const params = { ticker: 'SBER', period: 1, priceStep: 1, candlesOnly: false };
    await Promise.all([first.load(params), second.load({ ...params, ticker: 'GAZP' })]);
    expect(first.getPriceMark(100)?.comment).toBe('SBER');
    expect(second.getPriceMark(100)?.comment).toBe('GAZP');

    first.updatePriceMark(100, new MarkLineLevel('first', '#123'));
    second.updatePriceMark(100, new MarkLineLevel('second', '#456'));
    expect(http.post.mock.calls.map(call => (call as any[])[1].ticker)).toEqual(['SBER', 'GAZP']);
    expect(first.getPriceMark(100)?.comment).toBe('first');
    expect(second.getPriceMark(100)?.comment).toBe('second');
  });

  it('does not clear another widget marks when a mini widget skips the server', async () => {
    const http = { get: jest.fn(() => of([{ price: 100, comment: 'main', color: '#fff' }])) };
    const main = new LevelMarksService(http as any);
    const mini = new LevelMarksService(http as any);
    const params = { ticker: 'SBER', period: 1, priceStep: 1, candlesOnly: false };
    await main.load(params);
    await mini.load(params, { skipServer: true });
    expect(main.getPriceMark(100)?.comment).toBe('main');
    expect(mini.getPrices()).toEqual({});
    expect(http.get).toHaveBeenCalledTimes(1);
  });

  it('ignores a pending server response after switching the same widget to mini mode', async () => {
    const response = new Subject<any[]>();
    const http = { get: jest.fn(() => response) };
    const store = new LevelMarksService(http as any);
    const params = { ticker: 'SBER', period: 1, priceStep: 1, candlesOnly: false };
    const pending = store.load(params);
    // Let the queued request subscribe before changing the mode.
    await Promise.resolve();
    await store.load(params, { skipServer: true });
    response.next([{ price: 100, comment: 'late', color: '#fff' }]);
    response.complete();
    await pending;
    expect(store.getPrices()).toEqual({});
  });
});
