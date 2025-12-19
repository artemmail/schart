// header.component.ts
import { Component, EventEmitter, Output } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { SettingsService } from 'src/app/service/settings.service';

@Component({
  standalone: false,
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent {
  @Output() menuToggle = new EventEmitter<void>();
  @Output() settingsClicked = new EventEmitter<void>();

  showSettingsButton = false;

  constructor(private router: Router, private settingsService: SettingsService) {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.updateSettingsButton(event.url);
      }
    });
  }

  updateSettingsButton(url: string) {
    this.showSettingsButton = url.includes('FootPrint'); // Show settings button on FootPrint page
  }

  openSettings() {
    this.settingsService.emitSettingsClick();
  }
}
