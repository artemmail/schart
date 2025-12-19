import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { FootPrintParameters } from 'src/app/models/Params';
import { Tick } from 'src/app/models/Column';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, map } from 'rxjs/operators';
import { ClusterData } from 'src/app/components/footprint/clusterData';
import { removeUTC } from '../Formating/formatting.service';
import { environment } from 'src/app/environment';


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
    const params = { ...model };

    if (params.startDate != null) {
      params.startDate = removeUTC(params.startDate);
    }
    if (params.endDate != null) {
      params.endDate = removeUTC(params.endDate);
    }

    const handle403Error = (error: any) => {
      if (error.status === 403) {
        // Здесь можно добавить обработку ошибки 403, если это необходимо
        console.error('Ошибка 403: доступ запрещен');
      }
      return throwError(error);
    };

    if (model.period == 0) {
      
      return this.http
        .get<Tick[]>(`${environment.apiUrl}/api/clusters/getTicks`, {
          params,
          withCredentials: true,
        })
        .pipe(
          
          map((data: any) => {

            
            let a = data.map((value: Tick) => ({
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

            return new ClusterData( {priceScale:params.priceStep??1,  clusterData:a});
          }),
          catchError(handle403Error)
        );
    }

    return this.http
      .get<any>(`${environment.apiUrl}/api/clusters/getRange`, {
        params,
        withCredentials: true,
      })
      .pipe(
        map((data) => {
          data.clusterData.forEach((value: { x: string | Date }) => {
            value.x = new Date(value.x as string);
          });
          return data;
        }),
        catchError(handle403Error)
      );
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
