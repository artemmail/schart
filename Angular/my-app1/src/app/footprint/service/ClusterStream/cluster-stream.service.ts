import { Injectable } from '@angular/core';
import { clusterData } from '../../clusterData';
import { Observable } from 'rxjs';
import { Parameters } from 'src/app/models/Params';
import { Tick } from 'src/app/models/Column';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class ClusterStreamService {
  constructor(private http: HttpClient) {}

  public GetRange(model: Parameters): Observable<clusterData> {
    
    if(model.period==0)
    return this.http
      .get<Tick[]>(`https://stockchart.ru/api/clusters/getTicks`, {
        params: { ...model } as any,
      })
      .pipe(
        map((data: any) => {
          return data.map((value: Tick) => ({
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
        })
      );


      return this.http.get<any>(`https://stockchart.ru/api/clusters/getRange`, {
        params: { ...model } as any,
      })
      
      .pipe(
        map(data => {
          
          data.clusterData.forEach((value: { x: string | Date; }) => {
            value.x = new Date(value.x as string);
          });
          return data;
        })
      );

   

  }
}
