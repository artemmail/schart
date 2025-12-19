import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(private authService: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    // Проверяем, авторизован ли пользователь
    if (this.authService.isAuthenticated()) {
      return true;
    } else {
      // Если пользователь не авторизован, перенаправляем на страницу логина
      this.router.navigate(['/Identity/Account/Login'], { queryParams: { returnUrl: state.url } });
      return false;
    }
  }
}
