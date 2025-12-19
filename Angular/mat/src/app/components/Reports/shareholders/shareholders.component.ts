import { Component, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { STOCK_TICKERS } from 'src/app/data/companyinfo';


@Component({
  standalone: false,
  selector: 'app-shareholders',
  templateUrl: './shareholders.component.html',
  styleUrls: ['./shareholders.component.css']
})
export class ShareHoldersComponent implements OnInit {
  ticker: string = '';
  selectedTabIndex: number = 0;
  title: string ='';

  constructor(private route: ActivatedRoute,private titleService: Title) {}


  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.ticker = params.get('ticker') || 'MTSS';
      const companyName: string = STOCK_TICKERS[this.ticker];

      this.title = `Структура и состав акционеров компании ${companyName} (${this.ticker})`;
      this.titleService.setTitle(`${companyName} (${this.ticker}) структура и состав акционеров`);

      
    });
  }
  
}
