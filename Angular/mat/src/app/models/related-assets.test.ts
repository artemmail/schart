import { normalizeRelatedAssetsResponse } from './related-assets';

describe('Related assets API response', () => {
  it('reads MVC PascalCase DTOs inside the camelCase response envelope', () => {
    const result = normalizeRelatedAssetsResponse({
      selectedMarket: 0,
      relations: {
        Stock: { SecurityId: 'GAZP', Shortname: 'ГАЗПРОМ ао', Market: 0 },
        Futures: [{ SecurityId: 'GAZPF', CurrentPrice: 97.9, ExpirationDate: '2100-01-01T00:00:00', LotSize: null }],
        Options: [{ SecurityId: 'option', OptionType: 'CALL', Strike: 100, Volatility: 20, OpenInterest: 0, CurrentPrice: 0 }],
        Bonds: [{ SecurityId: 'RU000A0ZZES2', CurrentPrice: 99.45, CurrentYield: null, MaturityDate: '2048-06-23T00:00:00', NextCouponDate: '2027-01-19T00:00:00' }],
      },
    });

    expect(result.selectedMarket).toBe(0);
    expect(result.relations.stock.securityId).toBe('GAZP');
    expect(result.relations.stock.shortname).toBe('ГАЗПРОМ ао');
    expect(result.relations.futures[0].currentPrice).toBe(97.9);
    expect(result.relations.futures[0].expirationDate).toBe('2100-01-01T00:00:00');
    expect(result.relations.options[0].optionType).toBe('CALL');
    expect(result.relations.options[0].strike).toBe(100);
    expect(result.relations.options[0].volatility).toBe(20);
    expect(result.relations.options[0].openInterest).toBe(0);
    expect(result.relations.options[0].currentPrice).toBe(0);
    expect(result.relations.bonds[0].currentPrice).toBe(99.45);
    expect(result.relations.bonds[0].nextCouponDate).toBe('2027-01-19T00:00:00');
  });

  it('also accepts camelCase responses and empty branches', () => {
    const result = normalizeRelatedAssetsResponse({ selectedMarket: 2, relations: {
      stock: { securityId: 'GAZP', shortname: 'ГАЗПРОМ ао' }, futures: [], options: null, bonds: [],
    } });
    expect(result.selectedMarket).toBe(2);
    expect(result.relations.stock.securityId).toBe('GAZP');
    expect(result.relations.options).toEqual([]);
  });

  it('rejects an invalid root at the API boundary', () => {
    expect(() => normalizeRelatedAssetsResponse({ selectedMarket: 0, relations: {} })).toThrow();
  });

  it('preserves a non-chartable underlying family and clickable contracts', () => {
    const result = normalizeRelatedAssetsResponse({ selectedMarket: 1, relations: {
      Stock: { SecurityId: 'MIX', CanOpenChart: false },
      Futures: [{ SecurityId: 'MXZ6', CanOpenChart: true }], Options: [], Bonds: [],
    } });
    expect(result.relations.stock.canOpenChart).toBe(false);
    expect(result.relations.futures[0].canOpenChart).toBe(true);
  });
});
