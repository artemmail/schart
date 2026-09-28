import { shouldSubscribeRealtime, nextRealtimeCheckDelay, isRealtimeWindowOpen } from '../footprint-realtime-policy';

describe('Footprint realtime admission in chart timezone', () => {
  const params = { ticker: 'SI', period: 1, priceStep: 1, candlesOnly: false };
  it('opens at 06:45 Moscow and rejects weekends', () => {
    expect(shouldSubscribeRealtime(params, new Date('2026-09-28T03:44:59Z'))).toBe(false);
    expect(shouldSubscribeRealtime(params, new Date('2026-09-28T03:45:00Z'))).toBe(true);
    expect(isRealtimeWindowOpen(new Date('2026-09-26T10:00:00Z'))).toBe(false);
  });
  it('compares date-only ranges against Moscow days around UTC midnight', () => {
    expect(shouldSubscribeRealtime({ ...params, endDate: '2026-09-28' }, new Date('2026-09-28T20:59:59Z'))).toBe(true);
    expect(shouldSubscribeRealtime({ ...params, endDate: '2026-09-28' }, new Date('2026-09-29T04:00:00Z'))).toBe(false);
  });
  it('preserves the admission grace for explicit timestamps and skips arbitrage', () => {
    expect(shouldSubscribeRealtime({ ...params, endDate: '2026-09-28T10:00:00Z' }, new Date('2026-09-28T10:04:59Z'))).toBe(true);
    expect(shouldSubscribeRealtime({ ...params, endDate: '2026-09-28T10:00:00Z' }, new Date('2026-09-28T10:05:01Z'))).toBe(false);
    expect(shouldSubscribeRealtime({ ...params, type: 'arbitrage' }, new Date('2026-09-28T10:00:00Z'))).toBe(false);
  });
  it('checks at the next minute only while the range may accept realtime', () => {
    expect(nextRealtimeCheckDelay(params, new Date('2026-09-28T03:44:30Z'))).toBe(30_000);
    expect(nextRealtimeCheckDelay({ ...params, endDate: '2020-01-01' }, new Date('2026-09-28T10:00:00Z'))).toBeNull();
  });
});
