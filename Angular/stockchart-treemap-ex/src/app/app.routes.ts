import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'market-map' },
  {
    path: 'market-map',
    loadComponent: () =>
      import('./examples/market-map/market-map-example.component').then(
        (m) => m.MarketMapExampleComponent
      )
  },
  {
    path: 'self-colored',
    loadComponent: () =>
      import('./examples/self-colored/self-colored-treemap-example.component').then(
        (m) => m.SelfColoredTreemapExampleComponent
      )
  },
  {
    path: 'volatility-smile',
    loadComponent: () =>
      import('./examples/volatility-smile/volatility-smile.component').then(
        (m) => m.VolatilitySmileComponent
      )
  },
  { path: '**', redirectTo: 'market-map' }
];
