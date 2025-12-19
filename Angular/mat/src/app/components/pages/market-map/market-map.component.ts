import { 
  AfterViewInit,
  Component,
  HostListener,
  OnInit,
  ViewChild
} from '@angular/core';
import { KendoTreemapComponent } from '../../Controls/kendo-treemap/kendo-treemap.component';
import { MarketBoardComponent } from '../../Controls/market-board/market-board.component';
import { FootPrintRequestModel } from 'src/app/models/tickerpreset';
import { Title } from '@angular/platform-browser';
import { DateRangePickerComponent } from '../../Controls/DateRange/date-range-picker.Component';
import { TopPreset } from 'src/app/models/preserts';
import { PresetSelectorComponent1 } from '../../DateRangeSelector/date-range-selector.component';
import { ReportsService } from 'src/app/service/reports.service';

@Component({
  selector: 'app-marketmap',
  templateUrl: './market-map.component.html',
  styleUrls: ['./market-map.component.css'],
})
export class MarketMapComponent implements OnInit, AfterViewInit {
  @ViewChild(KendoTreemapComponent) kendoTreemapComponent: KendoTreemapComponent;
  @ViewChild(MarketBoardComponent) marketBoardComponent: MarketBoardComponent;
  @ViewChild(DateRangePickerComponent) dateRangePickerComponent: DateRangePickerComponent;
  @ViewChild(PresetSelectorComponent1) dateRangeSelectorComponent: PresetSelectorComponent1;

  market: number = 0;
  top: number = 50;
  topPreset = TopPreset;
  selectedMarket: number = 0;
  rperiod: string = 'day';
  ticker: string = 'GAZP';
  initialCategories = ''; 

  style: number = 0;
  styleOptions = [
    { Text: 'Карта', Value: 0 },
    { Text: 'Доска', Value: 1 }
  ];

  constructor(
    private titleService: Title,
    private reportsService: ReportsService
  ) {
    this.titleService.setTitle('Карта рынка акций');
  }

  ngOnInit() {
  }

  ngAfterViewInit(): void {
    this.size();
  }

  @HostListener('window:resize', ['$event'])
  size() {
    const container = document.getElementById('container');
    if (container) {
      const containerRect = container.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const newHeight = viewportHeight - containerRect.top - 1;
      container.style.height = `${newHeight}px`;
      container.style.width = '100%';
    }
  }

  onCategoriesChange(selectedCategories: string[]) {
    console.log('Выбранные категории (массив):', selectedCategories);
  }

  onCategoriesChangeString(selectedCategoriesString: string) {
    this.initialCategories = selectedCategoriesString;
    if (this.hasCategories()) {
      if (this.style === 0 && this.kendoTreemapComponent) {
        this.kendoTreemapComponent.updateParams({
          categories: selectedCategoriesString,
          rperiod: this.rperiod,
          market: this.market,
          top: this.top,
          startDate: this.dateRangePickerComponent?.getStart(),
          endDate: this.dateRangePickerComponent?.getEnd()
        });
      } else if (this.style === 1 && this.marketBoardComponent) {
        this.marketBoardComponent.updateParams({
          categories: selectedCategoriesString,
          rperiod: this.rperiod,
          market: this.market,
          top: this.top,
          startDate: this.dateRangePickerComponent?.getStart(),
          endDate: this.dateRangePickerComponent?.getEnd()
        });
      }
    }
  }

  onMarketChange(market: number): void {
    this.market = market;
    if (this.hasCategories()) {
      if (this.style === 0 && this.kendoTreemapComponent) {
        this.kendoTreemapComponent.updateParams({
          market: this.market,
          categories: this.initialCategories,
          rperiod: this.rperiod,
          top: this.top,
          startDate: this.dateRangePickerComponent?.getStart(),
          endDate: this.dateRangePickerComponent?.getEnd()
        });
      } else if (this.style === 1 && this.marketBoardComponent) {
        this.marketBoardComponent.updateParams({
          market: this.market,
          categories: this.initialCategories,
          rperiod: this.rperiod,
          top: this.top,
          startDate: this.dateRangePickerComponent?.getStart(),
          endDate: this.dateRangePickerComponent?.getEnd()
        });
      }
    }
  }

  changeDate(ev: any) {
    this.dateRangeSelectorComponent.setCustom();
    if (this.hasCategories()) {
      if (this.style === 0 && this.kendoTreemapComponent) {
        this.kendoTreemapComponent.updateParams({
          startDate: ev.start,
          endDate: ev.end,
          categories: this.initialCategories,
          rperiod: this.rperiod,
          market: this.market,
          top: this.top
        });
      } else if (this.style === 1 && this.marketBoardComponent) {
        this.marketBoardComponent.updateParams({
          startDate: ev.start,
          endDate: ev.end,
          categories: this.initialCategories,
          rperiod: this.rperiod,
          market: this.market,
          top: this.top
        });
      }
    }
  }

  changeTop(ev: number) {
    this.top = ev;
    if (this.hasCategories()) {
      if (this.style === 0 && this.kendoTreemapComponent) {
        this.kendoTreemapComponent.updateParams({
          top: this.top,
          categories: this.initialCategories,
          rperiod: this.rperiod,
          market: this.market,
          startDate: this.dateRangePickerComponent?.getStart(),
          endDate: this.dateRangePickerComponent?.getEnd()
        });
      } else if (this.style === 1 && this.marketBoardComponent) {
        this.marketBoardComponent.updateParams({
          top: this.top,
          categories: this.initialCategories,
          rperiod: this.rperiod,
          market: this.market,
          startDate: this.dateRangePickerComponent?.getStart(),
          endDate: this.dateRangePickerComponent?.getEnd()
        });
      }
    }
  }

  applyPreset(foundPreset: FootPrintRequestModel) {
    this.rperiod = foundPreset.rperiod;
    let startDate = foundPreset.startDate;
    let endDate = foundPreset.endDate;
    this.dateRangePickerComponent.setDatesRange(startDate, endDate);

    if (this.hasCategories()) {
      if (this.style === 0 && this.kendoTreemapComponent) {
        this.kendoTreemapComponent.updateParams({
          startDate: startDate,
          endDate: endDate,
          categories: this.initialCategories,
          rperiod: this.rperiod,
          market: this.market,
          top: this.top
        });
      } else if (this.style === 1 && this.marketBoardComponent) {
        this.marketBoardComponent.updateParams({
          startDate: startDate,
          endDate: endDate,
          categories: this.initialCategories,
          rperiod: this.rperiod,
          market: this.market,
          top: this.top
        });
      }
    }
  }

  onStyleChange(newStyle: number) {
    this.style = newStyle;
    if (this.hasCategories()) {
      if (this.style === 0 && this.kendoTreemapComponent) {
        this.kendoTreemapComponent.updateParams({
          categories: this.initialCategories,
          rperiod: this.rperiod,
          market: this.market,
          top: this.top,
          startDate: this.dateRangePickerComponent?.getStart(),
          endDate: this.dateRangePickerComponent?.getEnd()
        });
      } else if (this.style === 1 && this.marketBoardComponent) {
        this.marketBoardComponent.updateParams({
          categories: this.initialCategories,
          rperiod: this.rperiod,
          market: this.market,
          top: this.top,
          startDate: this.dateRangePickerComponent?.getStart(),
          endDate: this.dateRangePickerComponent?.getEnd()
        });
      }
    }
  }

  hasCategories(): boolean {
    return true;// this.initialCategories && this.initialCategories.trim() !== '';
  }
}
