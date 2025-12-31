import {
  AfterViewInit,
  Component,
  HostListener,
  OnInit,
  ViewChild,
} from '@angular/core';
import { KendoTreemapComponent2 } from 'src/app/components/Controls/kendo-treemap/kendo-treemap2.component';


@Component({
  standalone: true,
  selector: 'mobile-marketmap',
  templateUrl: './marketmap.component.html',
  styleUrl: './marketmap.component.css',
  imports: [KendoTreemapComponent2]
})
export class MarketMapComponent implements OnInit {

  a: KendoTreemapComponent2 ;
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


