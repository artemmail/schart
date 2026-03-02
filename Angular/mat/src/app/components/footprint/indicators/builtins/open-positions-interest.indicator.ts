import {
  DataSeries,
  IndicatorContext,
  IndicatorDefinition,
  IndicatorInstance,
  IndicatorRuntimeMeta,
  OpenPositionsLoadResult,
  OpenPositionsSnapshot,
  ParamSchema,
} from '../indicator-api';

export type OpenPositionsInterestParams = {
  valueMode: 'positions' | 'persons' | 'physVsJur';
  showJuridicalLong: boolean;
  showJuridicalShort: boolean;
  showPhysicalLong: boolean;
  showPhysicalShort: boolean;
};

const openPositionsInterestParamsSchema: ParamSchema<OpenPositionsInterestParams> = {
  valueMode: {
    type: 'enum',
    title: 'Показывать',
    default: 'positions',
    options: [
      { value: 'positions', label: 'Позиции' },
      { value: 'persons', label: 'Число лиц' },
      { value: 'physVsJur', label: '(Юр лонг-Юр шорт)-(Физ лонг-физ шорт)' },
    ],
  },
  showJuridicalLong: { type: 'bool', title: 'Длинные позиции юридических лиц', default: true },
  showJuridicalShort: { type: 'bool', title: 'Короткие позиции юридических лиц', default: true },
  showPhysicalLong: { type: 'bool', title: 'Длинные позиции физических лиц', default: true },
  showPhysicalShort: { type: 'bool', title: 'Короткие позиции физических лиц', default: true },
};

type SeriesKeys = 'jl' | 'js' | 'pl' | 'ps' | 'vj';

function createSeries(id: string, name: string, color: string, barsCount: number): DataSeries {
  const values = new Float64Array(barsCount);
  values.fill(NaN);
  return {
    id,
    name,
    visual: 'Line',
    values,
    color,
    width: 2,
    visible: true,
    panelMessage: null,
  };
}

function normalizeTicker(ticker: string | null | undefined): string {
  return (ticker ?? '').trim().toUpperCase();
}

function endOfLocalDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

function resolveStatusMessage(result: OpenPositionsLoadResult): string {
  const defaultMessages: Record<Exclude<OpenPositionsLoadResult['status'], 'ok'>, string> = {
    notFuture: 'Инструмент не является фьючерсом.',
    noData: 'Нет информации по открытым позициям.',
    forbidden: 'Данные по открытому интересу доступны по подписке.',
    error: 'Не удалось загрузить открытые позиции.',
  };

  return result.message?.trim() || defaultMessages[result.status];
}

function resolveValueModeName(mode: OpenPositionsInterestParams['valueMode']): string {
  if (mode === 'physVsJur') {
    return 'vs';
  }
  return mode === 'persons' ? 'лица' : 'позиции';
}

function setSeriesNames(
  seriesMap: Record<SeriesKeys, DataSeries>,
  mode: OpenPositionsInterestParams['valueMode']
): void {
  const modeSuffix = resolveValueModeName(mode);
  seriesMap.jl.name = `Юр. Long (${modeSuffix})`;
  seriesMap.js.name = `Юр. Short (${modeSuffix})`;
  seriesMap.pl.name = `Физ. Long (${modeSuffix})`;
  seriesMap.ps.name = `Физ. Short (${modeSuffix})`;
  seriesMap.vj.name = '(Юр. Long - Юр. Short) - (Физ. Long - Физ. Short)';
}

function extractValue(
  position: OpenPositionsSnapshot,
  key: SeriesKeys,
  mode: OpenPositionsInterestParams['valueMode']
): number {
  if (mode === 'persons') {
    switch (key) {
      case 'jl':
        return position.juridicalLongCount;
      case 'js':
        return position.juridicalShortCount;
      case 'pl':
        return position.physicalLongCount;
      case 'ps':
        return position.physicalShortCount;
    }
  }

  switch (key) {
    case 'jl':
      return position.juridicalLong;
    case 'js':
      return position.juridicalShort;
    case 'pl':
      return position.physicalLong;
    case 'ps':
      return position.physicalShort;
    case 'vj':
      return NaN;
  }
}

function extractPhysVsJur(position: OpenPositionsSnapshot): number {
  return (
    (position.juridicalLong - position.juridicalShort) -
    (position.physicalLong - position.physicalShort)
  );
}

function resolvePeriodMinutes(meta: IndicatorRuntimeMeta, candlesCount: number, ctx: IndicatorContext): number {
  const raw = Number(meta.period);
  if (Number.isFinite(raw) && raw >= 0) {
    return raw;
  }

  if (candlesCount < 2) {
    return 1;
  }

  const c = ctx.candles;
  let minDiff = Number.POSITIVE_INFINITY;
  for (let i = 1; i < c.length; i++) {
    const diff = c[i].t - c[i - 1].t;
    if (diff > 0) {
      minDiff = Math.min(minDiff, diff);
    }
  }

  if (!Number.isFinite(minDiff) || minDiff <= 0) {
    return 1;
  }

  return minDiff / 60_000;
}

