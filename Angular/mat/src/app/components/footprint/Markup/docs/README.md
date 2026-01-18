# Footprint Markup System

This document describes the modular markup (drawing) system used in the Footprint chart. It is intended as a reference for Codex and future edits.

## System Overview

Key files:
- `src/app/components/footprint/markup/markup-api.ts` (definitions + param schema)
- `src/app/components/footprint/markup/markup-registry.ts` (registry)
- `src/app/components/footprint/markup/markup-manager.ts` (runtime + selection)
- `src/app/components/footprint/markup/builtins/register-builtins.ts` (built-in markups)
- `src/app/components/footprint/components/markup-editor/*` (dynamic UI)

### Concepts
- **MarkupDefinition** describes a tool (icon, name, params, factory).
- **Shape** is the runtime object drawn on canvas.
- **MarkUpManager** owns the shape list, selection, and drawing lifecycle.
- **Param schema** drives all UI controls; there is no hard-coded UI for a specific markup.

### Param schema
Each field is defined in `MarkupParamSchema`:
- `type`: `int | float | bool | color | enum | text`
- `title`, `default`, optional `min/max/step`
- `palette` (for color pickers), `options` (for enum)
- `scope`: `instance` (default) or `tool`

`scope` matters:
- **instance** params are stored per shape (selecting a shape shows its values).
- **tool** params are stored per tool (global defaults), and do not change when selecting shapes.

### Tool vs instance state
- Tool defaults are stored in `MarkUpManager.toolParams`.
- When a new shape is created, its params are cloned from tool defaults.
- When a shape is selected, the editor binds to `shape.params`.
- Tool-scoped params (e.g., `Profile.profilePeriod`) are not overwritten when selecting a shape.

### UI generation
The markup editor (`markup-editor.component.html`) iterates over the active tool's schema and renders controls automatically:
- `color` -> palette picker or color input
- `int/float` -> numeric input
- `bool` -> checkbox
- `enum` -> select
- `text` -> textarea

### Built-in markups
See `markup/builtins/register-builtins.ts` for the authoritative list. Current tools:
- Edit
- Brush
- Line
- Rect
- Text
- Profile (manual profile box)
- Strength
- Fibonacci (angled channel with levels)

## Adding a new markup
1. Create a `Shape` subclass (e.g., `MyShape`):
   - Implement `onMouseDownMove`, `onMouseUp`, `drawShape`.
   - Use `this.params` for all configurable values.
   - Optional: override `selectedPoint` / `drawSelection` for custom edit handles.
2. Define a `MarkupDefinition` with:
   - `type`, `displayName`, `description`, `icon` (Material icon name)
   - `paramsSchema` (defaults + UI)
   - `create(manager, params)` factory
3. Register it in `markup/builtins/register-builtins.ts`.

## Runtime notes
- `MarkUpManager.drawAll()` is called each render pass.
- Selection + drag handling is done through `Shape.onStartMovePoint`/`onMovePoint`.
- For custom hit-testing, override `selectedPoint()` or `drawSelection()`.

## Tips
- Keep all configurable values in `params` (no direct model globals).
- If a value should be global for the tool, mark its field as `scope: 'tool'`.
- Use ASCII in docs and names for consistency.
