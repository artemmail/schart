import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../environment';


export interface Subscription {
  interval: string;
  count: number;
  ordinalMoney: number;
  discountMoney: number;
  code: number;
  money: number;
  period: string;
  BillId: string;
  message: string;
  price: string;
  monthprice: string;
}

export interface BillDto {
  date: string;
  userName: string;
  amount: number;
  count: number;
  services: number;
}

@Injectable({
  providedIn: 'root'
})
export class BillingService {

    private apiUrl = `${environment.apiUrl}/api/Billing`;  // Убедитесь, что apiUrl корректный
  
    constructor(private http: HttpClient) {}

    /*
    yandex(income: YandexIncome): Observable<any> {
      return this.http.post<any>(`${this.apiUrl}/Yandex`, income, this.getHttpOptions());
      private getHttpOptions() {
      const httpOptions = {
        headers: new HttpHeaders({
          'Content-Type': 'application/json'
        })
      };
      return httpOptions;
    }
    }*/

    getBill(id: string): Observable<BillDto> {
      return this.http.get<BillDto>(`${this.apiUrl}/Bill/${id}`);
    }
    
  
    getTarifs(service: number = 1, guid?: string): Observable<Subscription[]> {
      let params: any = { service: service.toString() };
      if (guid) {
        params.guid = guid;
      }
      return this.http.get<Subscription[]>(`${this.apiUrl}/Tarifs`, { params: params });
    }    
  }