import { Component, ViewChild, ViewContainerRef, OnInit, Renderer2, HostListener, ElementRef, Input } from '@angular/core';
import { FootprintWidgetComponent } from '../../footprint/components/footprint-widget/footprint-widget.component';
import { Injector } from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-multi',
  templateUrl: './multi.component.html',
  styleUrls: ['./multi.component.css']
})
export class MultiComponent implements OnInit {
  @ViewChild('container', { read: ViewContainerRef, static: true }) container: ViewContainerRef;
  
  @Input() columns: number = 4; // Новый параметр для задания количества колонок
  total: number = 0;

  constructor(private renderer: Renderer2, private injector: Injector, private el: ElementRef) {}

  ngOnInit() {
    this.addFootprintComponent('USD/RUR FUT', true, 2326, { ticker: 'Si', period: 15, priceStep: 10, candlesOnly: true });
    this.addFootprintComponent('Moex FUT', true, 2326, { ticker: 'MX', period: 15, priceStep: 50, candlesOnly: true });
    this.addFootprintComponent('RTS FUT', true, 2326, { ticker: 'RI', period: 15, priceStep: 100, candlesOnly: true });
    /*
    this.addFootprintComponent('Индекс РТС', true, 2326, { ticker: 'RI', period: 15, priceStep: 100, candlesOnly: true });
    
    this.addFootprintComponent('Нефть', true, 2326, { ticker: 'BR', period: 15, priceStep: 0.1, candlesOnly: true });
    this.addFootprintComponent('CNY/RUR', true, 2326, { ticker: 'CNYRUB_TOM', period: 15, priceStep: 0.1, candlesOnly: true });
    */

    this.adjustFootprintItemSizes();
    this.setGridColumns();
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: Event) {
    //const containerWidth = containerElement.offsetWidth;


    this.adjustFootprintItemSizes();
    this.setGridColumns();
  }

  private adjustFootprintItemSizes() {
    const containerElement = this.container.element.nativeElement;
    const containerWidth = containerElement.offsetWidth;    
    this.columns = Math.ceil(containerWidth/500);
    if (this.columns>3) this.columns =3;
    const itemWidth = containerWidth / this.columns;
    const footprintItems = containerElement.querySelectorAll('.footprint-item');
    footprintItems.forEach((item: HTMLElement) => {
      item.style.width = `${itemWidth}px`;
    });
  }

  private setGridColumns() {
    const containerElement = this.container.element.nativeElement;
    containerElement.style.setProperty('--columns', this.columns.toString());    
    let rows: number = Math.ceil(this.total/this.columns);
    containerElement.style.setProperty('--rows', rows.toString());
  }

  addFootprintComponent(caption: string, minimode: boolean, presetIndex: number, params: any) {
    this.total++;
    // Создание обертки div
    const div = this.renderer.createElement('div');
    this.renderer.addClass(div, 'footprint-item');
    
    // Добавление div в контейнер
    const containerElement = this.container.element.nativeElement;
    this.renderer.appendChild(containerElement, div);
    
    // Создание компонента внутри div
    const componentRef = this.container.createComponent(FootprintWidgetComponent, { injector: this.injector });
    this.renderer.appendChild(div, componentRef.location.nativeElement);

    // Установка свойств компонента
    componentRef.instance.caption = caption;
    componentRef.instance.minimode = minimode;
    componentRef.instance.presetIndex = presetIndex;
    componentRef.instance.params = params;

    // Установка ширины для нового элемента
    const containerWidth = containerElement.offsetWidth;
    const itemWidth = containerWidth / this.columns;
    div.style.width = `${itemWidth}px`;
  }
}

