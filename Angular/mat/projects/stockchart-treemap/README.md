# stockchart-treemap

Standalone TreeMap for Angular: no external runtime dependencies, color scaling by values, custom templates, and multiple data sources. Great for market heatmaps, portfolios, resource hierarchies, or any weighted tree.

## Demo
- StackBlitz: https://stackblitz.com/edit/stackblitz-starters-drgync8z?file=README.md

## Features
- Angular 20+ standalone component, no Kendo UI or extra runtimes.
+- Three data source modes: array, `Observable`, or loader function with optional polling.
_- Palette or value-driven colors (`colorScale` with `min`/`center`/`max`), automatic shades for nested nodes._
_- Custom tile and title templates; control showing top-level titles._
_- Click/hover events with the full path to the node; `refreshNow()` for manual refresh._
_- Layout choices: `squarified` (default) or slice-and-dice (`horizontal` / `vertical`)._

## Install
```bash
npm install stockchart-treemap
```
Peer deps: `@angular/core` and `@angular/common` 20.x.

## Quick start
```ts
import { Component } from '@angular/core';
import { TreeMapComponent, TreeMapOptions } from 'stockchart-treemap';

@Component({
  standalone: true,
  selector: 'app-treemap-demo',
  imports: [TreeMapComponent],
  template: `
    <stockchart-treemap
      [data]="data"
      [options]="options">
    </stockchart-treemap>
  `
})
export class TreemapDemoComponent {
  data = [
    { name: 'Tech', value: 35, change: 4.2, items: [
      { name: 'A', value: 20, change: 5.1 },
      { name: 'B', value: 15, change: 2.0 }
    ]},
    { name: 'Energy', value: 25, change: -3.4 },
    { name: 'Health', value: 18, change: 1.6 }
  ];

  options: Partial<TreeMapOptions> = {
    textField: 'name',
    valueField: 'value',
    colorValueField: 'change',
    colorScale: { min: '#E53935', center: '#F5F5F5', max: '#2E7D32' },
    colors: [] // keep empty to rely on colorScale
  };
}
```

## Data sources
- `data`: plain array.
- `data$`: `Observable<T[]>`; the component subscribes and re-renders on updates.
- `loader`: function returning an array / `Promise` / `Observable`; optionally poll with `refreshMs`.

```ts
loader = () => this.http.get<Item[]>('/api/treemap');
refreshMs = 5000; // poll every 5s
```

## Colors and scales
- Palette: `colors: ['#5B8FF9', '#5AD8A6', ...]` or pairs `[min, max]` to generate a gradient per level.
- Value-driven gradient: `colorScale: { min, center?, max }` + `colorValueField` (defaults to `valueField`).
- If your data has no `color` field, the shade is computed automatically.

## Layouts
- `type: 'squarified'` (default, aims for square tiles).
- `type: 'horizontal' | 'vertical'` — slice-and-dice with alternating orientation by level.

## Custom templates
```html
<stockchart-treemap
  [data]="data"
  [options]="options"
  [tileTemplate]="tile"
  [titleTemplate]="title"
  (tileClick)="onTile($event)">
</stockchart-treemap>

<ng-template #title let-item let-node="node">
  <div class="title">{{ item.name }} · {{ node.value | number:'1.0-0' }}</div>
</ng-template>

<ng-template #tile let-item let-isLeaf="isLeaf">
  <div class="tile">
    <strong>{{ item.name }}</strong>
    <span *ngIf="isLeaf">{{ item.change }}%</span>
  </div>
</ng-template>
```

## Events
```ts
import { TreeMapEvent } from 'stockchart-treemap';

onTile(ev: TreeMapEvent<MyNode>) {
  // ev.dataItem — your original object
  // ev.path — chain of data items from root to the node
  console.log(ev);
}
```

## Key options
- `textField` / `valueField` / `colorField` / `childrenField` — fields in your data (`name`/`value`/`color`/`items` by default).
- `colorValueField` — field used for colorScale calculations (defaults to `valueField`).
- `colors` — palette of strings or `[min, max]` pairs; empty array enables gray fallback.
- `titleSize` (px), `showTopLevelTitles` (bool) — title rendering control.
- `deriveParentValueFromChildren` — if a container has no value, sum is derived from children.
- `roundDecimals` — coordinate rounding; `minTileSize` — minimum tile size to recurse.

## Exports
Package exports: `TreeMapComponent`, types `TreeMapOptions`, `TreeMapType`, `TreeMapColorScale`, and utilities like `projectColorByValue`, `colorsByLength`, `roundN` for working with colors and layout math.
