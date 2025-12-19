import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { removeUTC } from './FootPrint/Formating/formatting.service';

export interface PaymentModel {
  Id: number;
  UserName?: string;
  Email?: string;
  PayAmount?: number;
  PayDate?: Date;
  ExpireDate?: Date;
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
    const data = new FormData();
  
    // Convert PayDate and ExpireDate to Date objects if they are strings
    const payDate = payment.PayDate ? new Date(payment.PayDate) : new Date();
    const expireDate = payment.ExpireDate ? new Date(payment.ExpireDate) : null;
  
    data.append('models[0].UserName', payment.UserName || '');
    data.append('models[0].Email', payment.Email || '');
    data.append('models[0].PayAmount', (payment.PayAmount || 0).toString());
    data.append('models[0].PayDate', payDate ? removeUTC(payDate) : '');
    data.append('models[0].ExpireDate', expireDate ? removeUTC(expireDate) : '');
    data.append('models[0].Service', (payment.Service || 0).toString());
  
    const params = new HttpParams()
      .set('page', '1')
      .set('pageSize', '20')
      .set('sort', '')
      .set('group', '')
      .set('filter', '');
  
    return this.http.post<any>(`${this.apiUrl}/Create`, data, { params });
  }
  

  updatePayment(payment: PaymentModel): Observable<any> {
    const data = new FormData();
  
    // Convert PayDate and ExpireDate to Date objects if they are strings
    const payDate = payment.PayDate ? new Date(payment.PayDate) : new Date();
    const expireDate = payment.ExpireDate ? new Date(payment.ExpireDate) : null;
  
    data.append('models[0].Id', payment.Id.toString());
    data.append('models[0].UserName', payment.UserName || '');
    data.append('models[0].Email', payment.Email || '');
    data.append('models[0].PayAmount', (payment.PayAmount || 0).toString());
    data.append('models[0].PayDate', payDate ? removeUTC(payDate) : '');
    data.append('models[0].ExpireDate', expireDate ? removeUTC(expireDate) : '');
    data.append('models[0].Service', (payment.Service || 0).toString());
  
    // Include DataSourceRequest parameters in the query string
    const params = new HttpParams()
      .set('page', '1')
      .set('pageSize', '20')
      .set('sort', '')
      .set('group', '')
      .set('filter', '');
  
    return this.http.post<any>(`${this.apiUrl}/Update`, data, { params });
  }
  

  deletePayment(paymentId: number): Observable<void> {
    const data = new FormData();
    data.append('models[0].Id', paymentId.toString());

    return this.http.post<void>(`${this.apiUrl}/Destroy`, data);
  }
}
