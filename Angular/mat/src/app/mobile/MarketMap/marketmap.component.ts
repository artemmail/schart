import { Component } from '@angular/core';
import { StockChartTreemapComponent } from 'src/app/components/Controls/stockChart-treemap/stockChart-treemap.component';


@Component({
  standalone: true,
  selector: 'mobile-marketmap',
  templateUrl: './marketmap.component.html',
  styleUrl: './marketmap.component.css',
  imports: [StockChartTreemapComponent]
})
export class MarketMapComponent {}


