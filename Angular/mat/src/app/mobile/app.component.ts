import { Component, ViewChild, AfterViewInit, OnInit, OnDestroy, Inject, ElementRef } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { isPlatformServer } from '@angular/common';
import { filter } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { PLATFORM_ID } from '@angular/core';
import { MatSidenav } from '@angular/material/sidenav';
import { AuthService } from '../service/auth.service';
import { AuthEventService } from '../service/AuthEventService';
import { ApplicationUser } from '../models/UserTopic';
import { MaterialModule } from 'src/app/material.module';
import { HeaderComponent } from './header/header.component';
import { MaterialThemeService } from 'src/app/services/theme/material-theme.service';
import { YandexAdvComponent } from 'src/app/components/ads/yandex-adv/yandex-adv.component';

import * as Hammer from 'hammerjs';

// ✅ типизация для новой Я.Метрики (ym)
declare global {
  interface Window {
    ym?: (counterId: number, method: string, ...args: any[]) => void;
  }
}

const METRIKA_ID = 16829734;

@Component({
  standalone: true,
  selector: 'angular-material-drawer',
  imports: [MaterialModule, HeaderComponent, YandexAdvComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppMobileComponent implements AfterViewInit, OnInit, OnDestroy {

  private readonly isBrowser: boolean;
  private visualViewport?: VisualViewport;
  private readonly windowResizeHandler = () => {
    this.updateViewportVars();
  };
  private readonly viewportResizeHandler = () => {
    this.updateViewportVars();
    window.dispatchEvent(new Event('resize'));
  };

  isSignedIn: boolean = false;
  user: ApplicationUser | null = null;

  @ViewChild('drawer') sidenav!: MatSidenav;
  @ViewChild('drawer', { read: ElementRef }) sidenavElement!: ElementRef;

  constructor(
    private authService: AuthService,
    private authEventService: AuthEventService,
    private http: HttpClient,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object,
    private materialThemeService: MaterialThemeService
  ) {
    this.isBrowser = !isPlatformServer(this.platformId);
    // SSR: на сервере метрику/роутер-ивенты не трогаем
    if (!this.isBrowser) {
      return;
    }

    // ✅ Метрика: отправка hit на каждую навигацию (NavigationEnd)
    let prevUrl = this.router.url || '/';

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        const newUrl = (event.urlAfterRedirects || event.url || this.router.url || '/');

        // защита от дублей/пустого пути
        if (!newUrl || newUrl === prevUrl) return;

        window.ym?.(METRIKA_ID, 'hit', newUrl, {
          referer: prevUrl,
          title: document.title,
        });

        prevUrl = newUrl;
      });
  }

  ngAfterViewInit() {
    if (!this.isBrowser) {
      return;
    }

    this.sidenav.openedChange.subscribe(() => this.triggerResizeEvent());

    // Hammer для свайпа
    const hammer = new Hammer(this.sidenavElement.nativeElement);
    hammer.on('panleft', this.onPanStart);

    this.setupViewportListeners();
  }

  triggerResizeEvent() {
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 350);
  }

  onPanStart = (): void => {
    this.sidenav.close();
  }

  ngOnInit(): void {
    if (this.isBrowser) {
      this.updateViewportVars();
      this.materialThemeService.initializeFromStorage();
    }
    this.isSignedIn = this.authService.isAuthenticated();

    if (this.isSignedIn) {
      this.authService.getLoggedUser().subscribe((user) => (this.user = user));
    }

    // Subscribe to auth state changes
    this.authEventService.authStateChange$.subscribe((isSignedIn) => {
      this.isSignedIn = isSignedIn;

      if (isSignedIn) {
        this.authService.getLoggedUser().subscribe((user) => (this.user = user));
      } else {
        this.user = null;
      }
    });
  }

  ngOnDestroy(): void {
    if (!this.isBrowser) {
      return;
    }

    window.removeEventListener('resize', this.windowResizeHandler);
    window.removeEventListener('orientationchange', this.windowResizeHandler);
    if (this.visualViewport) {
      this.visualViewport.removeEventListener('resize', this.viewportResizeHandler);
      this.visualViewport.removeEventListener('scroll', this.viewportResizeHandler);
    }
  }

  private setupViewportListeners(): void {
    if (!this.isBrowser) {
      return;
    }

    this.updateViewportVars();
    window.addEventListener('resize', this.windowResizeHandler);
    window.addEventListener('orientationchange', this.windowResizeHandler);

    this.visualViewport = window.visualViewport ?? undefined;
    if (this.visualViewport) {
      this.visualViewport.addEventListener('resize', this.viewportResizeHandler);
      this.visualViewport.addEventListener('scroll', this.viewportResizeHandler);
    }
  }

  private updateViewportVars(): void {
    if (!this.isBrowser) {
      return;
    }

    const height = window.visualViewport?.height ?? window.innerHeight;
    document.documentElement.style.setProperty(
      '--app-vh',
      `${Math.round(height)}px`
    );
  }
}
