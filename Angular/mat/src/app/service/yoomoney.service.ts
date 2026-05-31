import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable, of } from 'rxjs';
import { OperationDetails, OperationHistory } from '../models/YooMoneyModels';
import { environment } from '../environment';

@Injectable({
    providedIn: 'root'
  })
  export class YooMoneyService {
    private apiUrl = `${environment.apiUrl}/api/YooMoney`;
  
    constructor(private http: HttpClient) {}

    beginAuthorization(returnUrl: string = '/YooMoney'): void {
      const normalizedReturnUrl = returnUrl?.trim() ? returnUrl : '/YooMoney';
      const url = `${this.apiUrl}/authorize?returnUrl=${encodeURIComponent(normalizedReturnUrl)}`;
      window.location.assign(url);
    }
  
    // Получение деталей операции с десериализацией даты
    getOperationDetails(operationId: string): Observable<OperationDetails> {
      const url = `${this.apiUrl}/operation-details/${operationId}`;
      return this.http.get<OperationDetails>(url).pipe(
        map(details => ({
          ...details,
          datetime: new Date(details.datetime), // Преобразование строки даты в объект Date
          digital_goods: details.digital_goods
            ? {
                ...details.digital_goods,
                article: details.digital_goods.article.map(article => ({
                  ...article,
                  serial: article.serial,
                  secret: article.secret,
                })),
                bonus: details.digital_goods.bonus.map(bonus => ({
                  ...bonus,
                  serial: bonus.serial,
                  secret: bonus.secret,
                })),
              }
            : undefined,
        }))
      );
    }
  
    // Получение истории операций с десериализацией даты
    getOperationHistory(from: number, count: number): Observable<OperationHistory[]> {
      const url = `${this.apiUrl}/operation-history?from=${from}&count=${count}`;
      return this.http.get<OperationHistory[]>(url).pipe(
        map(history => history.map(operation => ({
          ...operation,
          datetime: new Date(operation.datetime) // Преобразование строки даты в объект Date
        })))
      );
    }
  
    // Авторизация (возвращает URL для перехода)
    authorize(returnUrl: string = '/YooMoney'): Observable<string> {
      const url = `${this.apiUrl}/authorize?returnUrl=${encodeURIComponent(returnUrl)}`;
      return of(url);
    }
  
    // Получение токена
    getToken(code: string): Observable<unknown> {
      const url = `${this.apiUrl}/token`;
      return this.http.post(url, { code });
    }
  }
