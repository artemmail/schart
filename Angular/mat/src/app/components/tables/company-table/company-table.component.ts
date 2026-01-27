import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Legend_tab } from 'src/app/data/companyinfo';
import { DataItem } from 'src/app/models/fundamental.model';
import {  DataService } from 'src/app/service/companydata.service';
import { MoneyToStrPipe } from 'src/app/pipes/money-to-str.pipe';

@Component({
  standalone: true,
  selector: 'app-company-table',
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatTableModule,
    MatTooltipModule,
    MoneyToStrPipe,
  ],
  templateUrl: './company-table.component.html',
  styleUrls: ['./company-table.component.css']
})
export class CompanyTableComponent implements OnInit {
  @Input() ticker: string = 'MTSS';
  @Input() period: string = 'y';
  @Input() standart: string = 'MSFO';
  @Input() filter?: string;  // Новый параметр для фильтрации по имени

  dataSource: any[] = [];
  displayedColumns: string[] = [];

  // Глобальный словарь легенд
  legend = Legend_tab;

  constructor(private dataService: DataService) {}

  transformData(data: DataItem[]): any {
    const result: any = {};
    const yearsSet = new Set<string>();

    data.forEach(item => {
      yearsSet.add(item.year);

      if (!result[item.metricKey]) {
        // Создаем два поля: одно для отображения, другое для ссылки
        result[item.metricKey] = { 
          nameForDisplay: item.displayName || item.metricKey,
          nameForLink: item.metricKey,
          isClickable: item.isClickable ?? true,
          valueType: item.valueType || 'number'
        };
      }
      const cellValue = item.valueType === 'url' ? (item.link || item.value) : item.value;
      result[item.metricKey][item.year] = cellValue;
    });

    return {
      transformedData: Object.values(result),
      years: Array.from(yearsSet).sort() // Сортируем года по возрастанию
    };
  }

  // Метод для проверки, нужно ли отображать ссылку
  shouldDisplayLink(isClickable: boolean): boolean {
    return !!isClickable;
  }

  ngOnInit(): void {
    if (this.filter) {
      this.dataService.loadData2(this.ticker, this.standart, this.period, this.filter).subscribe(data  => {
        const transformed = this.transformData(data);
        this.dataSource = transformed.transformedData;
        this.displayedColumns = ['name', ...transformed.years.map(year => year.toString())];
      });
    } else {
      this.dataService.loadData(this.ticker, this.standart, this.period).subscribe((data) => {
        const transformed = this.transformData(data);
        this.dataSource = transformed.transformedData;
        this.displayedColumns = ['name', ...transformed.years.map(year => year.toString())];
      });
    }
  }

  isUrlValue(valueType: string, value: string | number): boolean {
    return valueType === 'url' && !!value;
  }
}
