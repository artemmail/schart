export type StockChartTheme = Partial<{
  bg: string;
  grid: string;
  gridMinor: string;
  gridFaint: string;
  gridSoft: string;
  gridZero: string;
  text: string;
  textMuted: string;
  axis: string;
  up: string;
  down: string;
  upStrong: string;
  downStrong: string;
  upSoft: string;
  downSoft: string;
  upStrongSoft: string;
  downStrongSoft: string;
  upFaint: string;
  downFaint: string;
  upBorder: string;
  downBorder: string;
  bid: string;
  ask: string;
  accent: string;
  accentSoft: string;
  selection: string;
  crosshair: string;
  labelBg: string;
  labelText: string;
  scroll: string;
  scrollGradient: string;
  panel: string;
  heatLow: string;
  heatMid: string;
  heatHigh: string;
}>;

export type StockChartPalette = Required<StockChartTheme>;

export type ThemePreset = 'Light' | 'Dark';

export const DEFAULT_THEME_PRESET: ThemePreset = 'Dark';

export const STOCK_CHART_DEFAULT_PALETTE: StockChartPalette = {
  bg: '#ffffff',
  grid: '#888888',
  gridMinor: 'rgba(0,0,0,0.08)',
  gridFaint: 'rgba(0,0,0,0.04)',
  gridSoft: '#c0c0c0',
  gridZero: '#dddddd',
  text: '#000000',
  textMuted: '#333333',
  axis: '#888888',
  up: '#6ba583',
  down: '#d75442',
  upStrong: '#04a344',
  downStrong: '#d61800',
  upSoft: 'rgba(107, 165, 131, 0.6)',
  downSoft: 'rgba(215, 84, 66, 0.6)',
  upStrongSoft: 'rgba(4, 163, 68, 0.6)',
  downStrongSoft: 'rgba(214, 24, 0, 0.6)',
  upFaint: 'rgba(107, 165, 131, 0.25)',
  downFaint: 'rgba(215, 84, 66, 0.15)',
  upBorder: '#225437',
  downBorder: '#5b1a13',
  bid: '#3b82f6',
  ask: '#f97316',
  accent: '#1e90ff',
  accentSoft: '#6495ed',
  selection: '#80c4de',
  crosshair: 'rgba(200,200,200,0.7)',
  labelBg: '#000000',
  labelText: '#eeeeee',
  scroll: '#404040',
  scrollGradient: 'rgba(255,255,255,0.65)',
  panel: 'Linen',
  heatLow: 'rgba(59,130,246,0.10)',
  heatMid: 'rgba(168,85,247,0.20)',
  heatHigh: 'rgba(249,115,22,0.30)',
};
