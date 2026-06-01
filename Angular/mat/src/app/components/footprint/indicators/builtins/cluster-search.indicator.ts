import { Cluster, ColumnEx } from 'src/app/models/Column';
import {
  ClusterOverlaySeries,
  ClusterOverlayShape,
  IndicatorContext,
  IndicatorDefinition,
  IndicatorInstance,
  ParamSchema,
} from '../indicator-api';

type ClusterSearchDataType =
  | 'volume'
  | 'maxVolume'
  | 'trades'
  | 'bid'
  | 'ask'
  | 'delta'
  | 'deltaPlus'
  | 'deltaMinus';

type PriceRangeDirection = 'all' | 'downward' | 'upward';
type BarDirection = 'any' | 'up' | 'down';
type PriceLocation =
  | 'any'
  | 'high'
  | 'low'
  | 'highLow'
  | 'body'
  | 'wick'
  | 'upperWick'
  | 'lowerWick';

export interface ClusterSearchParams {
  dataType: ClusterSearchDataType;
  minimum: number;
  maximum: number;
  barsRange: number;
  priceRange: number;
  priceRangeDirection: PriceRangeDirection;
  minValue: number;
  minDelta: number;
  bidAskImbalance: number;
  rangeFromHigh: number;
  rangeFromLow: number;
  minAvgTrade: number;
  maxAvgTrade: number;
  barDirection: BarDirection;
  priceLocation: PriceLocation;
  singleSelection: boolean;
  useTimeFilter: boolean;
  startTimeMinutes: number;
  endTimeMinutes: number;
  selectionColor: string;
  objectFillColor: string;
  objectBorderColor: string;
  objectShape: ClusterOverlayShape;
  objectMinSize: number;
  objectMaxSize: number;
}

