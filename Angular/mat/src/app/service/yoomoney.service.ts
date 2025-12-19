import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { OperationDetails, OperationHistory } from '../models/YooMoneyModels';
import { environment } from '../environment';

@Injectable({
    providedIn: 'root'
  })
  export class YooMoneyService {
    private apiUrl = `${environment.apiUrl}/api/YooMoney`;
  
    constructor(private http: HttpClient) {}
  
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
    authorize(): Observable<string> {
      const url = `${this.apiUrl}/authorize`;
      return this.http.get<string>(url);
    }
  
    // Получение токена
    getToken(code: string): Observable<string> {
      const url = `${this.apiUrl}/token`;
      return this.http.post<string>(url, { code });
    }
  }