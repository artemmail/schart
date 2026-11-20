import { chartQuery, isoDate } from './chart-navigation';

describe('chart navigation context', () => {
  it('keeps the market and exact time range in a shareable chart link', () => {
    expect(chartQuery({ ticker: 'sber', market: 0, mode: 'clusters', period: 5, priceStep: 0.01, rperiod: 'custom', startDate: '2026-10-15T07:30:00Z', endDate: '2026-10-15T08:45:00Z', presetIndex: 0 })).toEqual({
      ticker: 'SBER', market: 0, mode: 'clusters', period: 5, priceStep: 0.01, rperiod: 'custom', startDate: '2026-10-15T07:30:00.000Z', endDate: '2026-10-15T08:45:00.000Z', presetIndex: 0,
    });
  });
  it('does not lose tick mode or serialize unrelated access state', () => {
    expect(chartQuery({ ticker: 'GAZP', period: 0, candlesOnly: false, access: 'subscription' })).toEqual({ ticker: 'GAZP', mode: 'ticks', period: 0, rperiod: 'day' });
  });
  it('shares both portfolio legs without a stale ticker from the preceding chart', () => {
    expect(chartQuery({ ticker: 'SBER', mode: 'arbitrage', ticker1: 'GAZP*10', ticker2: 'SBER*5', period: 15 })).toEqual({ mode: 'arbitrage', period: 15, rperiod: 'day', ticker1: 'GAZP*10', ticker2: 'SBER*5' });
  });
  it('rejects invalid dates and numeric parameters', () => {
    expect(isoDate('invalid')).toBeUndefined();
    expect(chartQuery({ ticker: 'GAZP', mode: 'candles', period: -1, market: 'bad', priceStep: -1, startDate: 'invalid' })).toEqual({ ticker: 'GAZP', mode: 'candles', period: 5, rperiod: 'day' });
  });
});
