import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TreeMapComponent } from '../tree-map/tree-map.component';
import { MoneyToStrPipe } from 'src/app/pipes/money-to-str.pipe';
import { MarketMapSquare } from 'src/app/service/reports.service';

@Component({
  standalone: true,
  selector: 'app-sector-mini-treemap',
  templateUrl: './sector-mini-treemap.component.html',
  styleUrls: ['./sector-mini-treemap.component.css'],
  imports: [CommonModule, TreeMapComponent, MoneyToStrPipe],
})
export class SectorMiniTreemapComponent {
  private sectorItems: MarketMapSquare[] = [];
  private sectorTitle: string | null = null;

  @Input() set data(value: MarketMapSquare[] | null) {
    this.sectorItems = value ?? [];
    this.treeData = this.buildTreeData();
  }

  @Input() set sectorName(value: string | null) {
    this.sectorTitle = value ?? null;
    this.treeData = this.buildTreeData();
  }

  treeData: Array<{ name: string; value: number; items: MarketMapSquare[] }> = [];

  options = {
    type: 'squarified' as const,
    textField: 'name',
    valueField: 'value',
    colorField: 'color',
    childrenField: 'items',
    titleSize: 24,
    showTopLevelTitles: true,
    deriveParentValueFromChildren: true,
    minTileSize: 2,
    roundDecimals: 2,
    colors: ['#5B8FF9', '#5AD8A6', '#5D7092', '#F6BD16', '#E8684A', '#6DC8EC'],
  };

  private buildTreeData() {
    if (!this.sectorItems?.length) {
      return [];
    }
    const value = this.sectorItems.reduce((sum, item) => sum + (item.value ?? 0), 0);
    return [
      {
        name: this.sectorTitle ?? '',
        value,
        items: this.sectorItems,
      },
    ];
  }
}
