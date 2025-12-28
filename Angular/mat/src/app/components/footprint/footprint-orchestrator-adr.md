# Footprint widget orchestrator (draft ADR)

## Purpose
This note captures the current data and realtime entry points inside `components/footprint` and sketches the target orchestrator contract that will sit between the widget wrapper and the canvas renderer.

## Current entry points
- **Range data & params** (`footprint-data-loader.service.ts`)
  - `initialize(params, presetIndex, options)` stores params, loads presets, resolves chart settings via `ChartSettingsService`, triggers `LevelMarksService.load`, and issues the range request through `ClusterStreamService.GetRange`, emitting the resulting `ClusterData` via `data$`.
  - `reload(params)` reuses `applySettingsAndLoadData` for a new parameter set; the service keeps the last `ClusterData` instance in `currentData` for realtime merging.
  - `params$`, `settings$`, and `presets$` streams are consumed by the widget to drive the renderer inputs (see below).
- **Realtime** (`footprint-realtime-updater.service.ts`)
  - `configure(params, options)` evaluates whether realtime should be active (skipping historical ranges), subscribes to SignalR streams, and reuses `FootprintDataLoaderService.applyRealtimeUpdate` to merge incoming `cluster`/`ticks`/`ladder` payloads into the current dataset.
  - Emits normalized `FootprintUpdateEvent` objects via `updates$` after each merge; visibility is tracked through an `IntersectionObserver` so subscriptions are paused when the canvas is off-screen.
- **Widget-to-renderer bindings** (`footprint-widget.component.ts`)
  - After view init, `connectDataStreams` wires `data$` → `applyData`, `settings$` → `applySettings`, `params$` → `applyParams`, and `updates$` → `handleRealtimeUpdate` on `FootPrintComponent`.
  - `initializeDataFlow` drives the initial `initialize` + realtime `configure` cycle; `reload` reuses the same pattern when params change.

## Target orchestrator contract
The new orchestrator layer should consume domain events and emit renderer commands, keeping rendering concerns isolated:
- **Inputs**
  - `applySnapshotRange(params, presets?, settings?, data: ClusterData)` – full range snapshot (from data loader) aligned with the active params.
  - `applyRealtimeDelta(update: FootprintUpdateEvent)` – realtime `cluster`/`ticks`/`ladder` deltas already merged into the current dataset by the data services.
  - `updateParams(params: FootPrintParameters)` and `updateSettings(settings: ChartSettings)` – explicit control changes from the host UI or preset selection.
- **Outputs to renderer**
  - `applySnapshot(data, params, settings)` – push a fresh dataset and config to the canvas renderer before layout.
  - `applyDelta(update)` – forward realtime changes that require visual refresh without reloading the whole snapshot.
  - `resize(containerRect?)` – notify renderer about container or window resize events.
  - `draw(reason)` – request an explicit redraw (e.g., after post-init alignment or external commands) without reapplying data.

## Roles and responsibilities
- **Widget (host component)** – handles Angular lifecycle, forwards user inputs (params, minimode/deltamode, preset index), and coordinates preset reloads and resize observers.
- **Orchestrator (new)** – centralizes subscription wiring, debounces/queues renderer commands, and translates data/realtime/settings events into renderer calls; shields renderer from service specifics and visibility logic.
- **Renderer (`FootPrintComponent`)** – owns canvas layout and drawing; exposes `applyData`, `applySettings`, `applyParams`, `handleRealtimeUpdate`, and resize/draw helpers used by the orchestrator.
- **Data services (`FootprintDataLoaderService`, `FootprintRealtimeUpdaterService`)** – fetch and merge range/realtime data, surface settings/params/preset streams, manage SignalR lifecycle and visibility.
- **State service (`FootprintStateService`)** – stores the renderer-side state snapshot (data, params, settings, selection, deltas) used to keep rendering idempotent across async updates.

## Next steps
- Extract the current wiring from `FootprintWidgetComponent` into an orchestrator class/service.
- Adjust renderer API to match the command set (`applySnapshot`/`applyDelta` etc.) so the orchestrator can batch updates before issuing draw commands.
- Keep data loader and realtime updater APIs stable; orchestrator composes them and translates events to renderer commands.
