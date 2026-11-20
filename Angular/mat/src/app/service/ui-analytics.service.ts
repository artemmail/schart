import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class UiAnalyticsService {
  track(event: 'chart_open' | 'catalog_open' | 'demo_open' | 'subscription_view' | 'checkout_start' | 'data_retry', details: Record<string, string | number> = {}): void {
    if (typeof window === 'undefined') return;
    const gtag = (window as any).gtag;
    if (typeof gtag === 'function') gtag('event', event, details);
    window.ym?.(16829734, 'reachGoal', event, details);
  }
}
