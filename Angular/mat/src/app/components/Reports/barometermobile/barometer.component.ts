import { Component, OnInit } from '@angular/core';

import { FormControl } from '@angular/forms';
import { Observable } from 'rxjs';
import { Barometer } from 'src/app/models//Barometer';

import { CommonService } from 'src/app/service/common.service';
import { ReportsService } from 'src/app/service/reports.service';

@Component({
  selector: 'app-barometer-mobile',
  templateUrl: './barometer.component.html',
  styleUrls: ['./barometer.component.css'],
})
export class BarometerMobileComponent implements OnInit {
  marketControl = new FormControl('');
  markets$: Observable<any[]>;
  data: Barometer[] = [];
  displayedColumns: string[] = ['tickerName', 'opn', 'rec1', 'rec2', 'rec3'];

  constructor(
    private commonService: CommonService,
    private reportsService: ReportsService
  ) {}

  ngOnInit(): void {
    this.fetchData();
  }

  fetchData() {
    //const selectedMarket = this.marketControl.value;

    this.reportsService.getBarometer(0).subscribe((data) => {
      this.data = data;
    });
  }
}
