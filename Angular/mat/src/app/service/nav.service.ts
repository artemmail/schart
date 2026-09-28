// nav.service.ts

import { Injectable } from '@angular/core';
import { MatSidenav } from '@angular/material/sidenav';
import { BehaviorSubject, Subscription } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class NavService {
  private sidenav?: MatSidenav;
  private sidenavChanges?: Subscription;

  // BehaviorSubject to keep track of sidenav's open state
  private isOpened$ = new BehaviorSubject<boolean>(true);

  // Observable for components to subscribe to
  public isOpenedObs$ = this.isOpened$.asObservable();

  constructor() {}

  // Method to set the sidenav reference
  public setSidenav(sidenav: MatSidenav) {
    this.sidenavChanges?.unsubscribe();
    this.sidenav = sidenav;
    this.sidenavChanges = sidenav.openedChange.subscribe((opened) => {
      this.isOpened$.next(opened);
    });
    queueMicrotask(() => {
      if (this.sidenav === sidenav) {
        this.isOpened$.next(sidenav.opened);
      }
    });
  }

  public clearSidenav(sidenav: MatSidenav) {
    if (this.sidenav !== sidenav) {
      return;
    }
    this.sidenavChanges?.unsubscribe();
    this.sidenavChanges = undefined;
    this.sidenav = undefined;
    this.isOpened$.next(false);
  }

  // Method to open the sidenav
  public openNav() {
    if (this.sidenav && !this.sidenav.opened) {
      this.sidenav.open();
      this.isOpened$.next(true);
    }
  }

  // Method to close the sidenav
  public closeNav() {
    if (this.sidenav && this.sidenav.opened) {
      this.sidenav.close();
      this.isOpened$.next(false);
    }
  }

  // Method to toggle the sidenav
  public toggleNav() {
    if (this.sidenav) {
      this.sidenav.toggle();
      this.isOpened$.next(this.sidenav.opened);
    }
  }

  // Getter for the current state (optional)
  public isSidenavOpened(): boolean {
    return this.sidenav ? this.sidenav.opened : false;
  }
}
