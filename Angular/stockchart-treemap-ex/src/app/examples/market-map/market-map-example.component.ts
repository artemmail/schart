import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { TreeMapComponent, TreeMapEvent, TreeMapOptions } from 'stockchart-treemap';
import { MockTreemapNode, createMockMarketMap, performanceColorScale } from '../../shared/mock-data';

@Component({
  selector: 'app-market-map-example',
  standalone: true,
  imports: [CommonModule, TreeMapComponent],
  templateUrl: './market-map-example.component.html',
  styleUrls: ['./market-map-example.component.css']
})
export class MarketMapExampleComponent {
  data: MockTreemapNode[] = createMockMarketMap();

  treemapOptions: Partial<TreeMapOptions> = {
    type: 'squarified',
    textField: 'name',
    valueField: 'value',
    colorField: 'color',
    colorValueField: 'change',
    childrenField: 'items',
    titleSize: 24,
    showTopLevelTitles: true,
    colorScale: performanceColorScale
  };

  hovered?: MockTreemapNode | null;
  selected?: MockTreemapNode | null;

  onTileHover(event: TreeMapEvent<MockTreemapNode>): void {
    this.hovered = event.dataItem;
  }

  onTileLeave(): void {
    this.hovered = null;
  }

  onTileClick(event: TreeMapEvent<MockTreemapNode>): void {
    this.selected = event.dataItem;
  }
}