const clusterSearchParamsSchema: ParamSchema<ClusterSearchParams> = {
  dataType: {
    type: 'enum',
    title: 'Type',
    default: 'volume',
    options: [
      { value: 'volume', label: 'Volume' },
      { value: 'maxVolume', label: 'Max Volume' },
      { value: 'trades', label: 'Trades' },
      { value: 'bid', label: 'Bid' },
      { value: 'ask', label: 'Ask' },
      { value: 'delta', label: 'Delta' },
      { value: 'deltaPlus', label: 'Delta+' },
      { value: 'deltaMinus', label: 'Delta-' },
    ],
  },
  minimum: { type: 'float', title: 'Minimum', default: 1000, min: 0, step: 1 },
  maximum: { type: 'float', title: 'Maximum (0 = off)', default: 0, min: 0, step: 1 },
  barsRange: { type: 'int', title: 'Bars Merge', default: 1, min: 1, max: 200, step: 1 },
  priceRange: { type: 'int', title: 'Prices Merge', default: 1, min: 1, max: 200, step: 1 },
  priceRangeDirection: {
    type: 'enum',
    title: 'Prices Direction',
    default: 'all',
    options: [
      { value: 'all', label: 'Both' },
      { value: 'downward', label: 'Top Down' },
      { value: 'upward', label: 'Bottom Up' },
    ],
  },
  minValue: { type: 'float', title: 'Min Cell Value (0 = off)', default: 0, min: 0, step: 1 },
  minDelta: { type: 'float', title: 'Min Delta (0 = off)', default: 0, step: 1 },
  bidAskImbalance: { type: 'float', title: 'BidAsk Imbalance % (0 = off)', default: 0, step: 1 },
  rangeFromHigh: { type: 'float', title: 'Range From High (0 = off)', default: 0, min: 0, step: 0.01 },
  rangeFromLow: { type: 'float', title: 'Range From Low (0 = off)', default: 0, min: 0, step: 0.01 },
  minAvgTrade: { type: 'float', title: 'Min Avg Trade (0 = off)', default: 0, min: 0, step: 0.1 },
  maxAvgTrade: { type: 'float', title: 'Max Avg Trade (0 = off)', default: 0, min: 0, step: 0.1 },
  barDirection: {
    type: 'enum',
    title: 'Bar Direction',
    default: 'any',
    options: [
      { value: 'any', label: 'Any' },
      { value: 'up', label: 'Up' },
      { value: 'down', label: 'Down' },
    ],
  },
  priceLocation: {
    type: 'enum',
    title: 'Price Location',
    default: 'any',
    options: [
      { value: 'any', label: 'Any' },
      { value: 'high', label: 'High' },
      { value: 'low', label: 'Low' },
      { value: 'highLow', label: 'High or Low' },
      { value: 'body', label: 'Body' },
      { value: 'wick', label: 'Wick' },
      { value: 'upperWick', label: 'Upper Wick' },
      { value: 'lowerWick', label: 'Lower Wick' },
    ],
  },
  singleSelection: { type: 'bool', title: 'Single Selection In Bar', default: false },
  useTimeFilter: { type: 'bool', title: 'Use Time Filter', default: false },
  startTimeMinutes: { type: 'int', title: 'Start Time, min from 00:00', default: 0, min: 0, max: 1439, step: 1 },
  endTimeMinutes: { type: 'int', title: 'End Time, min from 00:00', default: 1439, min: 0, max: 1439, step: 1 },
  selectionColor: { type: 'color', title: 'Selection Color', default: 'rgba(178,34,34,.35)' },
  objectFillColor: { type: 'color', title: 'Object Fill', default: 'rgba(30,144,255,.45)' },
  objectBorderColor: { type: 'color', title: 'Object Border', default: 'rgba(30,144,255,.95)' },
  objectShape: {
    type: 'enum',
    title: 'Object Shape',
    default: 'diamond',
    options: [
      { value: 'rectangle', label: 'Rectangle' },
      { value: 'triangle', label: 'Triangle' },
      { value: 'diamond', label: 'Diamond' },
      { value: 'circle', label: 'Circle' },
      { value: 'selectionOnly', label: 'Selection Only' },
    ],
  },
  objectMinSize: { type: 'int', title: 'Object Min Size', default: 20, min: 10, max: 200, step: 1 },
  objectMaxSize: { type: 'int', title: 'Object Max Size', default: 80, min: 10, max: 200, step: 1 },
};

interface AggregatedClusterValue {
  value: number;
  bid: number;
  ask: number;
  priceLow: number;
  priceHigh: number;
}

export const ClusterSearchIndicator: IndicatorDefinition<ClusterSearchParams> = {
  type: 'cluster-search',
  displayName: 'Cluster Search',
  category: 'Cluster',
  provider: 'stockchart',
  defaultPanel: 'chart',
  panelBehavior: 'fixed',
  paramsSchema: clusterSearchParamsSchema,

  create(ctx: IndicatorContext, initialParams: ClusterSearchParams): IndicatorInstance<ClusterSearchParams> {
    let params = normalizeParams(initialParams);
    const overlay: ClusterOverlaySeries = {
      id: 'CLUSTER_SEARCH',
      name: 'Cluster Search',
      items: [],
      visible: true,
    };

    const calculateBar = (bar: number): void => {
      const data = ctx.getClusterData();
      overlay.items = overlay.items.filter((item) => item.bar !== bar);

      if (!data?.ableCluster?.() || bar < 0 || bar >= data.clusterData.length) {
        updateObjectSizes(overlay, params);
        return;
      }

      const column = data.clusterData[bar];
      if (!column?.cl?.length || !passesBarFilters(column, params)) {
        updateObjectSizes(overlay, params);
        return;
      }

      const priceScale = normalizePriceScale(data.priceScale);
      const priceMaps = new Map<number, Map<number, Cluster>>();
      const hits = collectBarHits(data.clusterData, bar, priceScale, priceMaps, params);

      const visibleHits = params.singleSelection
        ? keepLargestHit(hits)
        : hits;

      overlay.items.push(
        ...visibleHits.map((hit) => ({
          bar,
          priceLow: hit.priceLow,
          priceHigh: hit.priceHigh,
          value: hit.value,
          selectionColor: params.selectionColor,
          objectFillColor: params.objectFillColor,
          objectBorderColor: params.objectBorderColor,
          objectShape: params.objectShape,
          label: `${overlay.name}: ${formatType(params.dataType)} ${formatNumber(hit.value)}`,
        }))
      );

      updateObjectSizes(overlay, params);
    };

    return {
      type: 'cluster-search',
      params: initialParams,
      panel: 'chart',
      series: [],
      clusterOverlays: [overlay],

      onReset() {
        overlay.items = [];
      },

      onCalculate(bar: number) {
        calculateBar(bar);
      },

      onParamsChanged(next: ClusterSearchParams) {
        params = normalizeParams(next);
        overlay.name = `Cluster Search ${formatType(params.dataType)}`;
        overlay.items = [];
        ctx.requestRecalc();
      },
    };
  },
};

