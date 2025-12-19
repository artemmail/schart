import { Component, ViewChild } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { KendoTreemapComponent } from '../../Controls/kendo-treemap/kendo-treemap.component';
import { DialogService } from 'src/app/service/DialogService.service';

@Component({
  standalone: false,
  selector: 'app-main-page',  
  templateUrl: './main-page.component.html',
  styleUrl: './main-page.component.css'
})
export class MainPageComponent {

  public selectedMarket: number  = 0;
  @ViewChild(KendoTreemapComponent)  kendoTreemapComponent: KendoTreemapComponent;



  onMarketChange(market: number): void {
    

    this.kendoTreemapComponent.updateParams({ market: this.selectedMarket });
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

