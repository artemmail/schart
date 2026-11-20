import { Injectable } from '@angular/core';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class PageStateService {
  private states = new Map<string, unknown>();
  private positions = new Map<string, number>();
  private started = false;
  private pendingRestore?: ReturnType<typeof setTimeout>;
  get<T>(key: string): Partial<T> { return (this.states.get(key) ?? {}) as Partial<T>; }
  set(key: string, state: unknown): void { this.states.set(key, structuredClone(state)); }

  start(router: Router): void {
    if (this.started) return;
    this.started = true;
    let currentUrl = router.url;
    let restore = false;
    router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        clearTimeout(this.pendingRestore);
        this.positions.set(currentUrl, window.scrollY);
        restore = event.navigationTrigger === 'popstate';
      }
      if (event instanceof NavigationEnd) {
        const samePage = currentUrl.split('?')[0] === event.urlAfterRedirects.split('?')[0];
        currentUrl = event.urlAfterRedirects;
        const target = restore ? this.positions.get(currentUrl) ?? 0 : samePage ? window.scrollY : 0;
        let attempts = 0;
        const apply = () => {
          window.scrollTo(0, target);
          if (window.scrollY < target - 2 && attempts++ < 30) this.pendingRestore = setTimeout(apply, 100);
        };
        this.pendingRestore = setTimeout(apply);
      }
    });
  }
}
