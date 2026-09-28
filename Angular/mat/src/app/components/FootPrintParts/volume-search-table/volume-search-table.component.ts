import {
  AfterViewInit,
  Component,
  Input,
  OnChanges,
  OnDestroy,
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
import type { FootprintController } from '../../footprint/models/footprint-controller';
import { Subscription } from 'rxjs';
import { MaterialModule } from 'src/app/material.module';

export interface VolumeSearchParams {
  ticker: string;
  period: number;
  priceStep: number;
  startDate: Date;
  endDate: Date;
}

@Component({
  standalone: true,
  selector: 'app-volume-search-table',
  imports: [MaterialModule],
  templateUrl: './volume-search-table.component.html',
  styleUrls: ['./volume-search-table.component.css'],
})
export class VolumeSearchTableComponent
  implements OnChanges, AfterViewInit, OnDestroy
{
  private stateSubscription?: Subscription;
  private requestSubscription?: Subscription;
  private sessionId?: number;
  private loadedStatus?: 'ready' | 'empty';

  @Input() NP: FootprintController;
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

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['NP']) return;
    this.stateSubscription?.unsubscribe();
    this.requestSubscription?.unsubscribe();
    this.sessionId = undefined;
    this.stateSubscription = this.NP?.state$.subscribe(state => {
      if (state.status === 'ready' || state.status === 'empty') {
        if (this.sessionId === state.sessionId && this.loadedStatus === state.status) return;
        this.sessionId = state.sessionId;
        this.loadedStatus = state.status;
        this.refresh();
      } else {
        this.sessionId = undefined;
        this.requestSubscription?.unsubscribe();
        this.dataSource.data = [];
        this.isLoading = state.status === 'loading';
      }
    });
  }

  ngOnDestroy(): void {
    this.stateSubscription?.unsubscribe();
    this.requestSubscription?.unsubscribe();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  refresh() {
    this.requestSubscription?.unsubscribe();
    if (!this.NP?.params) { this.isLoading = false; return; }
    this.isLoading = true;
    const searchParams = this.NP.params;
    this.requestSubscription = this.clusterStreamService
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

