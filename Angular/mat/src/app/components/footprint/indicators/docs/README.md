# Footprint Indicator System

This document describes the indicator system used by the Footprint chart (registry + engine + UI), and provides a concise reference for every built-in indicator.

## System Overview

Key files:
- `src/app/components/footprint/indicators/indicator-api.ts` (types + parameter schema)
- `src/app/components/footprint/indicators/indicator-registry.ts` (definition registry)
- `src/app/components/footprint/indicators/indicator-engine.ts` (runtime + calc)
- `src/app/components/footprint/indicators/builtins/register-builtins.ts` (built-ins list)
- `src/app/components/footprint/components/footprint-settings-dialog/footprint-settings-dialog.component.*` (UI)
- `src/app/models/ChartSettings.ts` (`ChartSettings.Indicators` + `IndicatorPanels` persistence)

### Data model
- **IndicatorDefinition** (static metadata):
  - `type`, `displayName`, `category`
  - `defaultPanel`: `'chart' | 'newPanel'`
  - `panelBehavior`: `'fixed' | 'configurable'`
  - `paramsSchema`: `ParamSchema` for UI + defaults
  - `create(ctx, params)` returns an **IndicatorInstance**
- **IndicatorInstance** (runtime):
  - `params`, `panel`, `series[]`, `warmupPeriod`
  - `onCalculate(bar)` called per bar
  - `onParamsChanged(next)` to recalc / update series
- **DataSeries** controls rendering: `visual` (Line/Histogram/Points), `color`, `width`, `lineStyle`, etc.

### Settings persistence
`ChartSettings.Indicators` stores the list of active indicators (type + params + panel + visible). `IndicatorPanels` stores per-panel height.

### UI generation
`FootPrintSettingsDialog` reads `paramsSchema` and renders controls automatically:
- `int`, `float` -> numeric input
- `bool` -> checkbox
- `color` -> color input
- `enum` -> select

### Panel behavior
- `panelBehavior: 'fixed'` locks the indicator to `defaultPanel`.
- `panelBehavior: 'configurable'` lets the user move between chart and custom panels.

### Adding a new indicator
1. Create a definition in `builtins/*.indicator.ts` implementing `IndicatorDefinition`.
2. Add a `paramsSchema` with defaults for UI.
3. Implement `create()` using `ctx.source()` and fill `DataSeries.values`.
4. Register it in `builtins/register-builtins.ts`.

## Built-in Indicator Reference

Each entry lists: **type** (settings key), **panel**, **series**, and **params**.

### SMA
- **type:** `sma`, **panel:** chart (fixed), **series:** 1 line
- **Purpose:** Simple moving average of selected price source.
- **Params:** `source`, `period`, `color`, `width`.

### EMA
- **type:** `ema`, **panel:** chart (fixed), **series:** 1 line
- **Purpose:** Exponential moving average with optional bar offset.
- **Params:** `source`, `period`, `offset`, `color`, `width`, `lineStyle`.

### WMA
- **type:** `wma`, **panel:** chart (fixed), **series:** 1 line
- **Purpose:** Weighted moving average with linear weights (1..period), optional offset.
- **Params:** `source`, `period`, `offset`, `color`, `width`, `lineStyle`.

### RMA (SMMA)
- **type:** `rma`, **panel:** chart (fixed), **series:** 1 line
- **Purpose:** Wilder/RMA smoothing: `rma = (prev*(p-1) + src) / p`.
- **Params:** `source`, `period`, `offset`, `color`, `width`, `lineStyle`.

### Volume
- **type:** `volume`, **panel:** new panel (fixed), **series:** 2 stacked histograms
- **Purpose:** Ask/Bid volume split by `askVolume` and `bidVolume`.
- **Params:** `widthRatio`, `askColor`, `bidColor`.

### Bollinger Bands
- **type:** `bb`, **panel:** chart (fixed), **series:** 3 lines (middle/upper/lower)
- **Purpose:** SMA basis + `mult * stdev` bands.
- **Params:** `source`, `period`, `mult`, `middleColor`, `upperColor`, `lowerColor`, `width`.

### VWAP
- **type:** `vwap`, **panel:** chart (fixed), **series:** 1-3 lines
- **Purpose:** Anchored VWAP (session/day/week/month) with optional bands.
- **Bands:** either stdev or percent from VWAP.
- **Params:** `anchor`, `priceSource`, `showBands`, `bandMode`, `bandValue`, `color`, `bandColor`, `width`, `lineStyle`.

