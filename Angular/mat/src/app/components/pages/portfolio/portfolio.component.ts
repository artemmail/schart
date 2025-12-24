import { Component, OnInit, ViewChild } from '@angular/core';
import { PortfolioService } from 'src/app/service/portfolio.service';
import { MatTableDataSource } from '@angular/material/table';
import { AuthService } from 'src/app/service/auth.service';

import { NavService } from 'src/app/service/nav.service';
import { AuthEventService } from 'src/app/service/AuthEventService';
import { ApplicationUser } from 'src/app/models/UserTopic';
import { PortfolioTableComponent } from '../portfolio copy/portfolio-table.component';
import { Title } from '@angular/platform-browser';
import { SelectListItemNumber, SmallPeriodPresetShort } from 'src/app/models/preserts';
import { FootPrintParameters } from 'src/app/models/Params';
import { JsonEditorComponent } from 'ang-jsoneditor';
import { FootPrintComponent } from '../../footprint/footprint.component';

@Component({
  standalone: false,
  selector: 'app-portfolio',
  templateUrl: './portfolio.component.html',
  styleUrls: ['./portfolio.component.css'],
})
export class PortfolioComponent implements OnInit {

  @ViewChild(FootPrintComponent) footPrint: FootPrintComponent;
  
  title = 'Торговля на демо портфеле';


   presetIndex: number =  2236;
   params: FootPrintParameters = {
    ticker: "GAZP",
    period: 60,
    priceStep: 0.001,
    candlesOnly: true,
  };


   minimode: boolean = true;
   caption: string | null = null;


  ticker = 'SBER';
  portfolios = [
    { value: 1, viewValue: 'Portfolio 1' },
    { value: 2, viewValue: 'Portfolio 2' },
    { value: 3, viewValue: 'Portfolio 3' },
    { value: 4, viewValue: 'Portfolio 4' },
  ];

  periodList: SelectListItemNumber[] =SmallPeriodPresetShort;
  period = 15.0;

  selectedPortfolioNumber: number = 1;
  quantity = 1;
  price = 1;
  portfolioComp1: number = 1;
  portfolioComp2: number = 2;
  selectedPeriod: string;
  displayedColumns: string[] = [
    'ticker',
    'price',
    'currprice',
    'quantity',
    'buycost',
    'nowcost',
    'profit',
    'yield',
  ];
  dataSource = new MatTableDataSource<any>([]);
  loading = false;
  externalLink = true; // Adjust as needed
  date = new Date().toISOString().split('T')[0];

  constructor(
    private portfolioService: PortfolioService,
    private authService: AuthService,
    
    
    private authEventService: AuthEventService,
    private titleService: Title ) {
    titleService.setTitle("Виртуальный портфель, торговля на демо-счете");
  }

  @ViewChild(PortfolioTableComponent) PortfolioTable: PortfolioTableComponent;

  isSignedIn: boolean = false;
  user: ApplicationUser | null = null;

  public isDrawerOpened;

  onTickerSelected(e: any) {}

  ngOnInit(): void {
   
      this.isSignedIn = this.authService.isAuthenticated();

      if (this.isSignedIn) {
        this.authService
          .getLoggedUser()
          .subscribe((user) => (this.user = user));
      }
    
  }

  buySell(sign: number) {
    this.portfolioService
      .makeOrder(
        this.ticker,
        sign * this.quantity,
        this.selectedPortfolioNumber
      )
      .subscribe((data) => {
        this.PortfolioTable.loadPortfolio();
      });
  }

  buySpec() {
    this.portfolioService
      .makeOrderSpec(
        this.ticker,
        this.quantity,
        this.price,
        this.selectedPortfolioNumber
      )
      .subscribe((data) => {
        this.PortfolioTable.loadPortfolio();
      });
  }

  cleanUp() {
    this.portfolioService
      .cleanUpPortfolio(this.selectedPortfolioNumber)
      .subscribe((data) => {
        this.PortfolioTable.loadPortfolio();
      });
  }

  comparator() {
    if (this.portfolioComp1 === this.portfolioComp2) {
      alert('Нужно выбрать 2 разных портфеля');
    } else {
      this.portfolioService
        .portfolioCompares(this.portfolioComp1, this.portfolioComp2)
        .subscribe((data) => {
          if (data.res1 !== '' && data.res2 !== '') {
            window.open(
              `/CandlestickChart/PairTrading?ticker1=${encodeURIComponent(
                data.res1
              )}&ticker2=${encodeURIComponent(data.res2)}`
            );
          } else {
            alert('Один из портфелей пуст');
          }
        });
    }
  }

  changePeriod() {
  
  }

  applyPresetX(e: any)
  {
    this.footPrint.reload();
   // alert(JSON.stringify(e));
  }

  handleTickerClick(element: any): void {


    //this.params.
    this.caption =  element.name;
    this.params.ticker = element.ticker;
    this.footPrint.reload();

   // alert(JSON.stringify(element));
    return ;
  //  event.preventDefault();
    /*
    if (element.ticker) {
      if (this.externalLink) {
        return `<a target="_blank" href="CandlestickChart?period=1440&rperiod=custom&startDate=${
          this.date
        }&ticker=${encodeURIComponent(element.ticker)}">${element.name}</a>`;
      } else {
        return `<a href="#" onclick='updateTickerBox("${element.ticker}", "${element.name}")'>${element.name}</a>`;
      }
    } else {
      return `<b>${element.name}</b>`;
    }*/
  }
}
