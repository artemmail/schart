import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private settingsClickSubject = new Subject<void>();
  settingsClick$ = this.settingsClickSubject.asObservable();

  emitSettingsClick() {
    this.settingsClickSubject.next();
  }
}