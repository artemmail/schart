# FootPrintComponent refactor proposals

## Current architectural constraints
- `FootPrintComponent` mixes view orchestration, data loading, presets, CSV export, visibility tracking, and SignalR wiring in one class, leaving many public fields and mutable state (`views`, `movedView`, matrices, hint DOM node) tightly coupled to render flow. The component also calls services directly during initialization and resize without clear lifecycle boundaries.【F:Angular/mat/src/app/components/footprint/footprint.component.ts†L41-L200】
- `ViewsManager` still hardcodes imports, fields, and instantiation for every view type (`viewMain`, `viewBackground1`, `viewDelta` etc.), so adding a new indicator requires editing this file and the component rather than registering through a contract or factory.【F:Angular/mat/src/app/components/footprint/ViewsManager.ts†L1-L137】

## Suggested refactor directions
1. **Split responsibilities into scoped services**
   - Move data lifecycle (preset selection, `ServerRequest`, `SignalR` subscribe/unsubscribe, visibility observer) into a dedicated `FootprintDataService` with an internal state machine and observables for view updates. Keep the component lean: only view binding and DI wiring.【F:Angular/mat/src/app/components/footprint/footprint.component.ts†L175-L200】
   - Extract CSV export and preset reloading into a small utility service or standalone functions to avoid coupling rendering state to export logic.【F:Angular/mat/src/app/components/footprint/footprint.component.ts†L131-L183】

2. **Introduce a pluggable indicator registry**
   - Replace the explicit imports/fields in `ViewsManager` with an `IndicatorDescriptor` interface (id, factory, sizing needs, optional config UI). Provide a registry token so additional indicators can be declared via DI providers or configuration rather than editing the manager.【F:Angular/mat/src/app/components/footprint/ViewsManager.ts†L1-L137】
   - Build views from the registry at runtime, populating `views` and `resizeable` arrays dynamically. This opens a path for external “ATAS-like” indicators and reduces merge conflicts when adding new views.【F:Angular/mat/src/app/components/footprint/ViewsManager.ts†L34-L52】

3. **Separate layout calculation from drawing**
   - Encapsulate rectangle and matrix calculations in a `LayoutService` that takes canvas metrics and `ChartSettings`, returning a layout DTO consumed by views. This simplifies testing of layout rules and decouples sizing logic from view instantiation.【F:Angular/mat/src/app/components/footprint/ViewsManager.ts†L74-L195】
   - Cache layout/matrix results and only recompute on meaningful changes (size, preset, data range) to avoid redundant `genViews` + `alignMatrix` calls on every resize.

4. **Unify input events and interaction state**
   - Keep `MouseAndTouchManager` as the single dispatcher; expose a small event bus (e.g., `Subject<PointerEventPayload>`) so individual views can subscribe without shared mutable fields like `movedView` on the component.【F:Angular/mat/src/app/components/footprint/footprint.component.ts†L63-L80】
   - Normalize zoom/drag gestures into high-level commands (pan cluster, change period, highlight price) so new indicators can react without needing raw DOM handlers.

5. **Explicit lifecycle and cleanup**
   - Implement `OnDestroy` with teardown of SignalR, visibility observer, and any registry subscriptions to prevent leaks once responsibilities are moved into services. Couple initialization to `ngAfterViewInit`/`OnChanges` instead of ad-hoc flags like `initializationStarted`/`inited`.

6. **Configuration clarity**
   - Introduce a typed `FootprintViewConfig` that aggregates `ChartSettings`, preset metadata, and runtime toggles (`minimode`, `deltamode`). Pass this object through services and views instead of scattering scalar `Input` props and service calls across the component.

These steps keep the existing rendering logic intact while opening a path for plug-in indicators and easier maintenance.
