import { Component, OnInit, Input, ViewChild, OnDestroy } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { ApplicationUser } from 'src/app/models/UserTopic';
import { AuthEventService } from 'src/app/service/AuthEventService';
import { AuthService } from 'src/app/service/auth.service';
import { NavService } from 'src/app/service/nav.service';
import { MaterialModule } from 'src/app/material.module';
import { RouterModule } from '@angular/router';
import { OpenSupportDialogDirective } from 'src/app/directives/open-support-dialog.directive';

// Определяем тип, включающий только имена методов
type FirstComponentMethods =
  | 'openNonModalVolumeSearch'
  | 'openNonModalSettings'
  | 'openNonModalMarkUp'
  | 'openNonModalTopOrders'
  | 'uploadImage'
  | 'getCsv';

@Component({
  standalone: true,
  selector: 'app-top-nav',
  imports: [MaterialModule, RouterModule, OpenSupportDialogDirective],
  templateUrl: './top-nav.component.html',
  styleUrls: ['./top-nav.component.scss'],
})
export class TopNavComponent implements OnInit, OnDestroy {
  @Input() config: any;
  @ViewChild(RouterOutlet) outlet: RouterOutlet;

  isSignedIn = false;
  user: ApplicationUser | null = null;
  isFootPrintSelected = false;
  isDrawerOpened = true;
  isAdmin: boolean = false; // Добавлено свойство для проверки администратора

  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private authEventService: AuthEventService,
    public navService: NavService,
    private router: Router,
    private activatedRoute: ActivatedRoute
  ) {
    this.setupRouterEvents();
  }

  ngOnInit(): void {
    this.initializeAuthState();
    this.subscribeToAuthStateChanges();

    // Подписываемся на состояние панели навигации
    this.navService.isOpenedObs$
      .pipe(takeUntil(this.destroy$))
      .subscribe((isOpened) => {
        this.isDrawerOpened = isOpened;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupRouterEvents(): void {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.isFootPrintSelected = this.router.url.includes('/FootPrint');

        if (this.isFootPrintSelected) {
          // Если боковая панель не открыта, откроем её
          if (!this.navService.isSidenavOpened()) {
            this.navService.openNav();
          }
        } else {
          // Если боковая панель открыта, закроем её
          if (this.navService.isSidenavOpened()) {
            this.navService.closeNav();
          }
        }
      });
  }

  private initializeAuthState(): void {
    this.isSignedIn = this.authService.isAuthenticated();
    if (this.isSignedIn) {
      this.fetchLoggedUser();
    }
  }

  private subscribeToAuthStateChanges(): void {
    this.authEventService.authStateChange$
      .pipe(takeUntil(this.destroy$))
      .subscribe((isSignedIn) => {
        this.isSignedIn = isSignedIn;
        if (isSignedIn) {
          this.fetchLoggedUser();
        } else {
          this.user = null;
          this.isAdmin = false; // Сбрасываем флаг администратора при выходе
        }
      });
  }

  private fetchLoggedUser(): void {
    this.authService
      .getLoggedUser()
      .pipe(takeUntil(this.destroy$))
      .subscribe((user) => {
        this.user = user;
        this.isAdmin = this.authService.isAdmin(); // Проверяем, является ли пользователь администратором
      });
  }

  toggle(): void {
    // Используем NavService для переключения боковой панели
    this.navService.toggleNav();
  }

  // Try to invoke methods on the footprint component when it is currently active.
  private executeFirstComponentMethod(methodName: FirstComponentMethods): void {
    if (!this.isFootPrintSelected || !this.outlet) {
      return;
    }

    const instance = this.outlet.component as Record<string, unknown>;
    if (instance && typeof instance[methodName] === 'function') {
      (instance[methodName] as Function)();
    } else {
      console.warn(
        `Метод ${methodName} отсутствует на активном компоненте`,
        instance
      );
    }
  }

  openNonModalVolumeSearch(): void {
    this.executeFirstComponentMethod('openNonModalVolumeSearch');
  }

  openNonModalSettings(): void {
    this.executeFirstComponentMethod('openNonModalSettings');
  }

  openNonModalMarkUp(): void {
    this.executeFirstComponentMethod('openNonModalMarkUp');
  }

  openNonModalTopOrders(): void {
    this.executeFirstComponentMethod('openNonModalTopOrders');
  }

  uploadImage(): void {
    this.executeFirstComponentMethod('uploadImage');
  }

  getCsv(): void {
    this.executeFirstComponentMethod('getCsv');
  }
}
