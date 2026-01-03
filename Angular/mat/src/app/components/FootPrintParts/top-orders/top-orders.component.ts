import {
  Component,
  OnInit,
  ViewChild,
  AfterViewInit,
  Input,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { ReportsService } from 'src/app/service/reports.service';
import { TopOrdersResult } from 'src/app/models/Barometer';
import { FootPrintComponent } from '../../footprint/components/footprint/footprint.component';
import { MaterialModule } from 'src/app/material.module';

@Component({
  standalone: true,
  selector: 'footprint-top-orders',
  imports: [MaterialModule],
  templateUrl: './top-orders.component.html',
  styleUrls: ['./top-orders.component.css'],
})
export class TopOrdersComponentFP implements OnInit, AfterViewInit, OnChanges {
  @Input() NP: FootPrintComponent; // Входное свойство для получения данных
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatPaginator) paginator: MatPaginator;

  displayedColumns: string[] = ['quantity', 'direction', 'tradeDate', 'price'];
  dataSource = new MatTableDataSource<TopOrdersResult>();

  constructor(private reportsService: ReportsService) {}

  ngOnInit(): void {
    // Инициализация: обновляем данные, если NP уже задан
    if (this.NP) {
      this.refresh();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Реагируем на изменения входного свойства NP
    if (changes.NP && !changes.NP.firstChange) {
      this.refresh(); // Обновляем данные при изменении NP
    }
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
  }

  refresh(): void {
    // Проверяем, что NP задан перед запросом данных
    if (this.NP && this.NP.params) {
      this.reportsService
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

