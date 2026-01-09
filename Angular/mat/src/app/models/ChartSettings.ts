import type { VolumeHeightMap } from './volume-heights';

export interface ChartSettings {
    CandlesOnly: boolean;
  Head: boolean;
  OI: boolean;
  OIDelta: boolean;
  Delta: boolean;
  DeltaBars: boolean;
  CompressToCandles: string;
  totalMode: string;
  TopVolumes: boolean;
  SeparateVolume: boolean;
  ShrinkY: boolean;
  ToolTip: boolean;
  ExtendedToolTip: boolean;
  Postmarket: boolean;
  OpenClose: boolean;
  style: string;
  deltaStyle: string;
  classic: string;
  Contracts: boolean;
  oiEnable: boolean;
  horizStyle: boolean;
  Bars: boolean;
  volume1: number;
  volume2: number;
  MaxTrades: boolean;
  Default: boolean;
  Name: string;
  VolumesHeight?: VolumeHeightMap;
  DeltaGraph: boolean;
  DialogPositions?: Record<string, { x: number; y: number }>;
}

