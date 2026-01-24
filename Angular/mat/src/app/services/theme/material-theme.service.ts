import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';
import { DEFAULT_THEME_PRESET, ThemePreset } from './theme.model';

@Injectable({
  providedIn: 'root',
})
export class MaterialThemeService {
  private readonly darkThemeId = 'material-dark-theme';
  private readonly darkThemeHref = 'assets/material-themes/magenta-violet.css';
  private readonly storageKey = 'uiThemePreset';
  private readonly defaultPreset: ThemePreset = DEFAULT_THEME_PRESET;
  private isDark = false;

  constructor(@Inject(DOCUMENT) private document: Document) {}

  initializeFromStorage(): void {
    this.applyPreset(this.readStoredPreset());
  }

  applyPreset(presetName?: string | null): void {
    const normalized =
      typeof presetName === 'string' && presetName.trim()
        ? presetName.trim()
        : this.defaultPreset;
    const preset = normalized === 'Dark' ? 'Dark' : 'Light';
    this.persistPreset(preset);
    this.setDarkMode(preset === 'Dark');
  }

  setDarkMode(enable: boolean): void {
    if (this.isDark === enable) {
      return;
    }

    this.isDark = enable;
    const docEl = this.document.documentElement;
    const body = this.document.body;

    if (enable) {
      const link = this.ensureDarkStylesheet();
      link.disabled = false;
      docEl.classList.add('mat-dark-theme');
      body?.classList.add('mat-dark-theme');
      docEl.style.colorScheme = 'dark';
      return;
    }

    const link = this.getDarkStylesheet();
    if (link) {
      link.disabled = true;
    }
    docEl.classList.remove('mat-dark-theme');
    body?.classList.remove('mat-dark-theme');
    docEl.style.colorScheme = '';
  }

  private persistPreset(preset: ThemePreset): void {
    const storage = this.getStorage();
    if (!storage) return;
    try {
      storage.setItem(this.storageKey, preset);
    } catch {
      // ignore storage failures (private mode / quota)
    }
  }

  private readStoredPreset(): ThemePreset | null {
    const storage = this.getStorage();
    if (!storage) return null;
    try {
      const value = storage.getItem(this.storageKey);
      if (value === 'Dark' || value === 'Light') {
        return value;
      }
    } catch {
      return null;
    }
    return null;
  }

  private getStorage(): Storage | null {
    try {
      return typeof window !== 'undefined' ? window.localStorage : null;
    } catch {
      return null;
    }
  }

  private getDarkStylesheet(): HTMLLinkElement | null {
    return this.document.getElementById(this.darkThemeId) as HTMLLinkElement | null;
  }

  private ensureDarkStylesheet(): HTMLLinkElement {
    let link = this.getDarkStylesheet();
    if (!link) {
      link = this.document.createElement('link');
      link.id = this.darkThemeId;
      link.rel = 'stylesheet';
      link.href = this.darkThemeHref;
      link.media = 'all';
      this.document.head.appendChild(link);
    }
    return link;
  }
}
