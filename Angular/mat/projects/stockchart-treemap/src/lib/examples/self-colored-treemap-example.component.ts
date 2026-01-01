import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { TreeMapComponent } from '../tree-map/tree-map.component';
import { TreeMapOptions } from '../tree-map/tree-map.models';
import { MockTreemapNode, createPerformanceTreemap, performanceColorScale } from './mock-data';

@Component({
  selector: 'app-self-colored-treemap-example',
  standalone: true,
  imports: [CommonModule, TreeMapComponent],
  templateUrl: './self-colored-treemap-example.component.html',
  styleUrls: ['./self-colored-treemap-example.component.css']
})
export class SelfColoredTreemapExampleComponent {
  data: MockTreemapNode[] = createPerformanceTreemap();

  treemapOptions: Partial<TreeMapOptions> = {
    textField: 'name',
    valueField: 'value',
    colorField: 'color',
    colorValueField: 'change',
    childrenField: 'items',
    colorScale: performanceColorScale,
    showTopLevelTitles: true,
    titleSize: 22,
    colors: []
  };
}
