import { AfterViewInit, Component, Input, OnInit, ViewChild, input } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormControl } from '@angular/forms';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';

import { DomSanitizer, SafeHtml, Title } from '@angular/platform-browser';
import { TickerAutocompleteComponent } from '../../Controls/ticker-autocomplete/ticker-autocomplete.component';
import { ColorsService } from 'src/app/service/FootPrint/Colors/color.service';
import { ReportsService } from 'src/app/service/reports.service';


@Component({
  selector: 'app-seasonality',
  templateUrl: './seasonality.component.html',
  styleUrls: ['./seasonality.component.css'],
    standalone: false
})
export class SeasonalityComponent implements OnInit , AfterViewInit{
  

 
  chartHtml: SafeHtml = '';
  @Input() ticker:string = "SBER";
  
  

  constructor(private sanitizer: DomSanitizer,  private colorsService: ColorsService,private reportsService: ReportsService,
    private titleService: Title ) {
    titleService.setTitle("Таблица сезонной активности рынка акций");
    
   }

  ngOnInit() {
    
  }

  onTickerSelected(ticker: any) {

    this.loadChartData(ticker);
  }

  ngAfterViewInit() {
    // Загружать данные после завершения инициализации представлений
    this.loadChartData(this.ticker);
  }


 


  loadChartData(ticker:string) {
    this.reportsService.getSeasonality(ticker)
    .subscribe(data => {
      this.chartHtml = this.buildChart(data);
    });
  }

  buildChart(data: any[]): SafeHtml {
    let res = "";
    let max = 0;
    for (let i = 1; i < data.length; i++) {
      for (let j = 1; j < data[i].length; j++) {
        max = Math.max(max, Math.abs(data[i][j]));
      }
    }
    for (let i = 0; i < data.length; i++) {
      res += '<table style="background:#ceced2;">';
      res += '<tr>';
      for (let j = 0; j < data[i].length; j++) {
        let color = "#FFF";
        let t = data[i][j];
        if (i > 0 && j > 0) {
          if (t == null)
            t = '';
          else
            t = t / 100 + "%";
          if (data[i][j] < 0)
            color = this.colorsService.getGradientColor('#eeeeee', '#f75442', -data[i][j] / max);
          else
            color = this.colorsService.getGradientColor('#eeeeee', '#6be583', data[i][j] / max);
        }
        if (t == null) t = '';
        res += this.madediv(t, color);
      }
      res += '</tr>';
    }
    res += '</table>';
    return this.sanitizer.bypassSecurityTrustHtml( res);
  }

  madediv(data: any, color: string): string {
    // Используйте обратные кавычки для поддержки интерполяции строк
    return `<td style="border-width:1px; border-color:#ceced2; background:${color};"><div style="padding: 0.9em 0; text-align: center; font-size: 13pt; width: 74px;">${data}</div></td>`;
  }


}