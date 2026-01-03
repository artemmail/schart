import { Component, ViewChild, AfterViewInit, OnInit, Inject, ElementRef } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { isPlatformServer, Location } from '@angular/common';
import { filter } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { PLATFORM_ID } from '@angular/core';
import { MatSidenav } from '@angular/material/sidenav';
import { AuthService } from '../service/auth.service';
import { AuthEventService } from '../service/AuthEventService';
import { ApplicationUser } from '../models/UserTopic';
import { MaterialModule } from 'src/app/material.module';
import { HeaderComponent } from './header/header.component';

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
  imports: [MaterialModule, HeaderComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppMobileComponent implements AfterViewInit, OnInit {

  isSignedIn: boolean = false;
  user: ApplicationUser | null = null;

  @ViewChild('drawer') sidenav!: MatSidenav;
  @ViewChild('drawer', { read: ElementRef }) sidenavElement!: ElementRef;

  constructor(
    private authService: AuthService,
    private authEventService: AuthEventService,
    private http: HttpClient,
    private router: Router,
    private location: Location,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    // SSR: на сервере метрику/роутер-ивенты не трогаем
    if (isPlatformServer(this.platformId)) {
      return;
    }

    // ✅ Метрика: отправка hit на каждую навигацию (NavigationEnd)
    let prevPath = this.location.path(true);

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => {
        const newPath = this.location.path(true);

        // защита от дублей/пустого пути
        if (!newPath || newPath === prevPath) return;

        window.ym?.(METRIKA_ID, 'hit', newPath, {
          referer: prevPath,
        });

        prevPath = newPath;
      });
  }

  ngAfterViewInit() {
    this.sidenav.openedChange.subscribe(() => this.triggerResizeEvent());

    // Hammer для свайпа
    const hammer = new Hammer(this.sidenavElement.nativeElement);
    hammer.on('panleft', this.onPanStart);
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
}
