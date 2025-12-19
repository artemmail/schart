import { Component, Input, OnInit } from '@angular/core';
import { Legend_tab, stat_dic } from 'src/app/data/companyinfo';
import { DataItem } from 'src/app/models/fundamental.model';
import {  DataService } from 'src/app/service/companydata.service';

@Component({
  standalone: false,
  selector: 'app-company-table',
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

  // Список исключений для отображения ссылок
  noLinkNames: string[] = [
    "date",
    "currency",
    "report_url",
    "presentation_url",
    "year_report_url",
    "oil_refining",
    "capex",
    "fcf",
    "dividend_payout",
    "dividend",
    "div_yield",
    "div_payout_ratio",
    "employment_expenses",
    "interest_expenses",
    "free_float",
    "insider_own",
    "p_fcf",
    "r_and_d_capex"
  ];

  constructor(private dataService: DataService) {}

  transformData(data: DataItem[]): any {
    const result: any = {};
    const yearsSet = new Set<string>();

    data.forEach(item => {
      yearsSet.add(item.year);

      if (!result[item.name]) {
        // Создаем два поля: одно для отображения, другое для ссылки
        result[item.name] = { 
          nameForDisplay: stat_dic[item.name] || item.name, // Для отображения
          nameForLink: item.name // Оригинальное имя для ссылки
        };
      }
      result[item.name][item.year] = item.value;
    });

    return {
      transformedData: Object.values(result),
      years: Array.from(yearsSet).sort() // Сортируем года по возрастанию
    };
  }

  // Метод для проверки, нужно ли отображать ссылку
  shouldDisplayLink(name: string): boolean {
    return !this.filter && !this.noLinkNames.includes(name);
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

  isLink(value: string | number): boolean {
    if (typeof value !== 'string') {
      return false;
    }
    return value.startsWith('http') || value.startsWith('https') || value.startsWith('file');
  }
}
