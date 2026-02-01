import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environment';

export interface OptionBoardRow {
  secid: string;
  strike?: number | null;
  bid?: number | null;
  offer?: number | null;
  last?: number | null;
  numtrades?: number | null;
  volatility?: number | null;
  delta?: number | null;
  gamma?: number | null;
  vega?: number | null;
  theta?: number | null;
  rho?: number | null;
  theorprice?: number | null;
  theorprice_rub?: number | null;
  intrinsic_value?: number | null;
  timed_value?: number | null;
}

export interface OptionBoardResponse {
  call: OptionBoardRow[];
  put: OptionBoardRow[];
}

export interface OptionSeriesDetail {
  centralStrike?: number | null;
  expirationDate?: string | null;
  optionSeriesCode?: string | null;
  assetCode?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class OptionBoardService {
  private readonly baseUrl = `${environment.apiUrl}/api/option-calc`;

  constructor(private readonly http: HttpClient) {}

  public getOptionBoard(params: {
    assetCode: string;
    optionSeriesCode: string;
    rows?: number | null;
    assetType?: string | null;
  }): Observable<OptionBoardResponse> {
    // Server expects assetCode + optionSeriesCode; rows and assetType are optional.
    let httpParams = new HttpParams()
      .set('assetCode', params.assetCode)
      .set('optionSeriesCode', params.optionSeriesCode);

    if (params.rows != null) {
      httpParams = httpParams.set('rows', params.rows.toString());
    }

    if (params.assetType) {
      httpParams = httpParams.set('assetType', params.assetType);
    }

    return this.http.get<OptionBoardResponse>(`${this.baseUrl}/optionboard`, { params: httpParams });
  }

  public getOptionSeriesDetail(params: {
    assetCode: string;
    optionSeriesCode: string;
    assetType?: string | null;
  }): Observable<OptionSeriesDetail> {
    // Optional helper for header/meta data (central strike, expiration date).
    let httpParams = new HttpParams()
      .set('assetCode', params.assetCode)
      .set('optionSeriesCode', params.optionSeriesCode);

    if (params.assetType) {
      httpParams = httpParams.set('assetType', params.assetType);
    }

    return this.http.get<OptionSeriesDetail>(`${this.baseUrl}/optionseries/detail`, { params: httpParams });
  }
}
