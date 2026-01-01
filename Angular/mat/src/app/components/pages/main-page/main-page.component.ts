import { CommonModule } from '@angular/common';
import { Component, ViewChild } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { DialogService } from 'src/app/service/DialogService.service';
import { MaterialModule } from 'src/app/material.module';
import { SharedModule } from 'src/app/shared.module';
import { StockChartTreemapComponent2 } from '../../Controls/stockChart-treemap/stockChart-treemap.component';
import { LeaderboardTableComponent } from '../../Controls/leaderboard-table/leaderboard-table.component';

@Component({
  standalone: true,
  selector: 'app-main-page',  
  templateUrl: './main-page.component.html',
  styleUrl: './main-page.component.css',
  imports: [CommonModule, MaterialModule, SharedModule, StockChartTreemapComponent2, LeaderboardTableComponent],
  
})
export class MainPageComponent {

  public selectedMarket: number  = 0;
  @ViewChild(StockChartTreemapComponent2)  stockChartTreemapComponent: StockChartTreemapComponent2;



  onMarketChange(market: number): void {
    

    this.stockChartTreemapComponent.updateParams({ market: this.selectedMarket });
  }

  constructor(private titleService: Title,   private dialogService: DialogService) {
     titleService.setTitle('Кластерные графики и биржевые инструменты онлайн');
     this.selectedMarket =0 ;

   }

   openSupportDialog()
   {
     this.dialogService.openSupportDialog()
   }

  ngOnInit(): void {
    
  }

}

