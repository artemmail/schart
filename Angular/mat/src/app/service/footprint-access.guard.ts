import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, UrlTree } from '@angular/router';
import { catchError, map, Observable, of } from 'rxjs';
import { PaymentResponse1, PaymentService } from './payment.service';

@Injectable({ providedIn: 'root' })
export class FootprintAccessGuard implements CanActivate {
  constructor(private paymentService: PaymentService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): Observable<boolean | UrlTree> | boolean {
    if (route.queryParamMap.get('mode')?.toLowerCase() === 'candles') {
      return true;
    }

    return this.paymentService.getPaymentInfo().pipe(
      map((response: PaymentResponse1) => {
        const payment = response?.UserInfo;
        const expiresAt = payment?.ExpireDate ? new Date(payment.ExpireDate).getTime() : NaN;
        const paid = Number.isFinite(expiresAt) && expiresAt > Date.now();
        return paid ? true : this.candlesUrl(route);
      }),
      catchError(() => of(this.candlesUrl(route)))
    );
  }

  private candlesUrl(route: ActivatedRouteSnapshot): UrlTree {
    return this.router.createUrlTree(['/FootPrint'], {
      queryParams: { ...route.queryParams, mode: 'candles' },
    });
  }
}
