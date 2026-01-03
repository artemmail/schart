import { CommonModule } from '@angular/common';
import { Component, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { DialogService } from 'src/app/service/DialogService.service';
import { MaterialModule } from 'src/app/material.module';
import { OpenSupportDialogDirective } from 'src/app/directives/open-support-dialog.directive';
import { MarketSelectorComponent } from 'src/app/components/Controls/MarketSelector/market-selector.component';
import { MultiComponent } from 'src/app/components/pages/multi/multi.component';
import { BarometerTableComponent } from 'src/app/components/tables/barometer/barometer.component';
import { TopicListComponent } from 'src/app/components/tables/topic-list/topic-list.component';
import { StockChartTreemapComponent } from '../../Controls/stockChart-treemap/stockChart-treemap.component';
import { LeaderboardTableComponent } from '../../Controls/leaderboard-table/leaderboard-table.component';

@Component({
  standalone: true,
  selector: 'app-main-page',  
  templateUrl: './main-page.component.html',
  styleUrl: './main-page.component.css',
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MaterialModule,
    OpenSupportDialogDirective,
    MarketSelectorComponent,
    MultiComponent,
    BarometerTableComponent,
    TopicListComponent,
    StockChartTreemapComponent,
    LeaderboardTableComponent,
  ],
  
})
export class MainPageComponent {

  public selectedMarket: number  = 0;
  @ViewChild(StockChartTreemapComponent)  stockChartTreemapComponent: StockChartTreemapComponent;



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

