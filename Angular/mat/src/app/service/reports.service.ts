import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../environment';
import {
  Barometer,
  MicexVolYearResult,
  ReportLeader,
  TopOrdersResult,
  candleseekerResult,
} from '../models/Barometer';
import { removeUTC } from './FootPrint/Formating/formatting.service';

/* ---------- NEW MODEL --------------------------------------------------- */
export interface VolumeDashboardRow {
  securityId: number;
  ticker: string;
  volume1Day: number;
  avg3Days: number;
  avg7Days: number;
  avg30Days: number;
  avg90Days: number;
  avg180Days: number;
  avg365Days: number;
}
/* ------------------------------------------------------------------------ */

export interface MarketMapParams {
  startDate?: Date;
  endDate?: Date;
  categories?: string;
  rperiod?: string;
  top?: number;
  market?: number;
}

export interface MarketMapSquare {
  color: string;
  ticker: string;
  name: string;
  name1: string;
  value: number;
  bid: number;
  cls: number;
  percent: number;
}

export interface MarketMapItem {
  name: string;
  value: number;
  items: MarketMapSquare[];
}

@Injectable({
  providedIn: 'root',
})
export class ReportsService {
  private baseUrl = `${environment.apiUrl}/api/reports`;

  constructor(private http: HttpClient) {}

  /* ------------ EXISTING METHODS (unchanged) ---------------------------- */
  getSeasonality(ticker: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/Seasonality`, {
      withCredentials: true,
      params: new HttpParams().set('ticker', ticker),
    });
  }

  getTopOrdersPeriod(
    ticker: string,
    startDate: Date,
    endDate: Date,
    topN: number = 200
  ): Observable<TopOrdersResult[]> {
    const params = new HttpParams()
      .set('ticker', ticker)
      .set('startDate', removeUTC(startDate))
      .set('endDate', removeUTC(endDate))
      .set('topN', topN.toString());

    return this.http.get<TopOrdersResult[]>(`${this.baseUrl}/TopOrdersPeriod`, {
      withCredentials: true,
      params,
    });
  }

  getTopOrders(
    ticker: string,
    bigPeriod: number
  ): Observable<TopOrdersResult[]> {
    return this.http.get<TopOrdersResult[]>(`${this.baseUrl}/TopOrders`, {
      withCredentials: true,
      params: new HttpParams()
        .set('ticker', ticker)
        .set('bigPeriod', bigPeriod.toString()),
    });
  }

  getVolumeSplash(
    bigPeriod: number,
    smallPeriod: number,
    splash = 3,
    market = 0
  ): Observable<candleseekerResult[]> {
    return this.http.get<candleseekerResult[]>(`${this.baseUrl}/VolumeSplash`, {
      withCredentials: true,
      params: new HttpParams()
        .set('bigPeriod', bigPeriod.toString())
        .set('smallPeriod', smallPeriod.toString())
        .set('splash', splash.toString())
        .set('market', market.toString()),
    });
  }

  getLeaders(
    startDate?: Date,
    endDate?: Date,
    rperiod = 'day',
    top = 20,
    market = 0,
    dir = 0
  ): Observable<ReportLeader[]> {
    let params = new HttpParams()
      .set('rperiod', rperiod)
      .set('top', top.toString())
      .set('market', market.toString())
      .set('dir', dir.toString());

    if (startDate) params = params.set('startDate', removeUTC(startDate));
    if (endDate) params = params.set('endDate', removeUTC(endDate));

    return this.http.get<ReportLeader[]>(`${this.baseUrl}/Leaders`, {
      withCredentials: true,
      params,
    });
  }

  getMarketCandlesVolume(
    year: number,
    year2: number,
    market: number,
    group: number
  ): Observable<MicexVolYearResult[]> {
    return this.http.get<MicexVolYearResult[]>(
      `${this.baseUrl}/MarketCandlesVolume`,
      {
        withCredentials: true,
        params: new HttpParams()
          .set('year', year.toString())
          .set('year2', year2.toString())
          .set('market', market.toString())
          .set('group', group.toString()),
      }
    );
  }

  getBarometer(market = 0): Observable<Barometer[]> {
    return this.http.get<Barometer[]>(`${this.baseUrl}/Barometer`, {
      withCredentials: true,
      params: new HttpParams().set('market', market.toString()),
    });
  }

  /* ------------ NEW METHOD ---------------------------------------------- */
  /**
   * Возвращает дашборд объёмов торгов по всем бумагам для указанного market.
   * Серверный энд-поинт: GET /api/reports/DashBoard?market={market}
   */
  getVolumeDashboard(market: number = 0): Observable<VolumeDashboardRow[]> {
    return this.http.get<VolumeDashboardRow[]>(`${this.baseUrl}/DashBoard`, {
      withCredentials: true,
      params: new HttpParams().set('market', market.toString()),
    });
  }
  /* ---------------------------------------------------------------------- */

  getMarketMap(
    startDate?: Date,
    endDate?: Date,
    categories?: string,
    rperiod: string = 'day',
    top: number = 50,
    market: number = 0
  ): Observable<{ value: number; items: MarketMapItem[] }[]> {
    let params = new HttpParams();
    if (startDate) params = params.set('startDate', removeUTC(startDate));
    if (endDate) params = params.set('endDate', removeUTC(endDate));
    if (categories) params = params.set('categories', categories);
    params = params.set('rperiod', rperiod);
    params = params.set('top', top.toString());
    params = params.set('market', market.toString());

    return this.http
      .get<MarketMapItem[]>(`${this.baseUrl}/MarketMap2`, { params })
      .pipe(map((result) => [{ value: 0, items: result }]));
  }

  callGetMarketMap(
    params: MarketMapParams
  ): Observable<{ value: number; items: MarketMapItem[] }[]> {
    const defaultParams: MarketMapParams = {
      rperiod: 'day',
      top: 50,
      market: 0,
    };

    const finalParams: MarketMapParams = { ...defaultParams, ...params };

    return this.getMarketMap(
      finalParams.startDate,
      finalParams.endDate,
      finalParams.categories,
      finalParams.rperiod,
      finalParams.top,
      finalParams.market
    );
  }
}
