import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environment';

export interface VolatilityGraphPoint {
  strike: number;
  volatility: number;
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
export class VolatilityGraphService {
  private readonly baseUrl = `${environment.apiUrl}/api/option-calc`;

  constructor(private readonly http: HttpClient) {}

  public getVolatilityGraph(params: {
    assetCode: string;
    optionSeriesCode: string;
    assetType?: string | null;
  }): Observable<VolatilityGraphPoint[]> {
    // Returns strike -> IV% points for the selected series.
    let httpParams = new HttpParams()
      .set('assetCode', params.assetCode)
      .set('optionSeriesCode', params.optionSeriesCode);

    if (params.assetType) {
      httpParams = httpParams.set('assetType', params.assetType);
    }

    return this.http.get<VolatilityGraphPoint[]>(`${this.baseUrl}/volatility-graph`, { params: httpParams });
  }

  public getOptionSeriesDetail(params: {
    assetCode: string;
    optionSeriesCode: string;
    assetType?: string | null;
  }): Observable<OptionSeriesDetail> {
    // Optional helper for central strike and expiration date.
    let httpParams = new HttpParams()
      .set('assetCode', params.assetCode)
      .set('optionSeriesCode', params.optionSeriesCode);

    if (params.assetType) {
      httpParams = httpParams.set('assetType', params.assetType);
    }

    return this.http.get<OptionSeriesDetail>(`${this.baseUrl}/optionseries/detail`, { params: httpParams });
  }
}
