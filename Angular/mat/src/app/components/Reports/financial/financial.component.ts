import { Component, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { STOCK_TICKERS, TICK_DESCR } from 'src/app/data/companyinfo';


@Component({
  selector: 'app-financial',
  templateUrl: './financial.component.html',
  styleUrls: ['./financial.component.css']
})
export class FinancialComponent implements OnInit {
  ticker: string = '';
  companyName: string = '';
  tickerDescription: string = '';
  selectedTabIndex: number = 0;
  title: string = '';
  titlestat: string = '';
  titlediv: string = '';

  constructor(private route: ActivatedRoute, private titleService: Title) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.ticker = params.get('ticker') || 'MTSS';
      this.companyName = STOCK_TICKERS[this.ticker];
      this.tickerDescription = TICK_DESCR[this.ticker] || '';  // Получаем описание тикера

      this.titlestat = `Финансовая отчетность по стандартам РСБУ и МСФО для компании ${this.companyName} (${this.ticker})`;
      this.title = `Финансовые показатели для компании ${this.companyName} (${this.ticker})`;
      this.titlediv = `Дивиденды компании ${this.companyName} (${this.ticker}) история, доходность, даты отсечек`;
      this.titleService.setTitle(`${this.companyName} (${this.ticker}) Финансовые фундаметальные показатели, мультипликаторы`);
    });
  }
}
