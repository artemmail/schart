import { Injectable, isDevMode } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import {
  STOCK_CHART_DEFAULT_PALETTE,
  StockChartPalette,
  StockChartTheme,
} from './theme.model';

const CSS_VARS: Record<keyof StockChartPalette, string> = {
  bg: '--sc-bg',
  grid: '--sc-grid',
  gridMinor: '--sc-grid-minor',
  gridFaint: '--sc-grid-faint',
  gridSoft: '--sc-grid-soft',
  gridZero: '--sc-grid-zero',
  text: '--sc-text',
  textMuted: '--sc-text-muted',
  axis: '--sc-axis',
  up: '--sc-up',
  down: '--sc-down',
  upStrong: '--sc-up-strong',
  downStrong: '--sc-down-strong',
  upSoft: '--sc-up-soft',
  downSoft: '--sc-down-soft',
  upStrongSoft: '--sc-up-strong-soft',
  downStrongSoft: '--sc-down-strong-soft',
  upFaint: '--sc-up-faint',
  downFaint: '--sc-down-faint',
  upBorder: '--sc-up-border',
  downBorder: '--sc-down-border',
  bid: '--sc-bid',
  ask: '--sc-ask',
  accent: '--sc-accent',
  accentSoft: '--sc-accent-soft',
  selection: '--sc-selection',
  crosshair: '--sc-crosshair',
  labelBg: '--sc-label-bg',
  labelText: '--sc-label-text',
  scroll: '--sc-scroll',
  scrollGradient: '--sc-scroll-gradient',
  panel: '--sc-panel',
  heatLow: '--sc-heat-low',
  heatMid: '--sc-heat-mid',
  heatHigh: '--sc-heat-high',
};

type ThemeChange = { hostEl: HTMLElement; palette: StockChartPalette };

@Injectable({
  providedIn: 'root',
})
export class ColorSchemeService {
  private readonly paletteCache = new WeakMap<HTMLElement, StockChartPalette>();
  private readonly themeChangedSubject = new Subject<ThemeChange>();

  readonly themeChanged$: Observable<ThemeChange> = this.themeChangedSubject.asObservable();

  readPalette(hostEl: HTMLElement): StockChartPalette {
    const computed = getComputedStyle(hostEl);
    const palette = this.buildPalette(computed);
    this.paletteCache.set(hostEl, palette);
    return palette;
  }

  getPalette(hostEl: HTMLElement): StockChartPalette {
    return this.paletteCache.get(hostEl) ?? this.readPalette(hostEl);
  }

  applyTheme(hostEl: HTMLElement, theme: StockChartTheme): StockChartPalette {
    const style = hostEl.style;
    (Object.keys(theme) as Array<keyof StockChartTheme>).forEach((key) => {
      const value = theme[key];
      if (value == null) return;
      const cssVar = CSS_VARS[key as keyof StockChartPalette];
      if (!cssVar) return;
      style.setProperty(cssVar, String(value));
    });
    const palette = this.readPalette(hostEl);
    this.themeChangedSubject.next({ hostEl, palette });
    return palette;
  }

  exportTheme(hostEl: HTMLElement): StockChartTheme {
    return { ...this.getPalette(hostEl) };
  }

  resetTheme(hostEl: HTMLElement): StockChartPalette {
    const style = hostEl.style;
    (Object.values(CSS_VARS) as string[]).forEach((cssVar) => style.removeProperty(cssVar));
    const palette = this.readPalette(hostEl);
    this.themeChangedSubject.next({ hostEl, palette });
    return palette;
  }

  setPreset(hostEl: HTMLElement, presetName: string): StockChartPalette {
    const normalized = (presetName ?? '').trim();
    if (!normalized || normalized === 'Light') {
      return this.resetTheme(hostEl);
    }
    const preset = PRESETS[normalized];
    if (!preset) {
      if (isDevMode()) {
        // eslint-disable-next-line no-console
        console.warn(`ColorSchemeService: preset "${presetName}" not found`);
      }
      return this.getPalette(hostEl);
    }
    return this.applyTheme(hostEl, preset);
  }

  private buildPalette(computed: CSSStyleDeclaration): StockChartPalette {
    const palette = { ...STOCK_CHART_DEFAULT_PALETTE };
    (Object.keys(CSS_VARS) as Array<keyof StockChartPalette>).forEach((key) => {
      const value = computed.getPropertyValue(CSS_VARS[key]).trim();
      if (value) {
        palette[key] = value;
      }
    });
    return palette;
  }
}

const PRESETS: Record<string, StockChartTheme> = {
  Light: {},
  Dark: {
    bg: '#0b0f19',
    grid: 'rgba(255,255,255,0.12)',
    gridMinor: 'rgba(255,255,255,0.06)',
    gridFaint: 'rgba(255,255,255,0.04)',
    gridSoft: 'rgba(255,255,255,0.2)',
    gridZero: 'rgba(255,255,255,0.18)',
    text: 'rgba(255,255,255,0.92)',
    textMuted: 'rgba(255,255,255,0.72)',
    axis: 'rgba(255,255,255,0.6)',
    panel: '#121826',
  },
};
