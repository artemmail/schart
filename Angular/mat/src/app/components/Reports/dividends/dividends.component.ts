import { Component, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { STOCK_TICKERS, TICK_DESCR } from 'src/app/data/companyinfo';

@Component({
  selector: 'app-dividends',
  templateUrl: './dividends.component.html',
  styleUrls: ['./dividends.component.css']
})
export class DividendsComponent implements OnInit {
  ticker: string = '';
  selectedTabIndex: number = 0;
  title: string ='';

  constructor(private route: ActivatedRoute,private titleService: Title) {}


  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.ticker = params.get('ticker') || 'MTSS';
      const companyName: string = STOCK_TICKERS[this.ticker];

      this.title = `Дивиденды компании ${companyName} (${this.ticker}) история, доходность, даты отсечек`;
      this.titleService.setTitle(`${companyName} (${this.ticker}) дивиденды компании`);

      
    });
  }
  
}
