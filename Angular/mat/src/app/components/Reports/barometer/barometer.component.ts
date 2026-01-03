import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormControl } from '@angular/forms';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Barometer } from 'src/app/models//Barometer';
import { environment } from 'src/app/environment';
import { CommonService } from 'src/app/service/common.service';
import { ReportsService } from 'src/app/service/reports.service';
import { Title } from '@angular/platform-browser';
import { MaterialModule } from 'src/app/material.module';
import { MarketSelectorComponent } from '../../Controls/MarketSelector/market-selector.component';
import { ArrowDisplayComponent } from '../../Controls/arrow-display/arrow-display.component';

@Component({
  standalone: true,
  selector: 'app-barometer',
  imports: [MaterialModule, MarketSelectorComponent, ArrowDisplayComponent],
  templateUrl: './barometer.component.html',
  styleUrls: ['./barometer.component.css'],
})
export class BarometerComponent implements OnInit {  
  data: Barometer[] = [];
  displayedColumns: string[] = [
    'tickerName',
    'opn',
    'rec1',
    'rec2',
    'rec3',
    'news',
  ];
  selectedMarket: number = 0;

  constructor(
    private commonService: CommonService,
    private reportsService: ReportsService,
    private titleService: Title ) {
    titleService.setTitle("Фрактальный барометер Старченко");}

  ngOnInit(): void {
    // this.fetchData(this.selectedMarket);
  }

  ngAfterViewInit(): void {
    this.fetchData();
  }

  
  onMarketChange(market: number): void {
    this.fetchData();
  }

  fetchData() {
    //const selectedMarket = this.marketControl.value;

    this.reportsService.getBarometer(this.selectedMarket).subscribe((data) => {
      this.data = data;
    });
  }

  exportToExcel(): void {
    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(this.data);
    const workbook: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Barometer');
    const excelBuffer: any = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array',
    });
    this.saveAsExcelFile(excelBuffer, 'BarometerReport');
  }

  private saveAsExcelFile(buffer: any, fileName: string): void {
    const data: Blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8',
    });
    saveAs(data, `${fileName}_${new Date().getTime()}.xlsx`);
  }
}