function findLatestByTime(positions: OpenPositionsSnapshot[], ts: number): OpenPositionsSnapshot | null {
  if (!positions.length) {
    return null;
  }

  let lo = 0;
  let hi = positions.length - 1;
  let ans = -1;

  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (positions[mid].dateMs <= ts) {
      ans = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  return ans >= 0 ? positions[ans] : null;
}

export const OpenPositionsInterestIndicator: IndicatorDefinition<OpenPositionsInterestParams> = {
  type: 'open-positions-interest',
  displayName: 'Open Positions',
  category: 'Open Interest',
  defaultPanel: 'newPanel',
  panelBehavior: 'fixed',
  paramsSchema: openPositionsInterestParamsSchema,

  create(ctx: IndicatorContext, params: OpenPositionsInterestParams): IndicatorInstance<OpenPositionsInterestParams> {
    const seriesMap: Record<SeriesKeys, DataSeries> = {
      jl: createSeries('OPI_JL', 'Юр. Long (позиции)', '#1E88E5', ctx.barsCount()),
      js: createSeries('OPI_JS', 'Юр. Short (позиции)', '#C9A227', ctx.barsCount()),
      pl: createSeries('OPI_PL', 'Физ. Long (позиции)', '#2E7D32', ctx.barsCount()),
      ps: createSeries('OPI_PS', 'Физ. Short (позиции)', '#C62828', ctx.barsCount()),
      vj: createSeries('OPI_VSJ', '(Юр. Long - Юр. Short) - (Физ. Long - Физ. Short)', '#455A64', ctx.barsCount()),
    };

    const series = [seriesMap.jl, seriesMap.js, seriesMap.pl, seriesMap.ps, seriesMap.vj];

    let tickerKey = '';
    let loadToken = 0;
    let loading = false;
    let positions: OpenPositionsSnapshot[] = [];
    let latestPosition: OpenPositionsSnapshot | null = null;
    let panelMessage: string | null = null;

    const setPanelMessage = (next: string | null) => {
      const normalized = next?.trim() || null;
      if (normalized === panelMessage) {
        return;
      }

      panelMessage = normalized;
      for (const s of series) {
        s.panelMessage = panelMessage;
      }
    };

    const clearBar = (bar: number) => {
      for (const s of series) {
        s.values[bar] = NaN;
      }
    };

    const clearAll = () => {
      for (const s of series) {
        s.values.fill(NaN);
      }
    };

    const loadData = async (ticker: string): Promise<void> => {
      const token = ++loadToken;
      loading = true;
      positions = [];
      latestPosition = null;
      clearAll();
      setPanelMessage('Загрузка открытых позиций...');
      ctx.requestRender();

      const result = await ctx.loadOpenPositionsByTicker(ticker);
      if (token !== loadToken) {
        return;
      }

      loading = false;

      if (result.status !== 'ok' || !result.positions?.length) {
        setPanelMessage(resolveStatusMessage(result));
        ctx.requestRecalc();
        return;
      }

      positions = [...result.positions].sort((a, b) => a.dateMs - b.dateMs);
      latestPosition = positions[positions.length - 1] ?? null;
      setPanelMessage(null);
      ctx.requestRecalc();
    };

    const resolvePositionForBar = (barTs: number, periodMinutes: number): OpenPositionsSnapshot | null => {
      if (!positions.length || !latestPosition) {
        return null;
      }

      if (periodMinutes > 1440) {
        return latestPosition;
      }

      return findLatestByTime(positions, endOfLocalDay(barTs));
    };

    const writeValues = (bar: number, position: OpenPositionsSnapshot) => {
      if (params.valueMode === 'physVsJur') {
        seriesMap.jl.values[bar] = NaN;
        seriesMap.js.values[bar] = NaN;
        seriesMap.pl.values[bar] = NaN;
        seriesMap.ps.values[bar] = NaN;
        seriesMap.vj.values[bar] = extractPhysVsJur(position);
        return;
      }

      seriesMap.jl.values[bar] = params.showJuridicalLong ? extractValue(position, 'jl', params.valueMode) : NaN;
      seriesMap.js.values[bar] = params.showJuridicalShort ? extractValue(position, 'js', params.valueMode) : NaN;
      seriesMap.pl.values[bar] = params.showPhysicalLong ? extractValue(position, 'pl', params.valueMode) : NaN;
      seriesMap.ps.values[bar] = params.showPhysicalShort ? extractValue(position, 'ps', params.valueMode) : NaN;
      seriesMap.vj.values[bar] = NaN;
    };

    setSeriesNames(seriesMap, params.valueMode);

    return {
      type: 'open-positions-interest',
      params,
      panel: 'chart',
      series,
      warmupPeriod: 0,

      onCalculate(bar: number) {
        if (bar < 0 || bar >= ctx.barsCount()) {
          return;
        }

        const meta = ctx.getMeta();
        const nextTicker = normalizeTicker(meta.ticker);

        if (!nextTicker) {
          setPanelMessage('Тикер не задан.');
          clearBar(bar);
          return;
        }

        if (nextTicker !== tickerKey) {
          tickerKey = nextTicker;
          void loadData(tickerKey);
        }

        if (loading || !positions.length) {
          clearBar(bar);
          return;
        }

        const candle = ctx.candles[bar];
        if (!candle || !Number.isFinite(candle.t)) {
          clearBar(bar);
          return;
        }

        const periodMinutes = resolvePeriodMinutes(meta, ctx.barsCount(), ctx);
        const position = resolvePositionForBar(candle.t, periodMinutes);
        if (!position) {
          clearBar(bar);
          return;
        }

        writeValues(bar, position);
      },

      onParamsChanged(next: OpenPositionsInterestParams) {
        params = next;
        setSeriesNames(seriesMap, next.valueMode);
        ctx.requestRecalc();
      },
    };
  },
};
