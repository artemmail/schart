import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Chart } from 'chart.js/auto';
import { DateRangePickerComponent } from '../../Controls/DateRange/date-range-picker.component';
import { PresetSelectorComponent } from '../../Controls/PresetSelector/preset-selector.component';
import { TickerAutocompleteComponent } from '../../Controls/ticker-autocomplete/ticker-autocomplete.component';
import {
  BigPeriodPreset,
  SelectListItemNumber,
  SelectListItemText,
  SmallPeriodPreset,
  SmallPeriodPresetShort,
} from 'src/app/models/preserts';
import {
  FootPrintRequestModel,
  TickerPreset,
} from 'src/app/models/tickerpreset';
import { FootPrintRequestParams } from 'src/app/models/FootPrintPar';
import { Observable, tap } from 'rxjs';
import { CommonService } from 'src/app/service/common.service';
import { removeUTC } from 'src/app/service/FootPrint/Formating/formatting.service';
import { Title } from '@angular/platform-browser';

interface VolumeStat {
  Volume: number;
  Date: string;
}

interface ATRStat {
  Min: number;
  Max: number;
  Avg: number;
  Date: string;
}

interface SeriesData {
  Candles: number;
  Count: number;
}

interface Series {
  Grow: SeriesData[];
  Fall: SeriesData[];
}

interface CandleStats {
  VolumeStat: VolumeStat[];
  ATRStat: ATRStat[];
  Series: Series;
}

@Component({
  standalone: false,
  selector: 'app-candles-stat',
  templateUrl: './candles-stat.component.html',
  styleUrls: ['./candles-stat.component.css'],
})
export class CandlesStatComponent implements OnInit {
  @ViewChild(DateRangePickerComponent) DateRange: DateRangePickerComponent;
  @ViewChild(TickerAutocompleteComponent)  tickerAutocomplete: TickerAutocompleteComponent;
  @ViewChild('presetSelector') presetSelector: PresetSelectorComponent;
  ticker: string = 'GAZP';

  smallPeriodPresetShort = SmallPeriodPresetShort;
  selectedValue = 15.0;
  
  presets = BigPeriodPreset;
  selectedPreset: string = 'year';
  selectedPreset2: number;

  tickerPreset: TickerPreset;

  title: string = 'Статистика свечного графика';

  // Define chart instances
  growChart: Chart | null = null;
  fallChart: Chart | null = null;
  volumeChart: Chart | null = null;
  atrChart: Chart | null = null;

  constructor(
    private http: HttpClient,
    
    private commonservice: CommonService,
    private cd: ChangeDetectorRef,
    private titleService: Title ) {
    titleService.setTitle("Статистика свченого графика");}


  ngOnInit(): void {
    this.titleService.setTitle(this.title);
    this.initCharts();
  }

  public GetModel(): any {
    const res: any = {
      ticker: this.ticker,
      period: this.selectedValue,
      startDate: this.DateRange.getStart(),
      endDate: this.DateRange.getEnd(),
    };

    return res;
  }

  public ngAfterViewInit() {
    this.onTickerSelected(this.ticker);
    this.cd.detectChanges();
  }

  onTickerSelected1(params: FootPrintRequestParams): Observable<TickerPreset> {
    return this.commonservice.getControls(params).pipe(
      tap((x: TickerPreset) => {
        
        // Действия с полученными данными
        this.tickerPreset = x;
        if (params.rperiod) this.selectedPreset = params.rperiod;
        this.applyPreset({ value: this.selectedPreset });
        if (params.period) this.selectedValue = params.period;
      })
    );
  }

  onTickerSelected(ticker: string) {
    this.onTickerSelected1({ ticker: ticker }).subscribe((e) => {
      //  alert(333333333);
      //   this.applyPreset({ value: 'year' });
      this.showProfit();
    });
  }



  applyPresetX(val: any) {
    this.cd.detectChanges();
    this.showProfit();
  }
  applyPreset(val: any) {
    
    const foundPreset: FootPrintRequestModel =
      this.tickerPreset.presetList.find(
        (preset) => preset.rperiod === val.value
      );

    if (foundPreset) {
      this.DateRange.setDatesRange((foundPreset.startDate),(foundPreset.endDate));


      //this.selectedValue = foundPreset.period;
      this.selectedPreset = this.tickerPreset.rperiod;
     // this.ticker = this.tickerPreset.ticker;

      // Добавьте эту строку для уведомления Angular об изменениях
      this.cd.detectChanges();
      this.showProfit();
    }
  }

