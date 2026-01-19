# Codex Notes: FootPrint Theme + Material Dark Mode

## Goal
Provide a local (per FootPrint host) color palette via CSS variables, add a Dark preset for the chart, and sync the global Angular Material theme to the same Light/Dark choice. Persist the choice in localStorage so it survives reloads and navigation.

## What was implemented

### 1) Theme tokens + palette model
File: `src/app/services/theme/theme.model.ts`
- Defines `StockChartTheme` (partial) and `StockChartPalette` (required).
- `STOCK_CHART_DEFAULT_PALETTE` contains fallback colors.

### 2) ColorSchemeService (chart palette runtime)
File: `src/app/services/theme/color-scheme.service.ts`
- Reads CSS variables from a host element (`readPalette`).
- Caches palette per element (WeakMap).
- Applies a partial theme via `hostEl.style.setProperty`.
- Emits `themeChanged$` on theme changes.
- `setPreset(hostEl, presetName)` supports:
  - `Light`: clears host inline overrides (reset to CSS defaults).
  - `Dark`: applies the preset in `PRESETS`.

### 3) FootPrint integration
Files:
- `src/app/components/footprint/components/footprint/footprint.component.ts`
- `src/app/components/footprint/components/footprint/footprint.component.css`
- Many view/column files in `src/app/components/footprint/**` now use `palette.*`.

Notes:
- `FootPrintComponent` reads palette on init and redraws on `themeChanged$`.
- `applyThemePreset(preset)`:
  - updates global Material theme (see below),
  - then applies FootPrint palette for the host element.
- Settings now include `ThemePreset`.

### 4) Settings dialog (Light/Dark selector)
Files:
- `src/app/components/footprint/components/footprint-settings-dialog/footprint-settings-dialog.component.ts`
- `src/app/components/footprint/components/footprint-settings-dialog/footprint-settings-dialog.component.html`

Adds a new tab “Appearance” with Light/Dark selector.
Calls `fp.applyThemePreset(...)` and persists settings.

### 5) Global Angular Material Dark theme
Files:
- `src/app/services/theme/material-theme.service.ts`
- `src/assets/material-themes/magenta-violet.css`
- `src/styles.css`

Behavior:
- On Dark: injects a stylesheet link for `assets/material-themes/magenta-violet.css`,
  adds `mat-dark-theme` class to `html` and `body`, and sets `color-scheme: dark`.
- On Light: disables the dark stylesheet and removes the class.

Styling:
- `styles.css` now uses Material system tokens:
  - `body` background and text use `--mat-sys-*`
  - `.box`, `.wblogblock` also use `--mat-sys-*`

### 6) Persistence in localStorage
Key: `uiThemePreset` (values: `Light` | `Dark`)

Files:
- `src/app/services/theme/material-theme.service.ts`
  - `applyPreset()` persists to localStorage.
  - `initializeFromStorage()` restores on app start.
- `src/app/app.component.ts` and `src/app/mobile/app.component.ts`
  - call `initializeFromStorage()` on init.
- `src/app/service/chart-settings.service.ts`
  - `normalizeSettings()` prioritizes stored preset over server settings.
  - `miniSettings()` / `DefaultSettings()` also use stored preset.

## Why theme could “reset” before
- Pages that build FootPrint in mini-mode (e.g., multi-chart pages)
  used `miniSettings()` which defaulted to `Light`. That overwrote the
  global theme. Now `miniSettings()` respects `uiThemePreset`.

## Key files touched
- `src/app/services/theme/theme.model.ts`
- `src/app/services/theme/color-scheme.service.ts`
- `src/app/services/theme/material-theme.service.ts`
- `src/app/components/footprint/components/footprint/footprint.component.ts`
- `src/app/components/footprint/components/footprint/footprint.component.css`
- `src/app/components/footprint/components/footprint-settings-dialog/*`
- `src/app/models/ChartSettings.ts`
- `src/app/service/chart-settings.service.ts`
- `src/styles.css`
- `src/assets/material-themes/magenta-violet.css`

## How to extend
1) Add new palette tokens:
   - Update `StockChartTheme` / `StockChartPalette` in `theme.model.ts`.
   - Add CSS variable mapping in `color-scheme.service.ts`.
   - Add defaults in `footprint.component.css`.
2) Add new chart presets:
   - Extend `PRESETS` in `color-scheme.service.ts`.
   - Add to settings dialog preset list.
3) Change global dark theme:
   - Replace `magenta-violet.css` in `src/assets/material-themes/`,
     update `darkThemeHref` in `material-theme.service.ts` if needed.

## Quick sanity checks
- Change theme in FootPrint settings -> UI + chart switch.
- Reload page -> theme preserved (localStorage `uiThemePreset`).
- Navigate to other routes -> theme stays consistent.

