import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../environment';

export type BondSortDir = 'asc' | 'desc';
export type BondMapMode =
  | 'yield_by_duration'
  | 'coupon_yield_by_duration'
  | 'ytm'
  | 'coupon_yield_to_maturity';

export interface BondMoexTypeOption {
  key: string;
  label: string;
}

export interface BondFacetItem {
  key: string;
  label: string;
  count: number;
}

export interface BondFacets {
  moexTypes: BondFacetItem[];
  couponFrequencies: BondFacetItem[];
}

export interface BondListItem {
  dictionaryId: number;
  secId: string;
  shortName?: string | null;
  isin?: string | null;
  regNumber?: string | null;
  bondClass?: string | null;
  moexType?: string | null;
  moexTypeTitle?: string | null;
  moexGroup?: string | null;
  currency?: string | null;
  isForeignCurrency?: boolean | null;
  qualifiedOnly?: boolean | null;
  maturityDate?: string | null;
  offerDate?: string | null;
  nextCouponDate?: string | null;
  yearsToMaturity?: number | null;
  durationYears?: number | null;
  yieldPct?: number | null;
  couponAnnualYieldPct?: number | null;
  pricePctOfPar?: number | null;
  priceRub?: number | null;
  accruedInterest?: number | null;
  couponValue?: number | null;
  couponPeriodDays?: number | null;
  couponFrequencyPerYear?: number | null;
  dayVolume?: number | null;
  dayVolumeQty?: number | null;
  boardId?: string | null;
}

export interface BondMapPoint {
  dictionaryId: number;
  secId: string;
  shortName?: string | null;
  x?: number | null;
  y?: number | null;
  pricePctOfPar?: number | null;
  maturityDate?: string | null;
}

export interface BondListResponse {
  total: number;
  page: number;
  pageSize: number;
  items: BondListItem[];
  mapPoints: BondMapPoint[];
  facets: BondFacets;
}

export interface BondDetailsInstrument {
  dictionaryId: number;
  secId: string;
  shortName?: string | null;
  isin?: string | null;
  regNumber?: string | null;
  bondClass?: string | null;
  moexType?: string | null;
  moexTypeTitle?: string | null;
  moexGroup?: string | null;
  currency?: string | null;
  isForeignCurrency?: boolean | null;
  qualifiedOnly?: boolean | null;
  placementDate?: string | null;
  maturityDate?: string | null;
  offerDate?: string | null;
  nextCouponDate?: string | null;
  faceValue?: number | null;
  couponValue?: number | null;
  couponPeriodDays?: number | null;
  couponRate?: number | null;
  couponType?: string | null;
  accruedInterest?: number | null;
  primaryBoardId?: string | null;
  issueSize?: number | null;
  issueSizePlaced?: number | null;
  listingLevel?: number | null;
}

export interface BondDetailsSnapshot {
  importedAt: string;
  boardId?: string | null;
  tradingStatus?: string | null;
  priceUnit?: string | null;
  currencyId?: string | null;
  pricePctOfPar?: number | null;
  priceRub?: number | null;
  yieldPct?: number | null;
  dayChangePct?: number | null;
  dayVolume?: number | null;
  dayVolumeQty?: number | null;
  accruedInterest?: number | null;
  couponValue?: number | null;
  nextCouponDate?: string | null;
  offerDate?: string | null;
}

export interface BondDetailsCoupon {
  number?: number | null;
  couponDate?: string | null;
  couponValue?: number | null;
  couponYieldPct?: number | null;
  percentOfPar?: number | null;
  percentOfMarket?: number | null;
}

export interface BondDetailsResponse {
  instrument: BondDetailsInstrument;
  lastSnapshot?: BondDetailsSnapshot | null;
  coupons: BondDetailsCoupon[];
}

export interface BondListQuery {
  yieldMin?: number | null;
  yieldMax?: number | null;
  durationMin?: number | null;
  durationMax?: number | null;
  yearsToMaturityMin?: number | null;
  yearsToMaturityMax?: number | null;
  qualifiedOnly?: boolean | null;
  moexType?: string[];
  couponFreq?: number[];
  orderBy?: string;
  dir?: BondSortDir;
  page?: number;
  pageSize?: number;
  mapMode?: BondMapMode;
}

