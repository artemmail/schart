export function getEffectiveVolumePerQuantity(value: number | null | undefined): number {
  return Number.isFinite(value) && value !== null && value !== undefined && value > 0
    ? value
    : 1;
}

export function calculateWeightedAveragePrice(
  volume: number | null | undefined,
  quantity: number | null | undefined,
  volumePerQuantity: number | null | undefined
): number | null {
  if (!Number.isFinite(volume) || !Number.isFinite(quantity) || !quantity || quantity <= 0) {
    return null;
  }

  const denominator = quantity * getEffectiveVolumePerQuantity(volumePerQuantity);
  if (!Number.isFinite(denominator) || denominator <= 0) {
    return null;
  }

  const value = volume / denominator;
  return Number.isFinite(value) ? value : null;
}
