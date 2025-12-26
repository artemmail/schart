import {
  Component,
  ElementRef,
  Input,
  OnInit,
  OnDestroy,
  Injector,
  Renderer2,
  ComponentFactoryResolver,
  ApplicationRef,
  AfterViewInit,
  ChangeDetectorRef,
  ViewChild,
} from '@angular/core';
import { ReportsService, MarketMapParams } from 'src/app/service/reports.service';
import { Subscription, interval } from 'rxjs';
import { switchMap, startWith } from 'rxjs/operators';
import { FootPrintComponent } from '../../footprint/footprint.component';
import { MoneyToStrPipe } from 'src/app/pipes/money-to-str.pipe';
import { Router } from '@angular/router';
import { FootprintWidgetComponent } from '../../footprint/footprint-widget.component';
declare var $: any;

@Component({
  standalone: false,
  
  selector: 'app-kendo-treemap',
  templateUrl: './kendo-treemap.component.html',
  styleUrls: ['./kendo-treemap.component.css'],
  providers: [MoneyToStrPipe],
})
export class KendoTreemapComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input() startDate?: Date;
  @Input() endDate?: Date;
  @Input() categories?: string;
  @Input() rperiod: string = 'day';
  @Input() top: number = 50;
  @Input() market: number = 0;

  private refreshSubscription: Subscription;
  private intersectionObserver: IntersectionObserver;
  private item: any;

  constructor(
    private el: ElementRef,
    private moneyToStrPipe: MoneyToStrPipe,
    private reportsService: ReportsService,
    private renderer: Renderer2,
    private injector: Injector,
    private appRef: ApplicationRef,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private componentFactoryResolver: ComponentFactoryResolver
  ) {}

  ngOnInit(): void {
    this.initializeTreeMap();
  }

  ngAfterViewInit() {
    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.startDataSubscription();
          } else {
            this.stopDataSubscription();
          }
        });
      },
      { threshold: 0.1 }
    );

    this.intersectionObserver.observe(this.el.nativeElement);
    this.cdr.detectChanges();
  }

  ngOnDestroy(): void {
    this.stopDataSubscription();
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }
    this.clearTreeMap();
  }

  private startDataSubscription() {
    if (this.refreshSubscription && !this.refreshSubscription.closed) {
      return; // Если подписка уже активна, ничего не делаем
    }

    this.refreshSubscription = interval(5000)
      .pipe(
        startWith(0),
        switchMap(() =>
          this.reportsService.callGetMarketMap({
            startDate: this.startDate,
            endDate: this.endDate,
            categories: this.categories,
            rperiod: this.rperiod,
            top: this.top,
            market: this.market,
          })
        )
      )
      .subscribe((data) => { 


        setTimeout(() => {
          const treeMapElement = $(this.el.nativeElement.firstChild);
          const kendoTreeMap = treeMapElement.data('kendoTreeMap');
          if (kendoTreeMap) {
          
            kendoTreeMap.resize(true); // Вызов метода size() для обновления размеров treemap после обновления данных
          } 
  
        }, 500);


        
        

        this.updateTreeMap(data);
       //this. treeMapElement.data('kendoTreeMap').resize(true);
    //  alert(1)   
  });
  }

  private stopDataSubscription() {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }

  private initializeTreeMap(data?: any): void {
    this.clearTreeMap();
    if (!data) {
      this.reportsService
        .callGetMarketMap({
          startDate: this.startDate,
          endDate: this.endDate,
          categories: this.categories,
          rperiod: this.rperiod,
          top: this.top,
          market: this.market,
        })
        .subscribe((data) => this.createTreeMap(data));
    } else {
      this.createTreeMap(data);
    }
  }

  public updateParams(params: MarketMapParams): void {
    this.startDate = params.startDate ?? this.startDate;
    this.endDate = params.endDate ?? this.endDate;
    this.categories = params.categories ?? this.categories;
    this.rperiod = params.rperiod ?? this.rperiod;
    this.top = params.top ?? this.top;
    this.market = params.market ?? this.market;

    this.initializeTreeMap();
  }

  private clearTreeMap(): void {
    const treeMapElement = $(this.el.nativeElement.firstChild);
    if (treeMapElement.data('kendoTooltip')) {
      treeMapElement.data('kendoTooltip').destroy();
    }
    if (treeMapElement.data('kendoTreeMap')) {
      treeMapElement.data('kendoTreeMap').destroy();
      treeMapElement.empty();
      treeMapElement.unbind();
    }
  }

  private showToolTip(div: HTMLElement): void {
    div.style.width = '400px';
    div.style.height = '300px';
    if (!div || !this.item) return;

    if (div.querySelector('.footprint-component')) return;

    const componentFactory = this.componentFactoryResolver.resolveComponentFactory(FootprintWidgetComponent);
    const componentRef = componentFactory.create(this.injector);

    componentRef.instance.caption = this.item.name1;
    componentRef.instance.minimode = true;
    componentRef.instance.presetIndex = 2326;
    componentRef.instance.params = {
      ticker: this.item.ticker,
      period: 60,
      priceStep: 0.001,
      candlesOnly: true,
    };

    componentRef.location.nativeElement.classList.add('footprint-component');

    this.appRef.attachView(componentRef.hostView);
    this.renderer.appendChild(div, componentRef.location.nativeElement);
    componentRef.changeDetectorRef.detectChanges();
  }

  private navigateTo(route: string, queryParams: any): void {
    this.router.navigate([route], { queryParams });
  }

  private createTreeMap(data: any): void {
    const treeMapElement = $(this.el.nativeElement.firstChild);
    treeMapElement
      .kendoTreeMap({
        itemCreated: (e) => {
          e.element.css('color', '#222');
          e.element.css('text-align', 'center');
        },
        dataSource: { data },
        valueField: 'value',
        textField: 'name',
      })
      .on('click', '.k-leaf, .k-treemap-title', (e) => {
        const item = treeMapElement.data('kendoTreeMap').dataItem($(e.currentTarget).closest('.k-treemap-tile'));
        if (item.ticker) {
          this.navigateTo('/FootPrint', { candlesOnly: true, rperiod: 'day', period: 5, ticker: item.ticker });
        } else {
          const tickers = item.items.map((i) => i.ticker).join(',');
          this.navigateTo('/MultiCandles', { tickers, period: 15 });
        }
      });

    treeMapElement.kendoTooltip({
      filter: '.k-leaf, .k-treemap-title',
      position: 'right',
      width: 400,
      height: 300,
      showAfter: 200,
      hideAfter: 15000,
      show: (e) => this.showToolTip(document.getElementById('idd')),
      content: (e) => {
        const treemap = treeMapElement.data('kendoTreeMap');
        this.item = treemap.dataItem(e.target.closest('.k-treemap-tile'));
        return this.item.cls ? "<div id='idd'></div>" : `<p><b>${this.item.name}</b></p><p><b>Объем:</b>${this.moneyToStrPipe.transform(this.item.value)}</p>`;
      },
    });

    // Вызов метода size() для обновления размеров treemap
    treeMapElement.data('kendoTreeMap').resize(true);
  }

  private updateTreeMap(data: any): void {
    const treeMapElement = $(this.el.nativeElement.firstChild);
    const kendoTreeMap = treeMapElement.data('kendoTreeMap');
    if (kendoTreeMap) {
      kendoTreeMap.dataSource.data(data);
      kendoTreeMap.resize(true); // Вызов метода size() для обновления размеров treemap после обновления данных
    } else {
      this.createTreeMap(data);
    }
  }
}
