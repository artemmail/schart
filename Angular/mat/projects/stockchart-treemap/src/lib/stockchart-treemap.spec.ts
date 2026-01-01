import { createMockMarketMap, createPerformanceTreemap } from '../examples/shared/mock-data';

describe('stockchart-treemap mock data', () => {
  it('generates sectors with tickers', () => {
    const data = createMockMarketMap(2, 3);
    expect(data.length).toBe(2);
    expect(data[0].items?.length).toBe(3);
    expect(data[0].items?.[0]?.color).toBeTruthy();
  });

  it('leaves color empty for auto color-scale example', () => {
    const data = createPerformanceTreemap(1, 4);
    const hasColors = data.some(group => (group.items ?? []).some(item => !!item.color));
    expect(hasColors).toBeFalse();
  });
});
