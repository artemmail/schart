import { Component, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { STOCK_TICKERS } from 'src/app/data/companyinfo';


@Component({
  selector: 'app-statements',
  templateUrl: './statements.component.html',
  styleUrls: ['./statements.component.css']
})
export class StatementsComponent implements OnInit {
  ticker: string = '';
  companyName: string = '';
  selectedTabIndex: number = 0;
  title: string ='';
  titlediv: string ='';
  titleshare: string ='';
  titlefin: string ='';

  constructor(private route: ActivatedRoute,private titleService: Title) {}


  
  

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.ticker = ( params.get('ticker') || 'MTSS').toUpperCase();
      this.companyName = STOCK_TICKERS[this.ticker];

      this.title = `Финансовая отчетность по стандартам РСБУ и МСФО для компании ${this.companyName} (${this.ticker})`;
      this.titlediv = `Дивиденды компании ${this.companyName} (${this.ticker}) история, доходность, даты отсечек`;
      this.titleshare = `Структура и состав акционеров компании ${this.companyName} (${this.ticker})`;
      this.titlefin = `Финансовые показатели для компании ${this.companyName} (${this.ticker})`;
      this.titleService.setTitle(`${this.companyName} (${this.ticker}) Финансовая отчетность РСБУ,МСФО`);

      // Можно настроить выбор вкладки на основе параметров URL или других факторов
      const tabParam = params.get('tab');
      if (tabParam) {
        this.selectedTabIndex = ['msfo-y', 'msfo-q', 'rsbu-y', 'rsbu-q'].indexOf(tabParam);
      }
    });
  }

  onTabChange(index: number): void {
    // Обновляем URL при смене вкладки
    const tab = ['msfo-y', 'msfo-q', 'rsbu-y', 'rsbu-q'][index];
    // Можно обновить роутинг или изменить логику в зависимости от выбранной вкладки
  }
}
