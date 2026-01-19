import type { VolumeHeightMap } from './volume-heights';

export interface ChartSettings {
    CandlesOnly: boolean;
  Head: boolean;
  OI: boolean;
  OIDelta: boolean;
  OIDeltaDivideBy2: boolean;
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
  ThemePreset?: string;
  VolumesHeight?: VolumeHeightMap;
  DeltaGraph: boolean;
  DialogPositions?: Record<string, { x: number; y: number }>;

  /**
   * FootPrint indicators (ATAS-like). Stored in settings for preset persistence.
   * v1: UI edits params via schema, engine handles calc & rendering.
   */
  Indicators?: Array<{
    id: string;
    type: string;
    params: any;
    panel?: 'chart' | { id: string };
    visible?: boolean;
  }>;

  /**
   * Per-panel UI preferences (height/title) for indicator subpanels.
   */
  IndicatorPanels?: Record<string, { height?: number; title?: string }>;
}
