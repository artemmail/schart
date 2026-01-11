import {
  AfterViewInit,
  Component,
  Input,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';
import { ColumnEx } from 'src/app/models/Column';
import { MaterialModule } from 'src/app/material.module';
import { FootPrintComponent } from '../../footprint/components/footprint/footprint.component';
import { FootprintUtilitiesService } from '../../footprint/services/footprint-utilities.service';

@Component({
  standalone: true,
  selector: 'footprint-csv-table',
  imports: [MaterialModule],
  templateUrl: './footprint-csv-table.component.html',
  styleUrls: ['./footprint-csv-table.component.css'],
})
export class FootprintCsvTableComponent
  implements OnChanges, AfterViewInit
{
  @Input() NP?: FootPrintComponent;

  pageRows: ColumnEx[] = [];
  totalItems = 0;
  pageIndex = 0;
  pageSize = 50;
  pageSizeOptions = [20, 50, 100];
  displayedColumns: string[] = [];
  isTrades = false;
  directionByZero = false;
  hasData = false;
  private allRows: ColumnEx[] = [];
  private sortedRows: ColumnEx[] | null = null;

  private readonly candleColumns = [
    'time',
    'open',
    'high',
    'low',
    'close',
    'volume',
    'bidVolume',
    'quantity',
  ];
  private readonly tradeColumns = [
    'number',
    'time',
    'price',
    'quantity',
    'volume',
    'direction',
  ];
  private readonly tradeListColumns = [
    'time',
    'open',
    'close',
    'volume',
    'direction',
    'quantity',
  ];

  constructor(private footprintUtilities: FootprintUtilitiesService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['NP']) {
      this.refresh();
    }
  }

  ngAfterViewInit(): void {
    this.updatePage();
  }

  refresh(): void {
    const params = this.NP?.params;
    const data = this.NP?.data?.clusterData ?? [];

    if (!params || !data.length) {
      this.isTrades = false;
      this.directionByZero = false;
      this.hasData = false;
      this.displayedColumns = [...this.candleColumns];
      this.allRows = [];
      this.sortedRows = null;
      this.totalItems = 0;
      this.pageIndex = 0;
      this.pageRows = [];
      return;
    }

    this.directionByZero = params.period === 3;
    this.isTrades = params.period === 0 || this.directionByZero;
    const hasOpenInterest =
      (this.NP?.data?.maxOI ?? 0) !== 0 ||
      (this.NP?.data?.minOI ?? 0) !== 0;
    const columns = this.directionByZero
      ? this.tradeListColumns
      : this.isTrades
      ? this.tradeColumns
      : this.candleColumns;
    this.displayedColumns = hasOpenInterest
      ? [...columns, 'openInterest']
      : [...columns];

    this.allRows = data;
    this.sortedRows = null;
    this.totalItems = data.length;
    this.hasData = data.length > 0;
    this.pageIndex = 0;
    this.updatePage();
  }

  downloadCsv(): void {
    const params = this.NP?.params;
    const data = this.NP?.data;
    if (!params || !data) {
      return;
    }

    this.footprintUtilities.exportCsv(params, data);
  }

  onPage(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.updatePage();
  }

  onSortChange(sort: Sort): void {
    if (!sort.direction) {
      this.sortedRows = null;
      this.pageIndex = 0;
      this.updatePage();
      return;
    }

    const direction = sort.direction === 'asc' ? 1 : -1;
    this.sortedRows = [...this.allRows].sort((a, b) => {
      const valueA = this.getSortValue(a, sort.active);
      const valueB = this.getSortValue(b, sort.active);

      if (typeof valueA === 'string' || typeof valueB === 'string') {
        const aStr = String(valueA);
        const bStr = String(valueB);
        return aStr.localeCompare(bStr) * direction;
      }

      return ((valueA as number) - (valueB as number)) * direction;
    });
    this.pageIndex = 0;
    this.updatePage();
  }

  private updatePage(): void {
    const source = this.sortedRows ?? this.allRows;
    if (!source.length) {
      this.pageRows = [];
      return;
    }

    const start = this.pageIndex * this.pageSize;
    this.pageRows = source.slice(start, start + this.pageSize);
  }

  private getSortValue(item: ColumnEx, property: string): number | string {
    switch (property) {
      case 'number':
        return item.Number ?? 0;
      case 'time':
        return item.x?.getTime?.() ?? 0;
      case 'price':
      case 'open':
        return item.o ?? 0;
      case 'high':
        return item.h ?? 0;
      case 'low':
        return item.l ?? 0;
      case 'close':
        return item.c ?? 0;
      case 'quantity':
        return item.q ?? 0;
      case 'volume':
        return item.v ?? 0;
      case 'bidVolume':
        return item.bv ?? 0;
      case 'direction':
        return item.bq ?? 0;
      case 'openInterest':
        return item.oi ?? 0;
      default:
        return '';
    }
  }
}
