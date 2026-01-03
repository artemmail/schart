import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { ReportsService } from 'src/app/service/reports.service';
import { candleseekerResult } from 'src/app/models/Barometer';
import { MarketSelectorComponent } from '../../Controls/MarketSelector/market-selector.component';
import { SelectListItemNumber } from 'src/app/models/preserts';
import { Title } from '@angular/platform-browser';
import { MaterialModule } from 'src/app/material.module';
import { ComboBoxComponent } from '../../Controls/ComboBox/combobox.component';

@Component({
  standalone: true,
  selector: 'app-volume-splash',
  imports: [MaterialModule, MarketSelectorComponent, ComboBoxComponent],
  templateUrl: './volume-splash.component.html',
  styleUrls: ['./volume-splash.component.css'],
})
export class VolumeSplashComponent implements OnInit, AfterViewInit {
  
  selectedMarket: number = 0;
  splash = 3;
  isPayed = true;
  bigPeriod: any = 31; // Значение по умолчанию
  smallPeriod: any = 7; // Значение по умолчанию
  marketList = [];
  displayedColumns: string[] = [
    'ticker',
    'avgval',
    'max',
    'huge',
    'cls',
    'name',
  ];
  dataSource = new MatTableDataSource<candleseekerResult>();
  bigPeriods:  SelectListItemNumber[];
  smallPeriods: SelectListItemNumber[];

  @ViewChild(MarketSelectorComponent) marketSelector: MarketSelectorComponent;
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatPaginator) paginator: MatPaginator;

  constructor(private reportsService: ReportsService,
    private titleService: Title ) {
    titleService.setTitle("Необычные всплески биржевых объемов");}

  ngOnInit(): void {    
    this.bigPeriods = [
      { Value: 31, Text: '1 месяц' },
      { Value: 92, Text: '3 месяца' },
      { Value: 182, Text: '6 месяцев' },
      { Value: 365, Text: '1 год' },
    ];

    this.smallPeriods = [
      { Value: 7, Text: '1 неделя' },
      { Value: 14, Text: '2 недели' },
      { Value: 31, Text: '1 месяц' },
    ];
    
    this.refresh();
  }

  ngAfterViewInit() {
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
  }



  onMarketChange(market: number): void {
    this.refresh();
  }

  refresh() {
    this.reportsService
      .getVolumeSplash(
        this.bigPeriod,
        this.smallPeriod,        
        this.splash,
        this.selectedMarket
      )
      .subscribe((data: candleseekerResult[]) => {
        this.dataSource.data = data;
      });
  }
}
