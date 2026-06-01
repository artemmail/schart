export type FootprintQueryParams = Record<string, any>;

// Keeps malformed links like ?ticker=GAZPperiod=5rperiod=day usable.
export function normalizeFootprintQueryParams<T extends FootprintQueryParams>(
  params: T
): T {
  const ticker = params['ticker'];

  if (typeof ticker !== 'string' || !ticker.includes('period=')) {
    return params;
  }

  const match = ticker.match(/^(.+?)period=([^&]+?)(?:rperiod=([^&]+))?$/);
  if (!match) {
    return params;
  }

  return {
    ...params,
    ticker: match[1],
    period: params['period'] ?? match[2],
    rperiod: params['rperiod'] ?? match[3],
  } as T;
}
