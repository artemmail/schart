import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TickerAutocompleteComponent } from '../../Controls/ticker-autocomplete/ticker-autocomplete.component';
import { ReportsService } from 'src/app/service/reports.service';
import { TopOrdersResult } from 'src/app/models/Barometer';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { Title } from '@angular/platform-browser';
import { MaterialModule } from 'src/app/material.module';

interface Period {
  value: string;
  viewValue: string;
}

@Component({
  standalone: true,
  selector: 'app-top-orders',
  imports: [MaterialModule, TickerAutocompleteComponent],
  templateUrl: './top-orders.component.html',
  styleUrls: ['./top-orders.component.css']
})
export class TopOrdersComponent implements OnInit, AfterViewInit {
  ticker: string = 'SBER';  // Значение по умолчанию
  bigPeriod: string = '1';  // Значение по умолчанию
  bigPeriods: Period[] = [
    { value: '1', viewValue: '1 день' },
    { value: '3', viewValue: '3 дня' },
    { value: '7', viewValue: '1 неделя' },
    { value: '14', viewValue: '2 недели' },
  ];

  @ViewChild(TickerAutocompleteComponent) exampleControlComponent: TickerAutocompleteComponent;
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatPaginator) paginator: MatPaginator;

  displayedColumns: string[] = ['quantity', 'direction', 'tradeDate', 'price'];
  dataSource = new MatTableDataSource<TopOrdersResult>();

  constructor(private reportsService: ReportsService,
    private titleService: Title ) {
    titleService.setTitle("Крупнейшие сделки рынка акций"); }

  ngOnInit(): void {
    this.refresh();
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
  }

  onTickerSelected(ticker: string): void {
    this.ticker = ticker;
    this.refresh();
  }

  refresh(): void {
    this.reportsService.getTopOrders(this.ticker, Number.parseInt(this.bigPeriod))
      .subscribe(data => {
        this.dataSource.data = data;
      });
  }

  onSubmit(): void {
    this.refresh();
  }
}
