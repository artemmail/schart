import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { removeUTC } from './FootPrint/Formating/formatting.service';

export interface PaymentModel {
  Id: number;
  UserName?: string;
  Email?: string;
  PayAmount?: number;
  PayDate?: Date | string;
  ExpireDate?: Date | string;
  Service?: number;
}

@Injectable({
  providedIn: 'root'
})
export class PaymentsService {
  private apiUrl = '/api/payments';

  constructor(private http: HttpClient) { }

  getPayments(
    page: number,
    pageSize: number,
    sortField?: string,
    sortOrder?: string,
    filter?: string
  ): Observable<any> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());
  
    if (sortField) {
      params = params.set('sortField', sortField);
    }
    if (sortOrder) {
      params = params.set('sortOrder', sortOrder);
    }
    if (filter) {
      params = params.set('filter', filter);
    }
  
    return this.http.get<any>(`${this.apiUrl}/GetPayments`, { params });
  }

  createPayment(payment: PaymentModel): Observable<any> {
    const payDate = payment.PayDate ? new Date(payment.PayDate) : new Date();
    const expireDate = payment.ExpireDate ? new Date(payment.ExpireDate) : null;

    const payload: PaymentModel = {
      UserName: payment.UserName || '',
      Email: payment.Email || '',
      PayAmount: payment.PayAmount || 0,
      PayDate: removeUTC(payDate),
      ExpireDate: expireDate ? removeUTC(expireDate) : null,
      Service: payment.Service || 0,
      Id: 0
    };

    return this.http.post<any>(`${this.apiUrl}/CreatePayments`, [payload]);
  }
  

  updatePayment(payment: PaymentModel): Observable<any> {
    const payDate = payment.PayDate ? new Date(payment.PayDate) : new Date();
    const expireDate = payment.ExpireDate ? new Date(payment.ExpireDate) : null;

    const payload: PaymentModel = {
      Id: payment.Id,
      UserName: payment.UserName || '',
      Email: payment.Email || '',
      PayAmount: payment.PayAmount || 0,
      PayDate: removeUTC(payDate),
      ExpireDate: expireDate ? removeUTC(expireDate) : null,
      Service: payment.Service || 0
    };

    return this.http.put<any>(`${this.apiUrl}/UpdatePayments`, [payload]);
  }
  

  deletePayment(paymentId: number): Observable<void> {
    return this.http.request<void>('delete', `${this.apiUrl}/DeletePayments`, {
      body: [{ Id: paymentId }]
    });
  }
}
