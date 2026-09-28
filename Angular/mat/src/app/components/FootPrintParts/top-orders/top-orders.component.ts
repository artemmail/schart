import {
  Component,
  ViewChild,
  AfterViewInit,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
} from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { ReportsService } from 'src/app/service/reports.service';
import { TopOrdersResult } from 'src/app/models/Barometer';
import type { FootprintController } from '../../footprint/models/footprint-controller';
import { Subscription } from 'rxjs';
import { MaterialModule } from 'src/app/material.module';

@Component({
  standalone: true,
  selector: 'footprint-top-orders',
  imports: [MaterialModule],
  templateUrl: './top-orders.component.html',
  styleUrls: ['./top-orders.component.css'],
})
export class TopOrdersComponentFP implements AfterViewInit, OnChanges, OnDestroy {
  private stateSubscription?: Subscription;
  private requestSubscription?: Subscription;
  private sessionId?: number;
  private loadedStatus?: 'ready' | 'empty';

  @Input() NP: FootprintController; // Входное свойство для получения данных
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatPaginator) paginator: MatPaginator;

  displayedColumns: string[] = ['quantity', 'direction', 'tradeDate', 'price'];
  dataSource = new MatTableDataSource<TopOrdersResult>();

  constructor(private reportsService: ReportsService) {}

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
      }
    });
  }

  ngOnDestroy(): void {
    this.stateSubscription?.unsubscribe();
    this.requestSubscription?.unsubscribe();
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
  }

  refresh(): void {
    // Проверяем, что NP задан перед запросом данных
    if (this.NP && this.NP.params) {
      this.requestSubscription?.unsubscribe();
      this.requestSubscription = this.reportsService
        .getTopOrdersPeriod(
          this.NP.params.ticker,
          this.NP.params.startDate,
          this.NP.params.endDate
        )
        .subscribe((data) => {
          this.dataSource.data = data; // Обновляем источник данных таблицы
        });
    }
  }
}

