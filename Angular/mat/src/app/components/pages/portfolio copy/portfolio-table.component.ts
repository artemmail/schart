import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';

import { Subscription } from 'rxjs';
import { PortfolioService } from 'src/app/service/portfolio.service';

@Component({
  standalone: false,
  selector: 'app-portfolio-table',
  templateUrl: './portfolio-table.component.html',
  styleUrls: ['./portfolio-table.component.css']
})
export class PortfolioTableComponent implements OnInit {
  @Input() portfolioNumber: number;
  @Output() portfolioNumberChange = new EventEmitter<number>();
  @Output() tickerClick = new EventEmitter<any>();

  displayedColumns: string[] = ['ticker', 'price', 'currprice', 'quantity', 'buycost', 'nowcost', 'profit', 'yield'];
  dataSource = new MatTableDataSource<any>();
  loading: boolean = false;
  private dataSubscription: Subscription;

  constructor(private portfolioService: PortfolioService) {}

  ngOnInit() {
    this.loadPortfolio();
  }

  ngOnChanges() {
    this.loadPortfolio();
  }

  public loadPortfolio() {
    this.loading = true;
    if (this.dataSubscription) {
      this.dataSubscription.unsubscribe();
    }
    this.dataSubscription = this.portfolioService.getShares(this.portfolioNumber)
      .subscribe((data) => {
        this.dataSource.data = data;
        this.loading = false;
      });
  }

  onTickerClick(event: Event, element: any) {
    event.preventDefault();
    this.tickerClick.emit(element);
  }

  getProfitColor(profit: number): string {
    if (profit > 0) {
      return 'green';
    } else if (profit < 0) {
      return 'red';
    } else {
      return 'black';
    }
  }
}
