import { resolveMarketMapColor } from './market-map-colors';

describe('market map theme colors', () => {
  function hostWithBackground(backgroundColor: string): HTMLElement {
    return {
      ownerDocument: { defaultView: { getComputedStyle: () => ({ backgroundColor }) } }
    } as unknown as HTMLElement;
  }

  for (const [background, expected] of [
    ['#FFFFFF', '#FF8080'],
    ['#000000', '#800000']
  ]) {
    it(`composites the API overlay on a ${background} panel`, () => {
      expect(resolveMarketMapColor(
        { colorRgba: 'rgba(255, 0, 0, 0.5)' }, '#0000FF', hostWithBackground(background)
      )).toBe(expected);
    });
  }

  it('uses the normal color when the API overlay is empty', () => {
    expect(resolveMarketMapColor({ colorRgba: '  ' }, '#00FF00', hostWithBackground('#000000')))
      .toBe('#00FF00');
  });
});