function collectBarHits(
  columns: ColumnEx[],
  bar: number,
  priceScale: number,
  priceMaps: Map<number, Map<number, Cluster>>,
  params: ClusterSearchParams
): AggregatedClusterValue[] {
  const column = columns[bar];
  const hits: AggregatedClusterValue[] = [];

  for (const item of column.cl) {
    if (!passesCandidateFilters(column, item, params)) {
      continue;
    }

    const priceTick = toPriceTick(item.p, priceScale);
    let result: AggregatedClusterValue | null = null;

    if (params.priceRangeDirection === 'downward' || params.priceRangeDirection === 'all') {
      result = aggregatePriceRange(columns, bar, priceTick, -1, priceScale, priceMaps, params);
    }

    if (!result && (params.priceRangeDirection === 'upward' || params.priceRangeDirection === 'all')) {
      result = aggregatePriceRange(columns, bar, priceTick, 1, priceScale, priceMaps, params);
    }

    if (result) {
      hits.push(result);
    }
  }

  return hits;
}

function aggregatePriceRange(
  columns: ColumnEx[],
  bar: number,
  priceTick: number,
  direction: -1 | 1,
  priceScale: number,
  priceMaps: Map<number, Map<number, Cluster>>,
  params: ClusterSearchParams
): AggregatedClusterValue | null {
  let value = 0;
  let bid = 0;
  let ask = 0;
  let found = false;
  let lowTick = priceTick;
  let highTick = priceTick;

  const barsRange = Math.max(1, Math.floor(params.barsRange));
  const priceRange = Math.max(1, Math.floor(params.priceRange));
  const fromBar = Math.max(0, bar - barsRange + 1);

  for (let b = fromBar; b <= bar; b++) {
    const column = columns[b];
    if (!column?.cl?.length) continue;

    const priceMap = getPriceMap(column, b, priceScale, priceMaps);
    for (let offset = 0; offset < priceRange; offset++) {
      const tick = priceTick + offset * direction;
      const item = priceMap.get(tick);
      if (!item) continue;

      const itemValue = getItemValue(params.dataType, column, item);
      if (isZeroValueUnsupported(params.dataType, itemValue)) {
        continue;
      }
      if (params.minValue > 0 && Math.abs(itemValue) < params.minValue) {
        continue;
      }

      value += itemValue;
      ask += item.bq;
      bid += item.q - item.bq;
      found = true;
      lowTick = Math.min(lowTick, tick);
      highTick = Math.max(highTick, tick);
    }
  }

  if (!found || !passesAggregatedFilters(value, bid, ask, params)) {
    return null;
  }

  return {
    value,
    bid,
    ask,
    priceLow: roundPrice(lowTick * priceScale, priceScale),
    priceHigh: roundPrice(highTick * priceScale, priceScale),
  };
}

function getPriceMap(
  column: ColumnEx,
  bar: number,
  priceScale: number,
  cache: Map<number, Map<number, Cluster>>
): Map<number, Cluster> {
  const cached = cache.get(bar);
  if (cached) return cached;

  const map = new Map<number, Cluster>();
  for (const item of column.cl ?? []) {
    map.set(toPriceTick(item.p, priceScale), item);
  }
  cache.set(bar, map);
  return map;
}

