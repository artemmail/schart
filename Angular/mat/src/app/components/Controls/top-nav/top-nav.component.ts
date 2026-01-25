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
import { MatDialog } from '@angular/material/dialog';
import { DialogService } from 'src/app/service/DialogService.service';
import { YandexAdvComponent } from 'src/app/components/ads/yandex-adv/yandex-adv.component';
import {
  FootprintFavorite,
  FootprintFavoritePayload,
  FootprintFavoritesService,
} from 'src/app/service/FootPrint/Favorites/footprint-favorites.service';
import { FavoriteRenameDialogComponent } from 'src/app/components/Dialogs/favorite-rename-dialog/favorite-rename-dialog.component';
import { FootPrintParameters } from 'src/app/models/Params';

interface FootprintFavoritesHost {
  getFootprintFavoritePayload: () => FootprintFavoritePayload | null;
  applyFootprintFavorite: (payload: FootprintFavoritePayload) => void;
}

// Определяем тип, включающий только имена методов
type FirstComponentMethods =
  | 'openNonModalVolumeSearch'
  | 'openNonModalSettings'
  | 'openNonModalMarkUp'
  | 'openNonModalTopOrders'
  | 'openNonModalOrderBook'
  | 'openNonModalVirtualPortfolio'
  | 'openModalPortfolioCompare'
  | 'openVirtualPortfolioBuy'
  | 'openVirtualPortfolioSell'
  | 'openPortfolioManipulationDialog'
  | 'uploadImage'
  | 'getCsv'
  | 'openCurrentChartUrl'
  | 'clearFootprintMarks';

@Component({
  standalone: true,
  selector: 'app-top-nav',
  imports: [
    MaterialModule,
    RouterModule,
    OpenSupportDialogDirective,
    YandexAdvComponent,
  ],
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
  favorites: FootprintFavorite[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private authEventService: AuthEventService,
    public navService: NavService,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private favoritesService: FootprintFavoritesService,
    private dialog: MatDialog,
    private dialogService: DialogService
  ) {
    this.setupRouterEvents();
  }

  ngOnInit(): void {
    this.initializeAuthState();
    this.subscribeToAuthStateChanges();
    this.favoritesService.setUserKey(this.user?.Id);
    this.favoritesService.favorites$
      .pipe(takeUntil(this.destroy$))
      .subscribe((favorites) => {
        this.favorites = favorites;
      });

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
        this.isFootPrintSelected = this.isFootprintRoute(this.router.url);

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
          this.favoritesService.setUserKey(null);
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
        this.favoritesService.setUserKey(this.user?.Id);
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

  openNonModalOrderBook(): void {
    this.executeFirstComponentMethod('openNonModalOrderBook');
  }

  openNonModalVirtualPortfolio(): void {
    this.executeFirstComponentMethod('openNonModalVirtualPortfolio');
  }

  openModalPortfolioCompare(): void {
    this.executeFirstComponentMethod('openModalPortfolioCompare');
  }

  openVirtualPortfolioBuy(): void {
    this.executeFirstComponentMethod('openVirtualPortfolioBuy');
  }

  openVirtualPortfolioSell(): void {
    this.executeFirstComponentMethod('openVirtualPortfolioSell');
  }

  openPortfolioManipulationDialog(): void {
    this.executeFirstComponentMethod('openPortfolioManipulationDialog');
  }

  uploadImage(): void {
    this.executeFirstComponentMethod('uploadImage');
  }

  getCsv(): void {
    this.executeFirstComponentMethod('getCsv');
  }

  openCurrentChartUrl(): void {
    this.executeFirstComponentMethod('openCurrentChartUrl');
  }

  clearFootprintMarks(): void {
    this.executeFirstComponentMethod('clearFootprintMarks');
  }

  addCurrentFavorite(): void {
    if (!this.isSignedIn) {
      this.dialogService
        .info('Для добавления в избранное нужно войти в аккаунт.')
        .subscribe();
      return;
    }

    const payload = this.getFootprintFavoritePayload();
    if (!payload) {
      return;
    }

    const name = this.buildFavoriteName(payload.params);
    this.favoritesService.addFavorite(name, payload);
  }

  applyFavorite(favorite: FootprintFavorite): void {
    const host = this.getFootprintFavoritesHost();
    if (!host) {
      return;
    }

    host.applyFootprintFavorite({
      params: favorite.params,
      presetIndex: favorite.presetIndex ?? null,
    });
  }

  renameFavorite(favorite: FootprintFavorite, event: MouseEvent): void {
    event.stopPropagation();
    event.preventDefault();

    this.dialog
      .open(FavoriteRenameDialogComponent, {
        width: '360px',
        data: {
          name: favorite.name,
          title: 'Переименовать избранное',
        },
      })
      .afterClosed()
      .subscribe((result) => {
        if (typeof result === 'string' && result.trim()) {
          this.favoritesService.renameFavorite(favorite.id, result);
        }
      });
  }

  deleteFavorite(favorite: FootprintFavorite, event: MouseEvent): void {
    event.stopPropagation();
    event.preventDefault();
    this.favoritesService.deleteFavorite(favorite.id);
  }

  private getFootprintFavoritePayload(): FootprintFavoritePayload | null {
    const host = this.getFootprintFavoritesHost();
    return host?.getFootprintFavoritePayload?.() ?? null;
  }

  private getFootprintFavoritesHost(): FootprintFavoritesHost | null {
    if (!this.isFootPrintSelected || !this.outlet) {
      return null;
    }

    const instance = this.outlet.component as Partial<FootprintFavoritesHost>;
    if (
      instance &&
      typeof instance.getFootprintFavoritePayload === 'function' &&
      typeof instance.applyFootprintFavorite === 'function'
    ) {
      return instance as FootprintFavoritesHost;
    }

    return null;
  }

  private isFootprintRoute(url: string): boolean {
    return url.includes('/FootPrint') || url.includes('/CandlestickChart');
  }

  private buildFavoriteName(params: FootPrintParameters): string {
    const parts: string[] = [];
    if (params.type === 'arbitrage') {
      const leg1 = params.ticker1 ?? '';
      const leg2 = params.ticker2 ?? '';
      const pair = [leg1, leg2].filter(Boolean).join(' / ');
      if (pair) {
        parts.push(pair);
      }
    } else if (params.ticker) {
      parts.push(params.ticker);
    }

    if (params.rperiod) {
      parts.push(params.rperiod);
    } else if (params.period !== undefined && params.period !== null) {
      parts.push(`P${params.period}`);
    }

    const base = parts.filter(Boolean).join(' - ');
    if (base) {
      return base;
    }

    return `Избранное ${this.favorites.length + 1}`;
  }
}
