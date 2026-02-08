export type FootprintMode = 'candles' | 'clusters' | 'ticks' | 'arbitrage';

export interface FootprintModeLike {
  mode?: unknown;
  type?: unknown;
  candlesOnly?: unknown;
  period?: unknown;
  ticker1?: string;
  ticker2?: string;
}

export interface ApplyFootprintModeOptions {
  defaultPeriod?: number;
  keepArbitrageTickers?: boolean;
  arbitrageDefaults?: {
    ticker1: string;
    ticker2: string;
  };
}

export const DEFAULT_ARBITRAGE_PORTFOLIO_1 = 'GAZP*200+LKOH*10';
export const DEFAULT_ARBITRAGE_PORTFOLIO_2 = 'GMKN*3+SBER*300';

function toFiniteNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

export function parseBooleanFlag(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1') {
      return true;
    }
    if (normalized === 'false' || normalized === '0') {
      return false;
    }
  }

  return undefined;
}

export function normalizeFootprintMode(value: unknown): FootprintMode | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  switch (normalized) {
    case 'candles':
    case 'candle':
      return 'candles';
    case 'clusters':
    case 'cluster':
      return 'clusters';
    case 'ticks':
    case 'tick':
    case 'trades':
      return 'ticks';
    case 'arbitrage':
    case 'pairtrading':
    case 'pair-trading':
    case 'pair_trading':
      return 'arbitrage';
    default:
      return null;
  }
}

export function resolveFootprintMode(source: FootprintModeLike): FootprintMode {
  const explicitMode =
    normalizeFootprintMode(source.mode) ?? normalizeFootprintMode(source.type);
  if (explicitMode) {
    return explicitMode;
  }

  const period = toFiniteNumber(source.period);
  if (period === 0) {
    return 'ticks';
  }

  const candlesOnly = parseBooleanFlag(source.candlesOnly);
  if (candlesOnly === true) {
    return 'candles';
  }

  return 'clusters';
}

export function isArbitrageMode(source: FootprintModeLike): boolean {
  return resolveFootprintMode(source) === 'arbitrage';
}

export function applyFootprintModeToParams<
  T extends {
    type?: string;
    candlesOnly?: boolean;
    period?: number;
    ticker1?: string;
    ticker2?: string;
  }
>(
  params: T,
  mode: FootprintMode,
  options: ApplyFootprintModeOptions = {}
): T {
  const next = { ...params };
  const fallbackPeriod =
    typeof options.defaultPeriod === 'number' && options.defaultPeriod > 0
      ? options.defaultPeriod
      : 1;

  const defaults = options.arbitrageDefaults ?? {
    ticker1: DEFAULT_ARBITRAGE_PORTFOLIO_1,
    ticker2: DEFAULT_ARBITRAGE_PORTFOLIO_2,
  };
  const clearArbitrageTickers = !options.keepArbitrageTickers;

  const ensurePositivePeriod = () => {
    if (
      typeof next.period !== 'number' ||
      !Number.isFinite(next.period) ||
      next.period <= 0
    ) {
      next.period = fallbackPeriod;
    }
  };

  switch (mode) {
    case 'arbitrage':
      next.type = 'arbitrage';
      next.candlesOnly = false;
      ensurePositivePeriod();
      next.ticker1 = next.ticker1 ?? defaults.ticker1;
      next.ticker2 = next.ticker2 ?? defaults.ticker2;
      break;

    case 'ticks':
      next.type = undefined;
      next.candlesOnly = false;
      next.period = 0;
      if (clearArbitrageTickers) {
        next.ticker1 = undefined;
        next.ticker2 = undefined;
      }
      break;

    case 'candles':
      next.type = undefined;
      next.candlesOnly = true;
      ensurePositivePeriod();
      if (next.period === 0) {
        next.period = fallbackPeriod;
      }
      if (clearArbitrageTickers) {
        next.ticker1 = undefined;
        next.ticker2 = undefined;
      }
      break;

    case 'clusters':
    default:
      next.type = undefined;
      next.candlesOnly = false;
      ensurePositivePeriod();
      if (next.period === 0) {
        next.period = fallbackPeriod;
      }
      if (clearArbitrageTickers) {
        next.ticker1 = undefined;
        next.ticker2 = undefined;
      }
      break;
  }

  return next as T;
}
