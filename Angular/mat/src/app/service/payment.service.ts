import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
//import { PaymentResponse1 } from '../models/payment.model';
import { environment } from '../environment';

export interface PaymentShow {
  Id: number;
  UserId: string;
  PayAmount: number;
  PayDate: Date;
  ExpireDate: Date;
  Service: number;
  UserName?: string;
  Email?: string;
}


export interface ApplicationUser {
  Id: string;
  UserName: string;
  Email: string;
}

export interface PaymentResponse1 {
  UserInfo: PaymentShow;
  Referal: ApplicationUser;
}


@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private apiUrl = `${environment.apiUrl}/api/payment`;  // Убедитесь, что apiUrl корректный
  
  constructor(private http: HttpClient) { }

  getPaymentInfo(referal?: string): Observable<PaymentResponse1> {
    let url = this.apiUrl;
    if (referal) {
      url += `/${referal}`;
    }
    return this.http.get<PaymentResponse1>(url, { withCredentials: true });
  }
}