@Injectable({
  providedIn: 'root',
})
export class BondsService {
  private readonly baseUrl = `${environment.apiUrl}/api/bonds`;

  constructor(private readonly http: HttpClient) {}

  public getMoexTypes(): Observable<BondMoexTypeOption[]> {
    return this.http.get<any[]>(`${this.baseUrl}/moex-types`).pipe(
      map((raw) => this.arr(raw).map((x) => this.normalizeMoexTypeOption(x)))
    );
  }

  public getList(query: BondListQuery): Observable<BondListResponse> {
    let params = new HttpParams();
    params = this.setNum(params, 'yieldMin', query.yieldMin);
    params = this.setNum(params, 'yieldMax', query.yieldMax);
    params = this.setNum(params, 'durationMin', query.durationMin);
    params = this.setNum(params, 'durationMax', query.durationMax);
    params = this.setNum(params, 'yearsToMaturityMin', query.yearsToMaturityMin);
    params = this.setNum(params, 'yearsToMaturityMax', query.yearsToMaturityMax);
    params = this.setBool(params, 'qualifiedOnly', query.qualifiedOnly);

    if (query.moexType?.length) {
      for (const type of query.moexType) {
        params = params.append('moexType', type);
      }
    }

    if (query.couponFreq?.length) {
      for (const freq of query.couponFreq) {
        params = params.append('couponFreq', String(freq));
      }
    }

    if (query.orderBy) {
      params = params.set('orderBy', query.orderBy);
    }
    if (query.dir) {
      params = params.set('dir', query.dir);
    }
    if (query.page) {
      params = params.set('page', String(query.page));
    }
    if (query.pageSize) {
      params = params.set('pageSize', String(query.pageSize));
    }
    if (query.mapMode) {
      params = params.set('mapMode', query.mapMode);
    }

    return this.http.get<any>(`${this.baseUrl}/list`, { params }).pipe(
      map((raw) => this.normalizeListResponse(raw))
    );
  }

  public getDetails(secIdOrIsin: string): Observable<BondDetailsResponse> {
    return this.http.get<any>(`${this.baseUrl}/${encodeURIComponent(secIdOrIsin)}`).pipe(
      map((raw) => this.normalizeDetails(raw))
    );
  }

  private setNum(params: HttpParams, key: string, value?: number | null): HttpParams {
    if (value === undefined || value === null || Number.isNaN(value)) {
      return params;
    }
    return params.set(key, String(value));
  }

  private setBool(params: HttpParams, key: string, value?: boolean | null): HttpParams {
    if (value === undefined || value === null) {
      return params;
    }
    return params.set(key, value ? 'true' : 'false');
  }

  private normalizeListResponse(raw: any): BondListResponse {
    return {
      total: this.num(raw?.total ?? raw?.Total),
      page: this.num(raw?.page ?? raw?.Page, 1),
      pageSize: this.num(raw?.pageSize ?? raw?.PageSize, 50),
      items: this.arr(raw?.items ?? raw?.Items).map((x) => this.normalizeListItem(x)),
      mapPoints: this.arr(raw?.mapPoints ?? raw?.MapPoints).map((x) => this.normalizeMapPoint(x)),
      facets: this.normalizeFacets(raw?.facets ?? raw?.Facets),
    };
  }

  private normalizeFacets(raw: any): BondFacets {
    return {
      moexTypes: this.arr(raw?.moexTypes ?? raw?.MoexTypes).map((x) => this.normalizeFacet(x)),
      couponFrequencies: this.arr(raw?.couponFrequencies ?? raw?.CouponFrequencies).map((x) => this.normalizeFacet(x)),
    };
  }

  private normalizeFacet(raw: any): BondFacetItem {
    return {
      key: String(raw?.key ?? raw?.Key ?? ''),
      label: String(raw?.label ?? raw?.Label ?? ''),
      count: this.num(raw?.count ?? raw?.Count),
    };
  }

  private normalizeMoexTypeOption(raw: any): BondMoexTypeOption {
    return {
      key: String(raw?.key ?? raw?.Key ?? ''),
      label: String(raw?.label ?? raw?.Label ?? ''),
    };
  }

