import { IndicatorRegistry } from '../indicator-registry';
import { SmaIndicator } from './sma.indicator';
import { VolumeIndicator } from './volume.indicator';
import { BollingerBandsIndicator } from './bollinger.indicator';
import { MidPriceOiCumWeightedIndicator } from './midprice-oi-cumweighted.indicator';

export function registerFootprintBuiltInIndicators(registry: IndicatorRegistry): void {
  registry.register(SmaIndicator);
  registry.register(VolumeIndicator);
  registry.register(BollingerBandsIndicator);
  registry.register(MidPriceOiCumWeightedIndicator);
}
