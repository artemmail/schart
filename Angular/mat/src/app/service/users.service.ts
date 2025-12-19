import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http'; // Добавлен HttpParams
import { Observable } from 'rxjs';
import { ApplicationUserModel, ReturnedUser, TotalPay } from '../models/UsersTable.model';


export interface ProfitData {
  date: string; // Дата в формате строки или Date
  profit: number; // Доход за указанный период
}

export interface PaymentTableData {
  comment: string;
  info: number;
}


@Injectable({
  providedIn: 'root',
})
export class UserService {
  private apiUrl = 'api/users';
  private adminApiUrl = 'api/Admin';

  constructor(private http: HttpClient) { }

  /**
   * Получить список всех пользователей
   */
  getAllUsers(): Observable<ApplicationUserModel[]> { // Переименован метод
    return this.http.get<ApplicationUserModel[]>(`${this.apiUrl}/Read`);
  }

  /**
   * Получить список пользователей с пагинацией, сортировкой и фильтрацией
   * @param page - номер страницы
   * @param pageSize - количество пользователей на странице
   * @param sortField - поле для сортировки
   * @param sortOrder - порядок сортировки ('asc' или 'desc')
   * @param filter - строка фильтрации
   */
  getUsers(
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

    return this.http.get<any>(`${this.apiUrl}/GetUsers`, { params });
  }

  /**
   * Удалить пользователя по ID
   * @param id - идентификатор пользователя
   */
  deleteUser(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  /**
   * Получить список возвращённых пользователей
   */
  getReturnedUsers(): Observable<ReturnedUser[]> {
    return this.http.get<ReturnedUser[]>(`${this.adminApiUrl}/ReturnedUsers`);
  }

  /**
   * Получить данные о платежах пользователя
   * @param username - имя пользователя
   */
  getTotalPays(username: string): Observable<TotalPay[]> {
    return this.http.get<TotalPay[]>(`${this.adminApiUrl}/TotalPays`, {
      params: { username }
    });
  }

  getShowProfit(): Observable<ProfitData[]> {
    return this.http.get<ProfitData[]>(`${this.adminApiUrl}/ShowProfit`);
  }

  /**
   * Получить данные об общем доходе
   */
  getShowProfitTotal(): Observable<ProfitData[]> {
    return this.http.get<ProfitData[]>(`${this.adminApiUrl}/ShowProfitTotal`);
  }

  getPaymentTable(): Observable<PaymentTableData[]> {
    return this.http.get<PaymentTableData[]>(`${this.adminApiUrl}/PaymentTable`);
  }
}
