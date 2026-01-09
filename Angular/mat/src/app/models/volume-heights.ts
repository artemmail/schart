export const VolumeHeightKeys = {
  SeparateVolume: 'SeparateVolume',
  OI: 'OI',
  Delta: 'Delta',
  OIDelta: 'OIDelta',
  Total: 'Total',
  DeltaBars: 'DeltaBars',
} as const;

export type VolumeHeightKey = typeof VolumeHeightKeys[keyof typeof VolumeHeightKeys];

export type VolumeHeightMap = Record<VolumeHeightKey, number>;

export const VolumeHeightKeyOrder: ReadonlyArray<VolumeHeightKey> = [
  VolumeHeightKeys.SeparateVolume,
  VolumeHeightKeys.OI,
  VolumeHeightKeys.Delta,
  VolumeHeightKeys.OIDelta,
  VolumeHeightKeys.Total,
  VolumeHeightKeys.DeltaBars,
];

export const DEFAULT_VOLUME_HEIGHTS: VolumeHeightMap = {
  SeparateVolume: 50,
  OI: 50,
  Delta: 50,
  OIDelta: 50,
  Total: 120,
  DeltaBars: 50,
};

export const MINI_VOLUME_HEIGHTS: VolumeHeightMap = {
  SeparateVolume: 95,
  OI: 110,
  Delta: 132,
  OIDelta: 75,
  Total: 120,
  DeltaBars: 123,
};

export function getVolumeHeightDefaults(candlesOnly: boolean): VolumeHeightMap {
  return candlesOnly ? MINI_VOLUME_HEIGHTS : DEFAULT_VOLUME_HEIGHTS;
}

export function normalizeVolumeHeights(raw: unknown, fallback: VolumeHeightMap): VolumeHeightMap {
  const normalized: VolumeHeightMap = { ...fallback };

  if (Array.isArray(raw)) {
    for (let i = 0; i < VolumeHeightKeyOrder.length; i++) {
      const value = Number(raw[i]);
      if (Number.isFinite(value)) {
        normalized[VolumeHeightKeyOrder[i]] = value;
      }
    }
    return normalized;
  }

  if (raw && typeof raw === 'object') {
    const record = raw as Record<string, unknown>;
    for (const key of VolumeHeightKeyOrder) {
      const value = Number(record[key]);
      if (Number.isFinite(value)) {
        normalized[key] = value;
      }
    }
  }

  return normalized;
}
