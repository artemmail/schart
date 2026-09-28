import { MoscowTimeShift } from './utils';

describe('MoscowTimeShift', () => {
  it('keeps the original timestamp for footprint rendering', () => {
    const source = new Date('2026-03-22T12:00:00+05:00');

    const shifted = MoscowTimeShift(source);

    expect(shifted).not.toBe(source);
    expect(shifted.getTime()).toBe(source.getTime());
  });
});
