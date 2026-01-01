import {
  AfterViewInit,
  Component,
  HostListener,
  OnInit,
  ViewChild,
} from '@angular/core';
import { StockChartTreemapComponent } from 'src/app/components/Controls/stockChart-treemap/stockChart-treemap.component';


@Component({
  standalone: true,
  selector: 'mobile-marketmap',
  templateUrl: './marketmap.component.html',
  styleUrl: './marketmap.component.css',
  imports: [StockChartTreemapComponent]
})
export class MarketMapComponent implements OnInit {

  a: StockChartTreemapComponent ;
  ngOnInit() {
    this.updateContainerHeight();
  }

  @HostListener('window:resize')
  onResize() {
    this.updateContainerHeight();
  }

  ngAfterViewInit(): void {
    this.updateContainerHeight();
  
    setTimeout(() => {
      this.updateContainerHeight();
    }, 500);
  }
  

  private updateContainerHeight() {
    const container = document.getElementById('container');
    const viewportHeight = window.innerHeight;

    // Если у вас есть элементы сверху, учтите их высоту
    const header = document.querySelector('app-header');
    const headerHeight = header ? header.clientHeight : 0;

    const newHeight = viewportHeight - headerHeight;
    container.style.height = `${newHeight}px`;
  }
}


