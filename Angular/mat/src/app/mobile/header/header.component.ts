// header.component.ts
import { Component, EventEmitter, Output, Inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DOCUMENT, isPlatformBrowser } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { SettingsService } from 'src/app/service/settings.service';
import { PLATFORM_ID } from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-header',
  imports: [CommonModule, MatButtonModule, MatIconModule, MatToolbarModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit, OnDestroy {
  @Output() menuToggle = new EventEmitter<void>();
  @Output() settingsClicked = new EventEmitter<void>();

  showSettingsButton = false;
  fullscreenSupported = false;
  isFullscreen = false;

  private readonly fullscreenChangeHandler = () => {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.isFullscreen = !!this.document.fullscreenElement;
  };

  constructor(
    private router: Router,
    private settingsService: SettingsService,
    @Inject(PLATFORM_ID) private platformId: Object,
    @Inject(DOCUMENT) private document: Document
  ) {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.updateSettingsButton(event.url);
      }
    });
  }

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const docEl = this.document?.documentElement;
    this.fullscreenSupported = !!docEl?.requestFullscreen;
    this.isFullscreen = !!this.document.fullscreenElement;
    this.document.addEventListener('fullscreenchange', this.fullscreenChangeHandler);
  }

  ngOnDestroy(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.document.removeEventListener('fullscreenchange', this.fullscreenChangeHandler);
  }

  updateSettingsButton(url: string) {
    this.showSettingsButton =
      url.includes('FootPrint') || url.includes('CandlestickChart');
  }

  openSettings() {
    this.settingsService.emitSettingsClick();
  }

  toggleFullscreen(): void {
    if (!isPlatformBrowser(this.platformId) || !this.fullscreenSupported) {
      return;
    }

    if (this.document.fullscreenElement) {
      this.document.exitFullscreen?.();
    } else {
      this.document.documentElement?.requestFullscreen?.();
    }
  }
}
