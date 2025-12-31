import { Injectable } from '@angular/core'; 
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { ApplicationUser } from '../models/UserTopic';

import { LoginModel } from '../models/login';
import { environment } from '../environment';

export interface InputModel {
  Email: string;
  UserName: string;
  Password: string;
  ConfirmPassword: string;
}

export interface ResetPasswordInputModel {
  Email: string;
  Password: string;
  ConfirmPassword: string;
  Code: string;
}

export interface LoginResponse {
  message: string;
  roles: string[];
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private loggedIn: boolean = false;

  constructor(private http: HttpClient) {}

  // Подтверждение email
  confirmEmail(userId: string, code: string): Observable<{ message: string }> {
    return this.http.get<{ message: string }>(`${environment.apiUrl}/api/auth/confirmemail`, {
      params: { userId, code }
    });
  }

  // Логин пользователя
  login(model: LoginModel): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${environment.apiUrl}/api/auth/login`, model, { withCredentials: true }).pipe(
      tap((response: LoginResponse) => {
        // Сохранение ролей в localStorage
        
        localStorage.setItem('userRoles', JSON.stringify(response.roles));
        this.loggedIn = true;
      })
    );
  }

  // Логаут пользователя
  logout(): Observable<any> {
    return this.http.post(`${environment.apiUrl}/api/auth/logout`, {}, { withCredentials: true }).pipe(
      tap(() => {
        // Удаление ролей из localStorage
        localStorage.removeItem('userRoles');
        this.loggedIn = false;
      })
    );
  }

  // Проверка локальной авторизации
  isAuthenticated(): boolean {
    const roles = localStorage.getItem('userRoles');
    return this.loggedIn || !!roles;
  }

  // Проверка авторизации через API
  isSignedIn(): Observable<boolean> {
    return this.http.get<boolean>(`${environment.apiUrl}/api/auth/issignedin`, { withCredentials: true }).pipe(
      tap((isSignedIn: boolean) => {
        this.loggedIn = isSignedIn;
        if (!isSignedIn) {
          localStorage.removeItem('userRoles');
        }
      })
    );
  }

  // Получение информации о текущем пользователе
  getLoggedUser(): Observable<ApplicationUser> {
    return this.http.get<ApplicationUser>(`${environment.apiUrl}/api/auth/loggeduser`, { withCredentials: true });
  }

  // Регистрация нового пользователя
  register(model: InputModel): Observable<any> {
    return this.http.post(`${environment.apiUrl}/api/auth/register`, model);
  }

  // Восстановление пароля
  forgotPassword(email: string): Observable<any> {
    return this.http.post(`${environment.apiUrl}/api/auth/forgotpassword`, { Email: email });
  }

  // Сброс пароля
  resetPassword(model: ResetPasswordInputModel): Observable<any> {
    return this.http.post(`${environment.apiUrl}/api/auth/resetpassword`, model);
  }

  // Подтверждение изменения email
  confirmEmailChange(userId: string, email: string, code: string): Observable<any> {
    return this.http.get(`${environment.apiUrl}/api/auth/confirmemailchange`, {
      params: { userId, email, code }
    });
  }

  // Повторная отправка email для подтверждения
  resendEmailConfirmation(email: string): Observable<any> {
    return this.http.post(`${environment.apiUrl}/api/auth/resend-email-confirmation`, { email });
  }

  // Проверка, является ли пользователь администратором
  isAdmin(): boolean {
    const roles = JSON.parse(localStorage.getItem('userRoles') || '[]');
    return roles.includes('Admin');
  }
}
