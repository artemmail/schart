import { calculateWeightedAveragePrice } from '../hint-vwap';

describe('calculateWeightedAveragePrice', () => {
  test('uses quantity as weight', () => {
    expect(calculateWeightedAveragePrice(40, 3, 1)).toBeCloseTo(40 / 3);
  });

  test('uses VolumePerQuantity as quantity multiplier', () => {
    expect(calculateWeightedAveragePrice(40, 3, 10)).toBeCloseTo(40 / 30);
  });

  test('returns null when quantity is zero', () => {
    expect(calculateWeightedAveragePrice(40, 0, 1)).toBeNull();
  });

  test('falls back to multiplier 1 when VolumePerQuantity is invalid', () => {
    expect(calculateWeightedAveragePrice(40, 3, 0)).toBeCloseTo(40 / 3);
    expect(calculateWeightedAveragePrice(40, 3, NaN)).toBeCloseTo(40 / 3);
  });
});
