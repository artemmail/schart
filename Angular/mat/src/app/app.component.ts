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
  Location,
} from '@angular/common';

import { filter } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { PLATFORM_ID } from '@angular/core';

// --- добавляем один раз — вне класса ---
declare global {
  interface Window {
    ym?: (counterId: number, method: string, ...args: any[]) => void;
  }
}

const METRIKA_ID = 16829734;

@Component({
  standalone: false,
  selector: 'angular-material-drawer',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class AppComponent implements OnInit {

  constructor(
    private http: HttpClient,
    private router: Router,
    private location: Location,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {

    // SSR – пропускаем
    if (isPlatformServer(platformId)) return;

    // начальный путь
    let prevPath = this.location.path(true);

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => {
        const newPath = this.location.path(true);

        // защита от дублей
        if (!newPath || newPath === prevPath) return;

        // прямой вызов Метрики
        window.ym?.(METRIKA_ID, 'hit', newPath, {
          referer: prevPath,
        });

        prevPath = newPath;
      });
  }

  ngOnInit(): void {}
}
