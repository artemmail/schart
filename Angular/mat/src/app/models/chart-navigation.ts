import { resolveFootprintMode } from './footprint-mode';

export function isoDate(value: unknown): string | undefined {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value as string);
  return Number.isFinite(date.getTime()) ? date.toISOString() : undefined;
}

/** Shared context for chart links, address bar and saved views. */
export function chartQuery(source: Record<string, any>): Record<string, string | number> {
  const mode = resolveFootprintMode(source);
  const query: Record<string, string | number> = {
    mode, period: mode === 'ticks' ? 0 : Number(source.period) > 0 ? Number(source.period) : 5,
    rperiod: source.rperiod || 'day',
  };
  if (mode === 'arbitrage') {
    if (source.ticker1) query.ticker1 = source.ticker1;
    if (source.ticker2) query.ticker2 = source.ticker2;
  } else if (source.ticker) query.ticker = String(source.ticker).toUpperCase();
  for (const name of ['startDate', 'endDate']) {
    const date = isoDate(source[name]);
    if (date) query[name] = date;
  }
  if (source.market !== undefined && Number.isFinite(Number(source.market))) query.market = Number(source.market);
  if (Number(source.priceStep) > 0) query.priceStep = Number(source.priceStep);
  if (source.presetIndex !== undefined && source.presetIndex !== null && Number.isFinite(Number(source.presetIndex))) query.presetIndex = Number(source.presetIndex);
  return query;
}
