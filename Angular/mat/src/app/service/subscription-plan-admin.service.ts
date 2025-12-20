import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../environment';

export interface SubscriptionPlanRequest {
  interval: string;
  count: number;
  ordinalMoney: number;
  discountMoney: number;
  code: number;
  isReferal: boolean;
  referalInterval?: string | null;
  referalCount?: number | null;
}

export interface SubscriptionPlanDto extends SubscriptionPlanRequest {
  id: number;
}

export interface SubscriptionPlanResponse {
  discountBefore: string;
  plans: SubscriptionPlanDto[];
}

interface SubscriptionPlanApiDto {
  Id: number;
  Interval: string;
  Count: number;
  OrdinalMoney: number;
  DiscountMoney: number;
  Code: number;
  IsReferal: boolean;
  ReferalInterval?: string | null;
  ReferalCount?: number | null;
}

interface SubscriptionPlanApiResponse {
  DiscountBefore: string;
  Plans: SubscriptionPlanApiDto[];
}

export interface DiscountSettingDto {
  discountBefore: string;
}

@Injectable({
  providedIn: 'root',
})
export class SubscriptionPlanAdminService {
  private apiUrl = `${environment.apiUrl}/api/SubscriptionPlans`;

  constructor(private http: HttpClient) {}

  getSettings(): Observable<SubscriptionPlanResponse> {
    return this.http.get<SubscriptionPlanApiResponse>(this.apiUrl).pipe(
      map((response) => ({
        discountBefore: response.DiscountBefore,
        plans: response.Plans.map((plan) => ({
          id: plan.Id,
          interval: plan.Interval,
          count: plan.Count,
          ordinalMoney: plan.OrdinalMoney,
          discountMoney: plan.DiscountMoney,
          code: plan.Code,
          isReferal: plan.IsReferal,
          referalInterval: plan.ReferalInterval,
          referalCount: plan.ReferalCount,
        })),
      }))
    );
  }

  savePlan(
    plan: SubscriptionPlanRequest,
    id?: number
  ): Observable<SubscriptionPlanDto> {
    if (id) {
      return this.http.put<SubscriptionPlanDto>(`${this.apiUrl}/${id}`, plan);
    }

    return this.http.post<SubscriptionPlanDto>(this.apiUrl, plan);
  }

  deletePlan(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  updateDiscount(discountBefore: string): Observable<DiscountSettingDto> {
    return this.http.put<DiscountSettingDto>(`${this.apiUrl}/discount`, {
      discountBefore,
    });
  }
}