  private normalizeListItem(raw: any): BondListItem {
    return {
      dictionaryId: this.num(raw?.dictionaryId ?? raw?.DictionaryId),
      secId: String(raw?.secId ?? raw?.SecId ?? ''),
      shortName: raw?.shortName ?? raw?.ShortName ?? null,
      isin: raw?.isin ?? raw?.Isin ?? null,
      regNumber: raw?.regNumber ?? raw?.RegNumber ?? null,
      bondClass: raw?.bondClass ?? raw?.BondClass ?? null,
      moexType: raw?.moexType ?? raw?.MoexType ?? null,
      moexTypeTitle: raw?.moexTypeTitle ?? raw?.MoexTypeTitle ?? null,
      moexGroup: raw?.moexGroup ?? raw?.MoexGroup ?? null,
      currency: raw?.currency ?? raw?.Currency ?? null,
      isForeignCurrency: this.bool(raw?.isForeignCurrency ?? raw?.IsForeignCurrency),
      qualifiedOnly: this.bool(raw?.qualifiedOnly ?? raw?.QualifiedOnly),
      maturityDate: raw?.maturityDate ?? raw?.MaturityDate ?? null,
      offerDate: raw?.offerDate ?? raw?.OfferDate ?? null,
      nextCouponDate: raw?.nextCouponDate ?? raw?.NextCouponDate ?? null,
      yearsToMaturity: this.optNum(raw?.yearsToMaturity ?? raw?.YearsToMaturity),
      durationYears: this.optNum(raw?.durationYears ?? raw?.DurationYears),
      yieldPct: this.optNum(raw?.yieldPct ?? raw?.YieldPct),
      couponAnnualYieldPct: this.optNum(raw?.couponAnnualYieldPct ?? raw?.CouponAnnualYieldPct),
      pricePctOfPar: this.optNum(raw?.pricePctOfPar ?? raw?.PricePctOfPar),
      priceRub: this.optNum(raw?.priceRub ?? raw?.PriceRub),
      accruedInterest: this.optNum(raw?.accruedInterest ?? raw?.AccruedInterest),
      couponValue: this.optNum(raw?.couponValue ?? raw?.CouponValue),
      couponPeriodDays: this.optNum(raw?.couponPeriodDays ?? raw?.CouponPeriodDays),
      couponFrequencyPerYear: this.optNum(raw?.couponFrequencyPerYear ?? raw?.CouponFrequencyPerYear),
      dayVolume: this.optNum(raw?.dayVolume ?? raw?.DayVolume),
      dayVolumeQty: this.optNum(raw?.dayVolumeQty ?? raw?.DayVolumeQty),
      boardId: raw?.boardId ?? raw?.BoardId ?? null,
    };
  }

  private normalizeMapPoint(raw: any): BondMapPoint {
    return {
      dictionaryId: this.num(raw?.dictionaryId ?? raw?.DictionaryId),
      secId: String(raw?.secId ?? raw?.SecId ?? ''),
      shortName: raw?.shortName ?? raw?.ShortName ?? null,
      x: this.optNum(raw?.x ?? raw?.X),
      y: this.optNum(raw?.y ?? raw?.Y),
      pricePctOfPar: this.optNum(raw?.pricePctOfPar ?? raw?.PricePctOfPar),
      maturityDate: raw?.maturityDate ?? raw?.MaturityDate ?? null,
    };
  }

  private normalizeDetails(raw: any): BondDetailsResponse {
    return {
      instrument: this.normalizeInstrument(raw?.instrument ?? raw?.Instrument),
      lastSnapshot: this.normalizeSnapshot(raw?.lastSnapshot ?? raw?.LastSnapshot),
      coupons: this.arr(raw?.coupons ?? raw?.Coupons).map((x) => this.normalizeCoupon(x)),
    };
  }

