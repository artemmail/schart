import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { TreeMapComponent } from '../tree-map/tree-map.component';
import { TreeMapEvent, TreeMapOptions } from '../tree-map/tree-map.models';
import { MockTreemapNode, createMockMarketMap, performanceColorScale } from './mock-data';

@Component({
  selector: 'app-stockchart-treemap-example',
  standalone: true,
  imports: [CommonModule, TreeMapComponent],
  templateUrl: './app-stockchart-treemap-example.component.html',
  styleUrls: ['./app-stockchart-treemap-example.component.css']
})
export class AppStockchartTreemapExampleComponent {
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
