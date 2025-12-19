import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';

import { ReportsService, VolumeDashboardRow } from 'src/app/service/reports.service';
import { Title } from '@angular/platform-browser';

import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

@Component({
  selector: 'app-volume-dashboard',
  templateUrl: './volume-dashboard.component.html',
  styleUrls: ['./volume-dashboard.component.css'],
})
export class VolumeDashboardComponent implements OnInit {
  rows: VolumeDashboardRow[] = [];
  dataSource = new MatTableDataSource<VolumeDashboardRow>(this.rows);

  selectedMarket = 0;

  /** поля‑«средние», которые показываем мини‑графиком */
  private readonly avgKeys: (keyof VolumeDashboardRow)[] = [
    'avg3Days',
    'avg7Days',
    'avg30Days',
    'avg90Days',
    'avg180Days',
    'avg365Days',
  ];

  /** порядок колонок в таблице */
  displayedColumns: string[] = [
    'ticker',
    'volume1Day',
    ...this.avgKeys, // оставляем численные значения — если не нужны, удалите эту строку
    'avgBars',       // новая колонка‑график
  ];

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort)      sort!: MatSort;

  constructor(
    private reports: ReportsService,
    private title: Title,
  ) {
    this.title.setTitle('Дашборд объёмов торгов');
  }

  ngOnInit(): void {
    this.loadDashboard();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort      = this.sort;
  }

  onMarketChange(market: number): void {
    this.selectedMarket = market;
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.reports.getVolumeDashboard(this.selectedMarket).subscribe(data => {
      this.rows            = data;
      this.dataSource.data = this.rows;
    });
  }

  /* ---------- helpers для мини‑графика ---------- */

  /** массив средних значений для строки */
  getAvgArray(row: VolumeDashboardRow): number[] {
    return this.avgKeys.map(k => row[k] as number);
  }

  /** максимальное среднее в строке (для нормализации высоты столбиков) */
  getMaxAvg(row: VolumeDashboardRow): number {
    return Math.max(...this.getAvgArray(row));
  }

/** читаемые названия колонок так, как они показаны в таблице */
private readonly headerMap: Record<string,string> = {
  ticker:     'Бумага',
  volume1Day: '1 день',
  avg3Days:   'ср. 3 дн.',
  avg7Days:   'ср. 7 дн.',
  avg30Days:  'ср. 30 дн.',
  avg90Days:  'ср. 90 дн.',
  avg180Days: 'ср. 180 дн.',
  avg365Days: 'ср. 365 дн.',
};

/* ---------- экспорт в Excel ---------- */
exportToExcel(): void {
  /* берём только те колонки, которые реально выводятся в таблицу,
     исключая декоративную avgBars */
  const cols = this.displayedColumns.filter(c => c !== 'avgBars');

  /* заголовки для первой строки Excel‑листa */
  const headerRow = cols.map(c => this.headerMap[c] ?? c);

  /* сами данные: для «Бумага» отдаём видимое имя, для остальных — значение поля */
  const dataRows = this.rows.map(r =>
    cols.map(c => c === 'ticker' ? r.ticker : (r as any)[c])
  );

  /* превращаем массив‑из‑массивов в лист */
  const worksheet = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows]);
  const workbook  = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'VolumeDashboard');

  const excelBuffer: ArrayBuffer = XLSX.write(workbook, {
    bookType: 'xlsx',
    type:     'array',
  });
  this.saveAsExcelFile(excelBuffer, 'VolumeDashboard');
}


  private saveAsExcelFile(buffer: ArrayBuffer, fileName: string): void {
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8',
    });
    saveAs(blob, `${fileName}_${new Date().getTime()}.xlsx`);
  }
}
