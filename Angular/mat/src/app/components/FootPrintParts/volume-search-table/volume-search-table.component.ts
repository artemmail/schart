import {
  AfterViewInit,
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import {
  ClusterStreamService,
  VolumeSearchResult,
} from 'src/app/service/FootPrint/ClusterStream/cluster-stream.service';
import { FootPrintComponent } from '../../footprint/footprint.component';

export interface VolumeSearchParams {
  ticker: string;
  period: number;
  priceStep: number;
  startDate: Date;
  endDate: Date;
}

@Component({
  selector: 'app-volume-search-table',
  templateUrl: './volume-search-table.component.html',
  styleUrls: ['./volume-search-table.component.css'],
})
export class VolumeSearchTableComponent
  implements OnChanges, AfterViewInit
{
  @Input() NP: FootPrintComponent;
  displayedColumns: string[] = [
    'Time',
    'Price',
    'MaxVolume',
    'TotalVolume',
    'BarSize',
    'Trades',
    'Ask',
    'Bid',
    'Delta',
  ];
  dataSource = new MatTableDataSource<VolumeSearchResult>();
  isLoading = true;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  constructor(private clusterStreamService: ClusterStreamService) {}

  ngOnChanges(changes: SimpleChanges) {
    // Проверяем, изменилось ли входное свойство NP
    if (changes.NP && this.NP && this.NP.params) {
      this.refresh();
    }
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  refresh() {
    this.isLoading = true;
    const searchParams = this.NP.params;
    this.clusterStreamService
      .volumeSearch(
        searchParams.ticker,
        searchParams.period,
        searchParams.priceStep,
        searchParams.startDate,
        searchParams.endDate
      )
      .subscribe(
        (data) => {
          this.dataSource.data = data;
          this.isLoading = false;
        },
        (error) => {
          console.error('Ошибка при получении данных', error);
          this.isLoading = false;
        }
      );
  }
}
