import { Candle, DataSeries, SourceType } from '../indicator-api';

export type TechnicalIndicatorsInput = {
  open: number[];
  high: number[];
  low: number[];
  close: number[];
  volume: number[];
  values: number[];
  signature: string;
};

export const oscillatorRange = Object.freeze({ min: 0, max: 100 });

export const sourceOptions = [
  { value: 'close', label: 'Close' },
  { value: 'open', label: 'Open' },
  { value: 'high', label: 'High' },
  { value: 'low', label: 'Low' },
  { value: 'hl2', label: 'HL2' },
  { value: 'hlc3', label: 'HLC3' },
  { value: 'ohlc4', label: 'OHLC4' },
  { value: 'volume', label: 'Volume' },
  { value: 'quantity', label: 'Quantity' },
  { value: 'oi', label: 'Open Interest' },
] as const;

export function asPositivePeriod(value: number): number {
  return Math.max(1, Math.floor(value));
}

export function createNanValues(length: number): Float64Array {
  const values = new Float64Array(length);
  values.fill(NaN);
  return values;
}

export function finiteOrNaN(value: number | null | undefined): number {
  return typeof value === 'number' && isFinite(value) ? value : NaN;
}

export function buildTechnicalIndicatorsInput(
  candles: readonly Candle[],
  source: SourceType
): TechnicalIndicatorsInput {
  const open: number[] = [];
  const high: number[] = [];
  const low: number[] = [];
  const close: number[] = [];
  const volume: number[] = [];
  const values: number[] = [];

  for (const candle of candles) {
    open.push(finiteOrNaN(candle.o));
    high.push(finiteOrNaN(candle.h));
    low.push(finiteOrNaN(candle.l));
    close.push(finiteOrNaN(candle.c));
    volume.push(finiteOrNaN(candle.v ?? candle.q ?? 0));
    values.push(sourceFromCandle(candle, source));
  }

  return {
    open,
    high,
    low,
    close,
    volume,
    values,
    signature: candlesSignature(candles),
  };
}

export function candlesSignature(candles: readonly Candle[]): string {
  const length = candles.length;
  if (!length) return '0';

  const first = candles[0];
  const last = candles[length - 1];
  return [
    length,
    first?.t ?? 0,
    last?.t ?? 0,
    last?.o ?? 0,
    last?.h ?? 0,
    last?.l ?? 0,
    last?.c ?? 0,
    last?.v ?? 0,
    last?.q ?? 0,
    last?.oi ?? 0,
    last?.bv ?? 0,
  ].join('|');
}

export function sourceFromCandle(candle: Candle, source: SourceType): number {
  switch (source) {
    case 'open':
      return finiteOrNaN(candle.o);
    case 'high':
      return finiteOrNaN(candle.h);
    case 'low':
      return finiteOrNaN(candle.l);
    case 'hl2':
      return finiteOrNaN((candle.h + candle.l) / 2);
    case 'hlc3':
      return finiteOrNaN((candle.h + candle.l + candle.c) / 3);
    case 'ohlc4':
      return finiteOrNaN((candle.o + candle.h + candle.l + candle.c) / 4);
    case 'volume':
      return finiteOrNaN(candle.v ?? 0);
    case 'quantity':
      return finiteOrNaN(candle.q ?? 0);
    case 'oi':
      return finiteOrNaN(candle.oi ?? 0);
    case 'askVolume':
      return finiteOrNaN(candle.bv ?? 0);
    case 'bidVolume':
      return finiteOrNaN((candle.v ?? 0) - (candle.bv ?? 0));
    case 'close':
    default:
      return finiteOrNaN(candle.c);
  }
}

export function writeAlignedResults<T>(
  target: Float64Array,
  results: readonly T[],
  selector: (item: T) => number | null | undefined
): void {
  target.fill(NaN);
  const offset = Math.max(0, target.length - results.length);

  for (let i = 0; i < results.length; i++) {
    const targetIndex = offset + i;
    if (targetIndex < 0 || targetIndex >= target.length) continue;
    target[targetIndex] = finiteOrNaN(selector(results[i]));
  }
}

export function fillLevelSeries(series: DataSeries, value: number, enabled: boolean): void {
  series.values.fill(NaN);
  if (!enabled || !isFinite(value)) return;
  series.values.fill(value);
}

