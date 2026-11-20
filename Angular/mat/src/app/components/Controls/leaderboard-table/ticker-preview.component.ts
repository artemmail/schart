import { Component, Input, OnChanges, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DateTime } from 'luxon';
import { Subscription } from 'rxjs';
import { FootPrintRequestParamsNew } from 'src/app/models/FootPrintPar';
import { FootPrintParameters } from 'src/app/models/Params';
import { CommonService } from 'src/app/service/common.service';
import { FootprintWidgetComponent } from '../../footprint/components/footprint-widget/footprint-widget.component';

const ranges = [
  { label: '1д', title: '1 день', value: 'day', period: 15 },
  { label: '1н', title: '1 неделя', value: 'week', period: 120 },
  { label: '1м', title: '1 месяц', value: 'month', period: 1440 },
  { label: '6м', title: '6 месяцев', value: 'halfyear', period: 1440 },
  { label: '1г', title: '1 год', value: 'year', period: 10080 },
  { label: '5л', title: '5 лет', value: 'fiveYears', period: 30000 },
  { label: 'Макс.', title: 'Весь период', value: 'all', period: 30000 },
];

@Component({
  selector: 'app-ticker-preview',
  standalone: true,
  imports: [FootprintWidgetComponent, RouterLink],
  templateUrl: './ticker-preview.component.html',
  styleUrl: './ticker-preview.component.css',
})
export class TickerPreviewComponent implements OnChanges, OnDestroy {
  @Input() queryParams: FootPrintRequestParamsNew | null = null;

  readonly ranges = ranges;
  selectedRange = ranges[0];
  chartParams: FootPrintParameters | null = null;
  status = 'Щёлкните по строке, чтобы увидеть свечи';

  private request?: Subscription;

  constructor(private commonService: CommonService) {}

  ngOnChanges(): void {
    this.loadChartParams();
  }

  ngOnDestroy(): void {
    this.request?.unsubscribe();
  }

  selectRange(range: (typeof ranges)[number]): void {
    if (range !== this.selectedRange) {
      this.selectedRange = range;
      this.loadChartParams();
    }
  }

  private loadChartParams(): void {
    this.request?.unsubscribe();
    this.chartParams = null;
    const ticker = this.queryParams?.ticker;
    if (!ticker) {
      this.status = 'Щёлкните по строке, чтобы увидеть свечи';
      return;
    }

    const { value, period } = this.selectedRange;
    const isFiveYears = value === 'fiveYears';
    this.status = 'Загрузка графика…';
    this.request = this.commonService.getControlsNew({
      ticker, period, rperiod: isFiveYears ? 'day' : value, candlesOnly: true,
    }).subscribe({
      next: ({ startDate, endDate, priceStep }) => {
        this.chartParams = {
          ticker,
          period,
          priceStep,
          startDate: isFiveYears ? DateTime.fromJSDate(endDate).minus({ years: 5 }).toJSDate() : startDate,
          endDate,
          candlesOnly: true,
        };
      },
      error: () => {
        this.status = 'Не удалось загрузить график';
      },
    });
  }
}