  private normalizeInstrument(raw: any): BondDetailsInstrument {
    return {
      dictionaryId: this.num(raw?.dictionaryId ?? raw?.DictionaryId),
      secId: String(raw?.secId ?? raw?.SecId ?? ''),
      shortName: raw?.shortName ?? raw?.ShortName ?? null,
      isin: raw?.isin ?? raw?.Isin ?? null,
      regNumber: raw?.regNumber ?? raw?.RegNumber ?? null,
      bondClass: raw?.bondClass ?? raw?.BondClass ?? null,
      moexType: raw?.moexType ?? raw?.MoexType ?? null,
      moexTypeTitle: raw?.moexTypeTitle ?? raw?.MoexTypeTitle ?? null,
      moexGroup: raw?.moexGroup ?? raw?.MoexGroup ?? null,
      currency: raw?.currency ?? raw?.Currency ?? null,
      isForeignCurrency: this.bool(raw?.isForeignCurrency ?? raw?.IsForeignCurrency),
      qualifiedOnly: this.bool(raw?.qualifiedOnly ?? raw?.QualifiedOnly),
      placementDate: raw?.placementDate ?? raw?.PlacementDate ?? null,
      maturityDate: raw?.maturityDate ?? raw?.MaturityDate ?? null,
      offerDate: raw?.offerDate ?? raw?.OfferDate ?? null,
      nextCouponDate: raw?.nextCouponDate ?? raw?.NextCouponDate ?? null,
      faceValue: this.optNum(raw?.faceValue ?? raw?.FaceValue),
      couponValue: this.optNum(raw?.couponValue ?? raw?.CouponValue),
      couponPeriodDays: this.optNum(raw?.couponPeriodDays ?? raw?.CouponPeriodDays),
      couponRate: this.optNum(raw?.couponRate ?? raw?.CouponRate),
      couponType: raw?.couponType ?? raw?.CouponType ?? null,
      accruedInterest: this.optNum(raw?.accruedInterest ?? raw?.AccruedInterest),
      primaryBoardId: raw?.primaryBoardId ?? raw?.PrimaryBoardId ?? null,
      issueSize: this.optNum(raw?.issueSize ?? raw?.IssueSize),
      issueSizePlaced: this.optNum(raw?.issueSizePlaced ?? raw?.IssueSizePlaced),
      listingLevel: this.optNum(raw?.listingLevel ?? raw?.ListingLevel),
    };
  }

  private normalizeSnapshot(raw: any): BondDetailsSnapshot | null {
    if (!raw) {
      return null;
    }
    return {
      importedAt: String(raw?.importedAt ?? raw?.ImportedAt ?? ''),
      boardId: raw?.boardId ?? raw?.BoardId ?? null,
      tradingStatus: raw?.tradingStatus ?? raw?.TradingStatus ?? null,
      priceUnit: raw?.priceUnit ?? raw?.PriceUnit ?? null,
      currencyId: raw?.currencyId ?? raw?.CurrencyId ?? null,
      pricePctOfPar: this.optNum(raw?.pricePctOfPar ?? raw?.PricePctOfPar),
      priceRub: this.optNum(raw?.priceRub ?? raw?.PriceRub),
      yieldPct: this.optNum(raw?.yieldPct ?? raw?.YieldPct),
      dayChangePct: this.optNum(raw?.dayChangePct ?? raw?.DayChangePct),
      dayVolume: this.optNum(raw?.dayVolume ?? raw?.DayVolume),
      dayVolumeQty: this.optNum(raw?.dayVolumeQty ?? raw?.DayVolumeQty),
      accruedInterest: this.optNum(raw?.accruedInterest ?? raw?.AccruedInterest),
      couponValue: this.optNum(raw?.couponValue ?? raw?.CouponValue),
      nextCouponDate: raw?.nextCouponDate ?? raw?.NextCouponDate ?? null,
      offerDate: raw?.offerDate ?? raw?.OfferDate ?? null,
    };
  }

  private normalizeCoupon(raw: any): BondDetailsCoupon {
    return {
      number: this.optNum(raw?.number ?? raw?.Number),
      couponDate: raw?.couponDate ?? raw?.CouponDate ?? null,
      couponValue: this.optNum(raw?.couponValue ?? raw?.CouponValue),
      couponYieldPct: this.optNum(raw?.couponYieldPct ?? raw?.CouponYieldPct),
      percentOfPar: this.optNum(raw?.percentOfPar ?? raw?.PercentOfPar),
      percentOfMarket: this.optNum(raw?.percentOfMarket ?? raw?.PercentOfMarket),
    };
  }

  private num(value: any, fallback = 0): number {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  private optNum(value: any): number | null {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  private bool(value: any): boolean | null {
    if (value === true || value === false) {
      return value;
    }
    if (value === 'true') {
      return true;
    }
    if (value === 'false') {
      return false;
    }
    return null;
  }

  private arr<T = any>(value: any): T[] {
    return Array.isArray(value) ? value : [];
  }
}