### Donchian Channels
- **type:** `donchian`, **panel:** chart (fixed), **series:** 2-3 lines
- **Purpose:** Highest high / lowest low over `period`, optional middle.
- **Params:** `period`, `showMiddle`, `upperColor`, `lowerColor`, `middleColor`, `width`, `lineStyle`.

### Keltner Channels
- **type:** `keltner`, **panel:** chart (fixed), **series:** 3 lines
- **Purpose:** MA basis (EMA or SMA) +/- ATR * multiplier.
- **Params:** `maLength`, `atrLength`, `maSource`, `atrMultiplier`, `maType`, `basisColor`, `upperColor`, `lowerColor`, `width`, `lineStyle`.

### SuperTrend
- **type:** `supertrend`, **panel:** chart (fixed), **series:** 1-2 lines
- **Purpose:** ATR-based trend line; optionally split into up/down colors.
- **Params:** `atrLength`, `multiplier`, `source`, `showTrendColoring`, `upColor`, `downColor`, `width`, `lineStyle`.

### Parabolic SAR
- **type:** `psar`, **panel:** chart (fixed), **series:** 1-2 point series
- **Purpose:** Parabolic SAR dots; optional reversal markers.
- **Params:** `step`, `maxStep`, `dotSize`, `color`, `highlightReversals`.

### Pivot Points
- **type:** `pivot`, **panel:** chart (fixed), **series:** 3-7 lines
- **Purpose:** P/R/S levels from previous period (Daily/Weekly/Monthly).
- **Methods:** Classic, Fibonacci, Camarilla, Woodie.
- **Params:** `timeframe`, `method`, `levels`, `showLabels` (reserved), `extend`, colors, `width`, `lineStyle`.

### Previous Day Levels
- **type:** `prevday`, **panel:** chart (fixed), **series:** up to 4 lines
- **Purpose:** Prev High/Low/Close + Today Open.
- **Params:** `showPrevHigh`, `showPrevLow`, `showPrevClose`, `showTodayOpen`, `extend`, colors, `width`, `lineStyle`.

### Opening Range
- **type:** `openingrange`, **panel:** chart (fixed), **series:** 2-3 lines
- **Purpose:** Opening range high/low (optional mid) for a session window.
- **Params:** `sessionMode`, `customStartHour`, `customStartMinute`, `durationMode`, `durationBars`, `extend`, `showMid`, colors, `width`, `lineStyle`.

### Fractals
- **type:** `fractals`, **panel:** chart (fixed), **series:** 2 point series
- **Purpose:** Marks local highs/lows with left/right bar confirmation.
- **Params:** `leftBars`, `rightBars`, `markerStyle`, `upColor`, `downColor`, `size`.

### ZigZag
- **type:** `zigzag`, **panel:** chart (fixed), **series:** 1 line
- **Purpose:** Connects pivots based on deviation + depth/backstep.
- **Params:** `deviationMode`, `deviation`, `depth`, `backstep`, `showPivotLabels` (reserved), `color`, `width`, `lineStyle`.

### Stochastic Oscillator
- **type:** `stochastic`, **panel:** new panel (fixed), **series:** 2-4 lines (`%K`, `%D`, optional 20/80 levels)
- **Purpose:** Momentum oscillator based on close position inside recent high/low range.
- **Formula:** `%K(raw) = 100 * (C - LL(kPeriod)) / (HH(kPeriod) - LL(kPeriod))`,
  then `%K = SMA(%K(raw), smoothK)`, `%D = SMA(%K, dPeriod)`.
- **Params:** `kPeriod`, `smoothK`, `dPeriod`, `showLevels`, `overbought`, `oversold`, `kColor`, `dColor`, `levelsColor`, `width`, `levelsWidth`, `lineStyle`, `levelsLineStyle`.

### MidPrice OI CumWeighted
- **type:** `midprice-oi-cumweighted`, **panel:** chart (fixed), **series:** 1 line
- **Purpose:** Cumulative weighted mid-price using OI delta:
  - `mid = (open + close) / 2`
  - `cumV += dOI * mid`
  - `cumOi += dOI`
  - output = `cumV / cumOi` (close-only update)
- **Params:** `color`, `width`.

## Notes for Codex
- Use `paramsSchema` as the single source of truth for UI controls.
- Indicator recalculation is centralized in `indicator-engine.ts` (warmup, append/update modes).
- If you add an indicator that needs its own panel, set `defaultPanel: 'newPanel'` and `panelBehavior: 'fixed'`.
- Panels can use a fixed Y-scale when every visible series provides `fixedRange` (used by `stochastic` for 0..100).
