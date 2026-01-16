import { IndicatorRegistry } from '../indicator-registry';
import { SmaIndicator } from './sma.indicator';
import { VolumeIndicator } from './volume.indicator';
import { BollingerBandsIndicator } from './bollinger.indicator';

export function registerFootprintBuiltInIndicators(registry: IndicatorRegistry): void {
  registry.register(SmaIndicator);
  registry.register(VolumeIndicator);
  registry.register(BollingerBandsIndicator);
}
