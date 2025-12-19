import { Component, Input, OnInit, SimpleChanges } from '@angular/core';
import { Barometer } from 'src/app/models//Barometer';
import { CommonService } from 'src/app/service/common.service';
import { ReportsService } from 'src/app/service/reports.service';

@Component({
  standalone: false,
  selector: 'app-barometer-table',
  templateUrl: './barometer.component.html',
  styleUrls: ['./barometer.component.css'],
})
export class BarometerTableComponent implements OnInit {  
  data: Barometer[] = [];
  displayedColumns: string[] = [
    'tickerName',
    'opn',
    'rec1',
    'rec2',
    'rec3'    
  ];
  @Input() selectedMarket: number = 0;

  constructor(
    private commonService: CommonService,
    private reportsService: ReportsService
  ) {}

  ngOnInit(): void {
    // Initial data fetch if needed
    this.fetchData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedMarket']) {
      this.fetchData();
    }
  }

  fetchData() {
    this.reportsService.getBarometer(this.selectedMarket).subscribe((data) => {
      this.data = data;
    });
  }

}
