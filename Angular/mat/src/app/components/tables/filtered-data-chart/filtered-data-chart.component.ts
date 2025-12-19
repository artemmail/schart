import { AfterViewInit, Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { Chart } from 'chart.js/auto';
import { map, Observable } from 'rxjs';
import { stat_dic, STOCK_TICKERS } from 'src/app/data/companyinfo';
import { FilteredDataResult } from 'src/app/models/fundamental.model';
import { DataService } from 'src/app/service/companydata.service';

@Component({
  standalone: false,
  selector: 'app-filtered-data-chart',
  templateUrl: './filtered-data-chart.component.html',
  styleUrls: ['./filtered-data-chart.component.css']
})
export class FilteredDataChartComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() ticker: string = '';
  @Input() nameToFilter: string = '';
  @Input() standart: string = 'MSFO';

  @ViewChild('yearChartCanvas', { static: true }) yearChartCanvas: ElementRef<HTMLCanvasElement>;
  @ViewChild('quarterChartCanvas', { static: true }) quarterChartCanvas: ElementRef<HTMLCanvasElement>;
  @ViewChild('yearChangeChartCanvas', { static: true }) yearChangeChartCanvas: ElementRef<HTMLCanvasElement>;
  @ViewChild('quarterChangeChartCanvas', { static: true }) quarterChangeChartCanvas: ElementRef<HTMLCanvasElement>;

  private yearChart: Chart;
  private quarterChart: Chart;
  private yearChangeChart: Chart;
  private quarterChangeChart: Chart;

  filteredDataY$: Observable<FilteredDataResult>;
  filteredDataQ$: Observable<FilteredDataResult>;

  displayName: string = ''; // Имя показателя
  companyName: string = ''; // Имя компании

  constructor(private dataService: DataService, private route: ActivatedRoute, private titleService: Title) {
     this.titleService = titleService;
  }





  ngOnInit(): void {
    // Получаем параметры из маршрута
    this.route.params.subscribe(params => {
      this.standart = params['standart'];
      this.ticker = params['ticker'];
      this.nameToFilter = params['filtername'];


      this.displayName =  stat_dic[this.nameToFilter] || this.nameToFilter;
      this.companyName =  STOCK_TICKERS[this.ticker] || this.ticker;
      this.titleService.setTitle(`Квартальный и годовой ${this.displayName} для ${this.companyName}`);


      if (this.ticker && this.nameToFilter) {
        // Загружаем данные по годам и кварталам
        this.filteredDataY$ = this.dataService.loadFilteredData(this.ticker, this.nameToFilter, this.standart, 'y');
        this.filteredDataQ$ = this.dataService.loadFilteredData(this.ticker, this.nameToFilter, this.standart, 'q');

        // Получаем имя компании
     

        // Устанавливаем имя показателя (displayName) из данных
       
      }
    });
  }

  ngAfterViewInit(): void {
    if (this.ticker && this.nameToFilter) {
      this.setupYearChart();
      this.setupQuarterChart();
      this.setupYearChangeChart();
      this.setupQuarterChangeChart();
    }
  }

  ngOnDestroy(): void {
    if (this.yearChart) this.yearChart.destroy();
    if (this.quarterChart) this.quarterChart.destroy();
    if (this.yearChangeChart) this.yearChangeChart.destroy();
    if (this.quarterChangeChart) this.quarterChangeChart.destroy();
  }

  private calculatePercentageChange(data: number[]): number[] {
    const changes = [];
    for (let i = 1; i < data.length; i++) {
      const change = ((data[i] - data[i - 1]) / data[i - 1]) * 100;
      changes.push(change);
    }
    return changes;
  }

  private setupYearChart(): void {
    this.filteredDataY$.pipe(
      map(filteredDataY => {
        const labelsY = filteredDataY.filteredData.map(item => item.year);
        const dataY = filteredDataY.filteredData.map(item => item.value);
        const name = filteredDataY.displayName;
        return { labelsY, dataY, name };
      })
    ).subscribe(({ labelsY, dataY, name }) => {
      this.displayName =name.split(',')[0];

      if (this.yearChart) this.yearChart.destroy();

      this.yearChart = new Chart(this.yearChartCanvas.nativeElement, {
        type: 'bar',
        data: {
          labels: labelsY,
          datasets: [{
            label: `${name} по годам`,
            data: dataY,
            backgroundColor: 'rgba(75, 192, 192, 0.7)',
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: { x: { beginAtZero: true }, y: { beginAtZero: true } },
        },
      });
    });
  }

  private setupQuarterChart(): void {
    this.filteredDataQ$.pipe(
      map(filteredDataQ => {
        const labelsQ = filteredDataQ.filteredData.map(item => item.year);
        const dataQ = filteredDataQ.filteredData.map(item => item.value);
        const name = filteredDataQ.displayName;
        return { labelsQ, dataQ, name };
      })
    ).subscribe(({ labelsQ, dataQ, name }) => {
     

      if (this.quarterChart) this.quarterChart.destroy();

      this.quarterChart = new Chart(this.quarterChartCanvas.nativeElement, {
        type: 'bar',
        data: {
          labels: labelsQ,
          datasets: [{
            label: `${name} по кварталам`,
            data: dataQ,
            backgroundColor: 'rgba(192, 75, 192, 0.7)',
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: { x: { beginAtZero: true }, y: { beginAtZero: true } },
        },
      });
    });
  }

  private setupYearChangeChart(): void {
    this.filteredDataY$.pipe(
      map(filteredDataY => {
        const labelsY = filteredDataY.filteredData.slice(1).map(item => item.year);
        const dataY = filteredDataY.filteredData.map(item => item.value);
        const name = filteredDataY.displayName;
        const changesY = this.calculatePercentageChange(dataY);
        return { labelsY, changesY, name };
      })
    ).subscribe(({ labelsY, changesY, name }) => {
   

      if (this.yearChangeChart) this.yearChangeChart.destroy();

      this.yearChangeChart = new Chart(this.yearChangeChartCanvas.nativeElement, {
        type: 'bar',
        data: {
          labels: labelsY,
          datasets: [{
            label: `Изменения ${name} по годам (%)`,
            data: changesY,
            backgroundColor: changesY.map(change => change >= 0 ? 'rgba(75, 192, 75, 0.7)' : 'rgba(192, 75, 75, 0.7)'),
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: { x: { beginAtZero: true }, y: { beginAtZero: true } },
        },
      });
    });
  }

  private setupQuarterChangeChart(): void {
    this.filteredDataQ$.pipe(
      map(filteredDataQ => {
        const labelsQ = filteredDataQ.filteredData.slice(1).map(item => item.year);
        const dataQ = filteredDataQ.filteredData.map(item => item.value);
        const name = filteredDataQ.displayName;
        const changesQ = this.calculatePercentageChange(dataQ);
        return { labelsQ, changesQ, name };
      })
    ).subscribe(({ labelsQ, changesQ, name }) => {
      this.displayName = name.split(',')[0];

      

      if (this.quarterChangeChart) this.quarterChangeChart.destroy();

      this.quarterChangeChart = new Chart(this.quarterChangeChartCanvas.nativeElement, {
        type: 'bar',
        data: {
          labels: labelsQ,
          datasets: [{
            label: `Изменения ${name} по кварталам (%)`,
            data: changesQ,
            backgroundColor: changesQ.map(change => change >= 0 ? 'rgba(75, 192, 75, 0.7)' : 'rgba(192, 75, 75, 0.7)'),
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: { x: { beginAtZero: true }, y: { beginAtZero: true } },
        },
      });
    });
  }

  
}