function passesAggregatedFilters(
  value: number,
  bid: number,
  ask: number,
  params: ClusterSearchParams
): boolean {
  if (params.dataType === 'deltaPlus' && value < 0) return false;
  if (params.dataType === 'deltaMinus' && value > 0) return false;

  const absValue = Math.abs(value);
  if (absValue < params.minimum) return false;
  if (params.maximum > 0 && absValue > params.maximum) return false;

  if (params.minDelta !== 0) {
    const delta = ask - bid;
    if (params.minDelta > 0 && delta < params.minDelta) return false;
    if (params.minDelta < 0 && delta > params.minDelta) return false;
  }

  if (params.bidAskImbalance !== 0) {
    const ratio = params.bidAskImbalance / 100;
    const matched =
      ratio > 0
        ? ask > bid * ratio
        : ratio < 0
          ? bid > ask * -ratio
          : true;
    if (!matched) return false;
  }

  return true;
}

function passesBarFilters(column: ColumnEx, params: ClusterSearchParams): boolean {
  if (params.barDirection === 'up' && column.c <= column.o) return false;
  if (params.barDirection === 'down' && column.c >= column.o) return false;

  if (params.useTimeFilter) {
    const minutes = column.x.getHours() * 60 + column.x.getMinutes();
    const start = params.startTimeMinutes;
    const end = params.endTimeMinutes;
    const inside = start <= end
      ? minutes >= start && minutes <= end
      : minutes >= start || minutes <= end;
    if (!inside) return false;
  }

  return true;
}

function passesCandidateFilters(
  column: ColumnEx,
  item: Cluster,
  params: ClusterSearchParams
): boolean {
  if (!passesPriceLocation(column, item.p, params.priceLocation)) {
    return false;
  }

  if (params.rangeFromHigh > 0 && item.p < column.h - params.rangeFromHigh) {
    return false;
  }

  if (params.rangeFromLow > 0 && item.p > column.l + params.rangeFromLow) {
    return false;
  }

  const avgTrade = item.ct > 0 ? item.q / item.ct : 0;
  if (params.minAvgTrade > 0 && avgTrade < params.minAvgTrade) {
    return false;
  }

  if (params.maxAvgTrade > 0 && avgTrade > params.maxAvgTrade) {
    return false;
  }

  return true;
}

function passesPriceLocation(
  column: ColumnEx,
  price: number,
  location: PriceLocation
): boolean {
  const high = Math.max(column.h, column.l);
  const low = Math.min(column.h, column.l);
  const bodyHigh = Math.max(column.o, column.c);
  const bodyLow = Math.min(column.o, column.c);

  switch (location) {
    case 'high':
      return price === high;
    case 'low':
      return price === low;
    case 'highLow':
      return price === high || price === low;
    case 'body':
      return price <= bodyHigh && price >= bodyLow;
    case 'wick':
      return price > bodyHigh || price < bodyLow;
    case 'upperWick':
      return price > bodyHigh;
    case 'lowerWick':
      return price < bodyLow;
    default:
      return true;
  }
}

function getItemValue(
  type: ClusterSearchDataType,
  column: ColumnEx,
  item: Cluster
): number {
  const ask = item.bq;
  const bid = item.q - item.bq;

  switch (type) {
    case 'maxVolume':
      return item.q === column.qntMax ? item.q : 0;
    case 'trades':
      return item.ct;
    case 'bid':
      return bid;
    case 'ask':
      return ask;
    case 'delta':
      return ask - bid;
    case 'deltaPlus':
      return Math.max(0, ask - bid);
    case 'deltaMinus':
      return Math.min(0, ask - bid);
    default:
      return item.q;
  }
}

function isZeroValueUnsupported(type: ClusterSearchDataType, value: number): boolean {
  if (value !== 0) return false;
  return type === 'maxVolume' || type === 'deltaPlus' || type === 'deltaMinus';
}

