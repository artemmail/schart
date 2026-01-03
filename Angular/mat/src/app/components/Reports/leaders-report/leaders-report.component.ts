import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';

import { ReportsService } from 'src/app/service/reports.service';
import { ReportLeader } from 'src/app/models/Barometer';
import { FootPrintRequestModel } from 'src/app/models/tickerpreset';
import { DateRangePickerComponent } from '../../Controls/DateRange/date-range-picker.component';
import { TopPreset } from 'src/app/models/preserts';
import { Title } from '@angular/platform-browser';
import { MaterialModule } from 'src/app/material.module';
import { MarketSelectorComponent } from '../../Controls/MarketSelector/market-selector.component';
import { ComboBoxComponent } from '../../Controls/ComboBox/combobox.component';
import { PresetSelectorComponent1 } from '../../DateRangeSelector/date-range-selector.component';
import { MoneyToStrPipe } from 'src/app/pipes/money-to-str.pipe';

@Component({
  standalone: true,
  selector: 'app-leader',
  imports: [
    MaterialModule,
    MarketSelectorComponent,
    ComboBoxComponent,
    PresetSelectorComponent1,
    DateRangePickerComponent,
    MoneyToStrPipe,
  ],
  templateUrl: './leaders-report.component.html',
  styleUrls: ['./leaders-report.component.css'],
})
export class LeadersReportComponent implements OnInit {
  leaders: ReportLeader[] = [];
  dataSource = new MatTableDataSource<ReportLeader>(this.leaders);

  selectedMarket: number = 0;
  rperiod: string = 'day';
  ticker: string = 'GAZP';

  startDate!: Date;
  endDate!: Date;

  top: number = 2000;
  topPreset = TopPreset;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(DateRangePickerComponent) DateRange!: DateRangePickerComponent;

  constructor(
    private fb: FormBuilder,
    private leaderService: ReportsService,
    private titleService: Title
  ) {
    titleService.setTitle("Лидеры рынка акций");
  }

  parseDate(dateString: string): Date {
    const [day, month, year] = dateString.split('.').map(Number);
    return new Date(year, month - 1, day);
  }

  applyPreset(foundPreset: FootPrintRequestModel) {
    this.rperiod = foundPreset.rperiod;
    let startDate = foundPreset.startDate;
    let endDate = foundPreset.endDate;

    this.DateRange.setDatesRange(startDate,endDate);
  }

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    this.getLeaders();
  }

  onMarketChange(market: number): void {
    this.getLeaders();
  }

  getLeaders(): void {
    this.leaderService
      .getLeaders(
        this.DateRange.getStart(),
        this.DateRange.getEnd(),
        this.rperiod,
        this.top,
        this.selectedMarket
      )
      .subscribe((data) => {
        this.leaders = data;
        this.dataSource.data = this.leaders;
      });
  }

  // Method to dynamically adjust displayed columns based on selectedMarket value
  getDisplayedColumns(): string[] {
    if (this.selectedMarket === 0) {
      return [
        'ticker',
        'fundamental',
        'msfo',
        'dividends',
        'owners',
        'opn',
        'cls',
        'volume',
        'percent',
        'bid',
      ];
    } else {
      return ['ticker', 'opn', 'cls', 'volume', 'percent', 'bid'];
    }
  }
}
