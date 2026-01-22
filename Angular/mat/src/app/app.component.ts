import {
  Component,
  ViewEncapsulation,
  OnInit,
  Inject,
} from '@angular/core';

import {
  NavigationEnd,
  Router,
} from '@angular/router';

import {
  isPlatformServer,
} from '@angular/common';

import { filter } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { PLATFORM_ID } from '@angular/core';
import { TopNavComponent } from './components/Controls/top-nav/top-nav.component';
import { MaterialThemeService } from './services/theme/material-theme.service';

// --- добавляем один раз — вне класса ---
declare global {
  interface Window {
    ym?: (counterId: number, method: string, ...args: any[]) => void;
  }
}

const METRIKA_ID = 16829734;

@Component({
  standalone: true,
  selector: 'angular-material-drawer',
  imports: [TopNavComponent],
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class AppComponent implements OnInit {

  constructor(
    private http: HttpClient,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object,
    private materialThemeService: MaterialThemeService
  ) {

    // SSR – пропускаем
    if (isPlatformServer(platformId)) return;

    // начальный урл (важно: даже если URL в адресной строке не меняется из-за skipLocationChange)
    let prevUrl = this.router.url || '/';

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        const newUrl = (event.urlAfterRedirects || event.url || this.router.url || '/');

        // защита от дублей
        if (!newUrl || newUrl === prevUrl) return;

        // прямой вызов Метрики
        window.ym?.(METRIKA_ID, 'hit', newUrl, {
          referer: prevUrl,
          title: document.title,
        });

        prevUrl = newUrl;
      });
  }

  ngOnInit(): void {
    if (isPlatformServer(this.platformId)) {
      return;
    }
    this.materialThemeService.initializeFromStorage();
  }
}
