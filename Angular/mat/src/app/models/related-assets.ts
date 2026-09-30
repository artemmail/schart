export interface RelatedAssetItem {
  securityId: string;
  canOpenChart?: boolean;
  shortname?: string | null;
  market?: number | null;
  maturityDate?: string | null;
  nextCouponDate?: string | null;
  currentPrice?: number | null;
  currentYield?: number | null;
  expirationDate?: string | null;
  lotSize?: number | null;
  optionType?: string | null;
  strike?: number | null;
  volatility?: number | null;
  openInterest?: number | null;
}

export interface RelatedAssetsResponse {
  selectedMarket: number;
  relations: {
    stock: RelatedAssetItem;
    futures: RelatedAssetItem[];
    options: RelatedAssetItem[];
    bonds: RelatedAssetItem[];
  };
}

type JsonObject = Record<string, unknown>;

function object(value: unknown): JsonObject {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Invalid related assets response');
  }
  return value as JsonObject;
}

// MVC preserves the DTO's PascalCase names; anonymous response fields use camelCase.
function field<T>(value: JsonObject, name: string): T {
  return (Object.prototype.hasOwnProperty.call(value, name)
    ? value[name]
    : value[name[0].toUpperCase() + name.slice(1)]) as T;
}

function normalizeItem(raw: unknown): RelatedAssetItem {
  const item = object(raw);
  const securityId = field<string>(item, 'securityId');
  if (typeof securityId !== 'string' || !securityId.trim()) {
    throw new Error('Related asset has no ticker');
  }
  return {
    securityId,
    canOpenChart: field(item, 'canOpenChart'),
    shortname: field(item, 'shortname'),
    market: field(item, 'market'),
    maturityDate: field(item, 'maturityDate'),
    nextCouponDate: field(item, 'nextCouponDate'),
    currentPrice: field(item, 'currentPrice'),
    currentYield: field(item, 'currentYield'),
    expirationDate: field(item, 'expirationDate'),
    lotSize: field(item, 'lotSize'),
    optionType: field(item, 'optionType'),
    strike: field(item, 'strike'),
    volatility: field(item, 'volatility'),
    openInterest: field(item, 'openInterest'),
  };
}

function normalizeItems(raw: unknown): RelatedAssetItem[] {
  if (raw == null) return [];
  if (!Array.isArray(raw)) throw new Error('Invalid related assets branch');
  return raw.map(normalizeItem);
}

export function normalizeRelatedAssetsResponse(raw: unknown): RelatedAssetsResponse {
  const response = object(raw);
  const relations = object(field(response, 'relations'));
  const selectedMarket = field<number>(response, 'selectedMarket');
  if (typeof selectedMarket !== 'number') throw new Error('Related asset has no market');
  return {
    selectedMarket,
    relations: {
      stock: normalizeItem(field(relations, 'stock')),
      futures: normalizeItems(field(relations, 'futures')),
      options: normalizeItems(field(relations, 'options')),
      bonds: normalizeItems(field(relations, 'bonds')),
    },
  };
}
