import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { FootPrintParameters } from 'src/app/models/Params';
import { Tick } from 'src/app/models/Column';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, map } from 'rxjs/operators';
import {
  ClusterData,
  ClusterDataInit,
} from 'src/app/components/footprint/models/cluster-data';
import { removeUTC } from '../Formating/formatting.service';
import { environment } from 'src/app/environment';
import {
  CandlesRangeSetParams,
  CandlesRangeSetValue,
} from 'src/app/models/candles-range-set';

type QueryParams = Record<
  string,
  string | number | boolean | ReadonlyArray<string | number | boolean>
>;

export interface VolumeSearchResult {
  Time: Date;
  Price: number;
  MaxVolume: number;
  TotalVolume: number;
  BarSize: number;
  Trades: number;
  Ask: number;
  Bid: number;
  Delta: number;
}

@Injectable({
  providedIn: 'root',
})
export class ClusterStreamService {
  constructor(private http: HttpClient) {}

  public GetRange(model: FootPrintParameters): Observable<ClusterData> {
    const params = this.buildParams(model);

    return model.period == 0
      ? this.getTicks(model, params)
      : this.getRange(params);
  }

  public GetTicks(model: FootPrintParameters): Observable<ClusterData> {
    const params = this.buildParams(model);
    return this.getTicks(model, params);
  }

  public getRangeSetArray(
    params: CandlesRangeSetParams
  ): Observable<CandlesRangeSetValue[]> {
    const defaultedParams: CandlesRangeSetParams = {
      count: 2000,
      period: 15,
      timeEnable: false,
      ...params,
    };

    let httpParams = new HttpParams();
    httpParams = this.appendDate(httpParams, 'startDate', defaultedParams.startDate);
    httpParams = this.appendDate(httpParams, 'endDate', defaultedParams.endDate);
    httpParams = this.appendParam(httpParams, 'ticker', defaultedParams.ticker);
    httpParams = this.appendParam(httpParams, 'ticker1', defaultedParams.ticker1);
    httpParams = this.appendParam(httpParams, 'ticker2', defaultedParams.ticker2);
    httpParams = this.appendParam(httpParams, 'rperiod', defaultedParams.rperiod);
    httpParams = this.appendParam(httpParams, 'startTime', defaultedParams.startTime);
    httpParams = this.appendParam(httpParams, 'endTime', defaultedParams.endTime);
    httpParams = this.appendParam(httpParams, 'from_stamp', defaultedParams.from_stamp);
    httpParams = this.appendParam(httpParams, 'packed', defaultedParams.packed);
    httpParams = this.appendParam(httpParams, 'count', defaultedParams.count);
    httpParams = this.appendParam(httpParams, 'period', defaultedParams.period);
    httpParams = this.appendParam(httpParams, 'timeEnable', defaultedParams.timeEnable);

    return this.http
      .get<CandlesRangeSetValue[]>(`${environment.apiUrl}/api/candles/getRangeSetArray`, {
        params: httpParams,
        withCredentials: true,
      })
      .pipe(catchError(this.handle403Error));
  }

  private getRange(params: QueryParams): Observable<ClusterData> {
    return this.http
      .get<ClusterDataInit>(`${environment.apiUrl}/api/clusters/getRange`, {
        params,
        withCredentials: true,
      })
      .pipe(
        map((data) => {
          data.clusterData.forEach((value: { x: string | Date }) => {
            value.x = new Date(value.x as string);
          });
          return new ClusterData(data);
        }),
        catchError(this.handle403Error)
      );
  }

  private getTicks(
    model: FootPrintParameters,
    params: QueryParams
  ): Observable<ClusterData> {
    return this.http
      .get<Tick[]>(`${environment.apiUrl}/api/clusters/getTicks`, {
        params,
        withCredentials: true,
      })
      .pipe(
        map((data: Tick[]) => {
          const clusterData = data.map((value: Tick) => ({
            Number: value.Number,
            x: new Date(value.TradeDate),
            o: value.Price,
            c: value.Price,
            l: value.Price,
            h: value.Price,
            q: value.Quantity,
            bq: value.Quantity * value.Direction,
            v: value.Volume,
            bv: value.Volume * value.Direction,
            oi: value.OI,
          }));

          return new ClusterData({
            priceScale: model.priceStep ?? 1,
            clusterData,
          });
        }),
        catchError(this.handle403Error)
      );
  }

  private buildParams(model: FootPrintParameters): QueryParams {
    const params: QueryParams = { ...(model as unknown as QueryParams) };

    if (model.startDate != null) {
      params.startDate = removeUTC(model.startDate);
    }
    if (model.endDate != null) {
      params.endDate = removeUTC(model.endDate);
    }

    return params;
  }

  private appendParam(
    params: HttpParams,
    key: string,
    value: string | number | boolean | undefined | null
  ): HttpParams {
    if (value === undefined || value === null) {
      return params;
    }

    return params.set(key, value.toString());
  }

  private appendDate(params: HttpParams, key: string, value?: Date | null): HttpParams {
    if (value === undefined || value === null) {
      return params;
    }

    return params.set(key, removeUTC(value));
  }

  private handle403Error(error: any) {
    if (error.status === 403) {
      // Здесь можно добавить обработку ошибки 403, если это необходимо
      console.error('Ошибка 403: доступ запрещен');
    }
    return throwError(error);
  }

  public volumeSearch(
    ticker: string,
    period: number,
    priceStep: number,
    startDate: Date,
    endDate: Date
  ): Observable<VolumeSearchResult[]> {
    let params = new HttpParams()
      .set('ticker', ticker)
      .set('period', period.toString())
      .set('priceStep', priceStep.toString())
      .set('startDate', removeUTC(startDate))
      .set('endDate', removeUTC(endDate));

    return this.http
      .get<VolumeSearchResult[]>(`${environment.apiUrl}/api/clusters/volumeSearch2`, { params })
      .pipe(
        map((data) =>
          data.map((item) => ({
            ...item,
            Time: new Date(item.Time),
          }))
        ),
        catchError((error) => {
          if (error.status === 403) {
            console.error('Ошибка 403: доступ запрещен');
          }
          return throwError(error);
        })
      );
  }
}