  showProfit(): void {
    var m = this.GetModel();
    const params = new HttpParams()
      .set('ticker', m.ticker)
      .set('period', m.period)
      .set('startDate', removeUTC( m.startDate))
      .set('endDate', removeUTC( m.endDate));

      /*

      if (m.startDate)
        params.set('startDate', removeUTC( m.startDate));

      if (m.startDate)
        params.set('endDate', removeUTC( m.endDate));
      */
    this.http
      .get<CandleStats>('/api/Candles/getStats', { params })
      .subscribe((data: CandleStats) => {
        this.updateCharts(data);
      });
  }

  initCharts(): void {
    this.growChart = new Chart('map3', {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: 'Свечей роста подряд',
            data: [],
            fill: false,
            borderColor: 'rgb(75, 192, 192)',
            tension: 0.1,
          },
        ],
      },
      options: {
        responsive: true,
      },
    });

    this.fallChart = new Chart('map4', {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: 'Свечей падения подряд',
            data: [],
            fill: false,
            borderColor: 'rgb(255, 99, 132)',
            tension: 0.1,
          },
        ],
      },
      options: {
        responsive: true,
      },
    });

    this.volumeChart = new Chart('map2', {
      type: 'bar',
      data: {
        labels: [],
        datasets: [
          {
            label: 'Динамика объёма внутри дня (среднее за период)',
            data: [],
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        scales: {
          x: {
            beginAtZero: true,
          },
          y: {
            beginAtZero: true,
          },
        },
      },
    });

    this.atrChart = new Chart('map1', {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: 'ATR(Min)',
            data: [],
            borderColor: 'rgba(255, 159, 64, 1)',
            fill: false,
            tension: 0.1,
          },
          {
            label: 'ATR(Max)',
            data: [],
            borderColor: 'rgba(153, 102, 255, 1)',
            fill: false,
            tension: 0.1,
          },
          {
            label: 'ATR(Avg)',
            data: [],
            borderColor: 'rgba(75, 192, 192, 1)',
            fill: false,
            tension: 0.1,
          },
        ],
      },
      options: {
        responsive: true,
      },
    });
  }

  updateCharts(data: CandleStats): void {
    // Update volumeChart data
    const volumeLabels = data.VolumeStat.map((item: VolumeStat) => item.Date);
    const volumeData = data.VolumeStat.map((item: VolumeStat) => item.Volume);
    if (this.volumeChart) {
      this.volumeChart.data.labels = volumeLabels;
      this.volumeChart.data.datasets[0].data = volumeData;
      this.volumeChart.update();
    }

    // Update atrChart data
    const atrLabels = data.ATRStat.map((item: ATRStat) => item.Date);
    const atrMinData = data.ATRStat.map((item: ATRStat) => item.Min);
    const atrMaxData = data.ATRStat.map((item: ATRStat) => item.Max);
    const atrAvgData = data.ATRStat.map((item: ATRStat) => item.Avg);
    if (this.atrChart) {
      this.atrChart.data.labels = atrLabels;
      this.atrChart.data.datasets[0].data = atrMinData;
      this.atrChart.data.datasets[1].data = atrMaxData;
      this.atrChart.data.datasets[2].data = atrAvgData;
      this.atrChart.update();
    }

    // Update growChart data
    const growLabels = data.Series.Grow.map((item: SeriesData) =>
      item.Candles.toString()
    );
    const growData = data.Series.Grow.map((item: SeriesData) => item.Count);
    if (this.growChart) {
      this.growChart.data.labels = growLabels;
      this.growChart.data.datasets[0].data = growData;
      this.growChart.update();
    }

    // Update fallChart data
    const fallLabels = data.Series.Fall.map((item: SeriesData) =>
      item.Candles.toString()
    );
    const fallData = data.Series.Fall.map((item: SeriesData) => item.Count);
    if (this.fallChart) {
      this.fallChart.data.labels = fallLabels;
      this.fallChart.data.datasets[0].data = fallData;
      this.fallChart.update();
    }
  }
}
