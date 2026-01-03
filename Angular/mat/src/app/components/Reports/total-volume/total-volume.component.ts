import { formatDate, CommonModule } from '@angular/common';
import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  HostListener,
  AfterViewInit,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { Chart } from 'chart.js/auto';
import { ReportsService } from 'src/app/service/reports.service';
import localeRu from '@angular/common/locales/ru';
import { SelectListItemNumber } from 'src/app/models/preserts';
import { Title } from '@angular/platform-browser';
import { MarketSelectorComponent } from '../../Controls/MarketSelector/market-selector.component';
import { ComboBoxComponent } from '../../Controls/ComboBox/combobox.component';

@Component({
  standalone: true,
  selector: 'app-total-volume',
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MarketSelectorComponent,
    ComboBoxComponent,
  ],
  templateUrl: './total-volume.component.html',
  styleUrls: ['./total-volume.component.css'],
})
export class TotalVolumeComponent implements OnInit, AfterViewInit {
  @ViewChild('chartCanvas', { static: true })
  chartCanvas: ElementRef<HTMLCanvasElement>;
  @ViewChild('header', { static: true }) header: ElementRef<HTMLElement>;
  private chart: Chart;

  public yearsList: SelectListItemNumber[] = [];

  public groupList: SelectListItemNumber[] = [
    { Value: 0, Text: 'День' },
    { Value: 1, Text: 'Неделя' },
    { Value: 2, Text: 'Месяц' },
    { Value: 3, Text: 'Квартал' },
    { Value: 4, Text: '1/2Года' },
    { Value: 5, Text: 'Год' },
  ];

  public selectedYear = new Date().getFullYear();
  public selectedYear2 = new Date().getFullYear();
  public selectedMarket: number = 0;
  public selectedGroup: number = 0;

  constructor(
    private stockService: ReportsService,
    private elementRef: ElementRef,
    private titleService: Title
  ) {
    titleService.setTitle('Общий объем торгов биржи');
  }

  ngOnInit(): void {
    this.yearsList = this.getYearsList();
    this.updateChart();
  }

  ngAfterViewInit(): void {
    this.adjustSize();
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: Event) {
    this.adjustSize();
  }

  ngOnDestroy(): void {
    if (this.chart) {
      this.chart.destroy();
    }
  }

  getYearsList(): SelectListItemNumber[] {
    const currentYear = new Date().getFullYear();
    const years: SelectListItemNumber[] = [];
    for (let i = currentYear; i >= 2000; i--) {
      years.push({ Text: `${i}`, Value: i });
    }
    return years;
  }

  updateChart(): void {
    this.stockService
      .getMarketCandlesVolume(
        this.selectedYear,
        this.selectedYear2,
        this.selectedMarket,
        this.selectedGroup
      )
      .subscribe((data) => {
        const labels = data.map((item) =>
          formatDate(new Date(item.Date), 'dd-MM-yyyy', 'ru-RU')
        );
        const volumes = data.map((item) => item.Volume);

        if (this.chart) {
          this.chart.destroy();
        }

        this.chart = new Chart(this.chartCanvas.nativeElement, {
          type: 'bar',
          data: {
            labels: labels,
            datasets: [
              {
                label: 'Объем',
                data: volumes,
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              title: {
                display: true,
                text: `Дневной торгов (в млрд. руб.) на ${this.getMarketName(
                  this.selectedMarket
                )} за ${this.selectedYear} год`,
              },
              tooltip: {
                callbacks: {
                  label: function (context) {
                    return ` ${context.raw} млрд. рублей`;
                  },
                },
              },
            },
          },
        });

        this.adjustSize(); // Adjust size after chart is created
      });
  }

  getMarketName(market: number): string {
    return market === 3
      ? 'Валютной секции'
      : market === 0
      ? 'ММВБ'
      : 'FORTS';
  }

  private adjustSize(): void {
    const canvasElement = this.chartCanvas.nativeElement;
    const containerHeight = window.innerHeight;
    const offsetTop = canvasElement.getBoundingClientRect().top;

    const availableHeight = containerHeight - offsetTop - 20; // 20 for some padding/margin

    const canvasContainer =
      this.elementRef.nativeElement.querySelector('.canvas-container');
    if (canvasContainer) {
      canvasContainer.style.height = `${availableHeight}px`;
      if (this.chart) {
        this.chart.resize(window.innerWidth - 501, availableHeight);
      }
    }
  }
}
