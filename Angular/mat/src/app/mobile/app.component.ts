import { Component, ViewChild, AfterViewInit, OnInit, Inject, ElementRef } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { isPlatformServer, Location } from '@angular/common';
import { filter } from 'rxjs/operators';
import { Metrika } from 'ng-yandex-metrika';
import { HttpClient } from '@angular/common/http';
import { PLATFORM_ID } from '@angular/core';
import { MatSidenav } from '@angular/material/sidenav';
import { AuthService } from '../service/auth.service';
import { AuthEventService } from '../service/AuthEventService';
import { ApplicationUser } from '../models/UserTopic';

import * as Hammer from 'hammerjs';

@Component({
  selector: 'angular-material-drawer',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppMobileComponent implements AfterViewInit, OnInit {

  isSignedIn: boolean = false;
  user: ApplicationUser | null = null;

  @ViewChild('drawer') sidenav!: MatSidenav;
  @ViewChild('drawer', { read: ElementRef }) sidenavElement!: ElementRef;

  ngAfterViewInit() {
    this.sidenav.openedChange.subscribe(() => this.triggerResizeEvent());

    // Здесь используется nativeElement для создания HammerManager
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


  constructor(
    private metrika: Metrika,
    private authService: AuthService,
    private authEventService: AuthEventService,
    private http: HttpClient,
    private router: Router,
    location: Location,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    if (isPlatformServer(platformId)) {
      return;
    }

    try {
      let prevPath = location.path();
      this.router.events.pipe(filter(event => (event instanceof NavigationEnd)))
        .subscribe(() => {
          console.log('hit start');
          const newPath = location.path();
          this.metrika.hit(newPath, {
            referer: prevPath,
            callback: () => {
              console.log('hit end');
            }
          });
          prevPath = newPath;
        });
    } catch (e) {
      console.error(e);
    }
  }
}