function keepLargestHit(hits: AggregatedClusterValue[]): AggregatedClusterValue[] {
  if (!hits.length) return hits;

  let largest = hits[0];
  for (const hit of hits) {
    if (Math.abs(hit.value) > Math.abs(largest.value)) {
      largest = hit;
    }
  }

  return [largest];
}

function updateObjectSizes(
  overlay: ClusterOverlaySeries,
  params: ClusterSearchParams
): void {
  if (!overlay.items.length) return;

  const minSize = Math.max(10, Math.min(200, params.objectMinSize));
  const maxSize = Math.max(minSize, Math.min(200, params.objectMaxSize));
  let minAbs = Number.POSITIVE_INFINITY;
  let maxAbs = 0;

  for (const item of overlay.items) {
    const abs = Math.abs(item.value);
    minAbs = Math.min(minAbs, abs);
    maxAbs = Math.max(maxAbs, abs);
  }

  const range = maxAbs - minAbs;
  for (const item of overlay.items) {
    const ratio = range > 0 ? (Math.abs(item.value) - minAbs) / range : 1;
    item.objectSize = Math.round(minSize + (maxSize - minSize) * ratio);
    item.selectionColor = params.selectionColor;
    item.objectFillColor = params.objectFillColor;
    item.objectBorderColor = params.objectBorderColor;
    item.objectShape = params.objectShape;
  }
}

function normalizeParams(params: ClusterSearchParams): ClusterSearchParams {
  const minSize = Math.max(10, Math.min(200, params.objectMinSize));
  const maxSize = Math.max(minSize, Math.min(200, params.objectMaxSize));
  return {
    ...params,
    minimum: finiteOrDefault(params.minimum, 0),
    maximum: finiteOrDefault(params.maximum, 0),
    barsRange: Math.max(1, Math.floor(finiteOrDefault(params.barsRange, 1))),
    priceRange: Math.max(1, Math.floor(finiteOrDefault(params.priceRange, 1))),
    minValue: Math.max(0, finiteOrDefault(params.minValue, 0)),
    minDelta: finiteOrDefault(params.minDelta, 0),
    bidAskImbalance: finiteOrDefault(params.bidAskImbalance, 0),
    rangeFromHigh: Math.max(0, finiteOrDefault(params.rangeFromHigh, 0)),
    rangeFromLow: Math.max(0, finiteOrDefault(params.rangeFromLow, 0)),
    minAvgTrade: Math.max(0, finiteOrDefault(params.minAvgTrade, 0)),
    maxAvgTrade: Math.max(0, finiteOrDefault(params.maxAvgTrade, 0)),
    startTimeMinutes: clampMinutes(params.startTimeMinutes),
    endTimeMinutes: clampMinutes(params.endTimeMinutes),
    objectMinSize: minSize,
    objectMaxSize: maxSize,
  };
}

function normalizePriceScale(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 1;
}

function toPriceTick(price: number, priceScale: number): number {
  return Math.round(price / priceScale);
}

function roundPrice(price: number, priceScale: number): number {
  const decimals = Math.max(0, Math.min(8, Math.ceil(-Math.log10(priceScale)) + 2));
  return Number(price.toFixed(decimals));
}

function finiteOrDefault(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function clampMinutes(value: number): number {
  return Math.max(0, Math.min(1439, Math.floor(finiteOrDefault(value, 0))));
}

function formatType(type: ClusterSearchDataType): string {
  switch (type) {
    case 'maxVolume':
      return 'Max Volume';
    case 'deltaPlus':
      return 'Delta+';
    case 'deltaMinus':
      return 'Delta-';
    default:
      return type[0].toUpperCase() + type.slice(1);
  }
}

function formatNumber(value: number): string {
  if (Math.abs(value) >= 1000) {
    return Math.round(value).toLocaleString('ru-RU');
  }

  return Number(value.toFixed(2)).toString();
}
