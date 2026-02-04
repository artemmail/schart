import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { STOCK_TICKERS } from 'src/app/data/companyinfo';
import { RecommendationListComponent } from '../recommendation-list/recommendation-list.component';
import { CompanyTableComponent } from '../../tables/company-table/company-table.component';
import { DividendsTableComponent } from '../../tables/dividends-table/dividends-table.component';
import { CommonService, FutureSeriesItem } from 'src/app/service/common.service';
import { FootPrintParameters } from 'src/app/models/Params';
import { FootprintWidgetComponent } from 'src/app/components/footprint/components/footprint-widget/footprint-widget.component';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/app/environment';
import { FuturesSeriesTableComponent } from 'src/app/components/Controls/futures-series-table/futures-series-table.component';

interface InstrumentRelationItem {
  dictionaryId: number;
  securityId: string;
  shortname?: string;
  market?: number;
  isin?: string;
  regNumber?: string;
  maturityDate?: string | Date | null;
  faceValue?: number | null;
  currency?: string;
  primaryBoardId?: string;
  currentYield?: number | null;
  currentPrice?: number | null;
}

interface InstrumentRelationsDto {
  stock: InstrumentRelationItem | null;
  bonds: InstrumentRelationItem[];
  futures: InstrumentRelationItem[];
  options: InstrumentRelationItem[];
}


@Component({
  standalone: true,
  selector: 'app-statements',
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatTabsModule,
    MatCardModule,
    RecommendationListComponent,
    CompanyTableComponent,
    DividendsTableComponent,
    FootprintWidgetComponent,
    FuturesSeriesTableComponent,
  ],
  templateUrl: './statements.component.html',
  styleUrls: ['./statements.component.css']
})
export class StatementsComponent implements OnInit {
  ticker: string = '';
  companyName: string = '';
  selectedTabIndex: number = 0;
  title: string ='';
  titlediv: string ='';
  titleshare: string ='';
  titlefin: string ='';
  miniParams: FootPrintParameters | null = null;
  miniLoading = false;
  relations: InstrumentRelationsDto | null = null;
  relationsLoading = false;
  futuresSeries: FutureSeriesItem[] = [];
  futuresSeriesLoading = false;
  futuresSeriesError = '';
  futuresSeriesSource: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private titleService: Title,
    private commonService: CommonService,
    private http: HttpClient
  ) {}


  
  

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.ticker = ( params.get('ticker') || 'MTSS').toUpperCase();
      this.companyName = STOCK_TICKERS[this.ticker];

      this.title = `Финансовая отчетность по стандартам РСБУ и МСФО для компании ${this.companyName} (${this.ticker})`;
      this.titlediv = `Дивиденды компании ${this.companyName} (${this.ticker}) история, доходность, даты отсечек`;
      this.titleshare = `Структура и состав акционеров компании ${this.companyName} (${this.ticker})`;
      this.titlefin = `Финансовые показатели для компании ${this.companyName} (${this.ticker})`;
      this.titleService.setTitle(`${this.companyName} (${this.ticker}) Финансовая отчетность РСБУ,МСФО`);

      // Можно настроить выбор вкладки на основе параметров URL или других факторов
      const tabParam = params.get('tab');
      if (tabParam) {
        this.selectedTabIndex = ['msfo-y', 'msfo-q', 'rsbu-y', 'rsbu-q'].indexOf(tabParam);
      }

      this.loadMiniChart(this.ticker);
      this.loadRelations(this.ticker);
    });
  }

  onTabChange(index: number): void {
    // Обновляем URL при смене вкладки
    const tab = ['msfo-y', 'msfo-q', 'rsbu-y', 'rsbu-q'][index];
    // Можно обновить роутинг или изменить логику в зависимости от выбранной вкладки
  }

  get hasBonds(): boolean {
    return (this.relations?.bonds?.length ?? 0) > 0;
  }

  get hasFutures(): boolean {
    return (this.relations?.futures?.length ?? 0) > 0;
  }

  get hasOptions(): boolean {
    return (this.relations?.options?.length ?? 0) > 0;
  }

  private loadMiniChart(ticker: string): void {
    this.miniLoading = true;
    this.miniParams = null;

    this.commonService.getControlsNew({
      ticker,
      candlesOnly: true,
      rperiod: 'year',
      period: 1440
    }).subscribe({
      next: (data) => {
        this.miniParams = {
          ticker,
          period: 1440,
          priceStep: data.priceStep ?? data.minStep ?? 1,
          candlesOnly: true,
          startDate: data.startDate,
          endDate: data.endDate,
          rperiod: data.rperiod
        };
        this.miniLoading = false;
      },
      error: () => {
        this.miniLoading = false;
      }
    });
  }

  private loadRelations(ticker: string): void {
    this.relationsLoading = true;
    this.relations = null;
    this.futuresSeries = [];
    this.futuresSeriesLoading = false;
    this.futuresSeriesError = '';
    this.futuresSeriesSource = null;

    const url = `${environment.apiUrl}/api/relations/${ticker}`;
    this.http.get<any>(url).subscribe({
      next: (raw) => {
        this.relations = this.normalizeRelations(raw);
        this.relationsLoading = false;
        this.loadFuturesSeriesFromRelations();
      },
      error: () => {
        this.relations = { stock: null, bonds: [], futures: [], options: [] };
        this.relationsLoading = false;
      }
    });
  }

  private loadFuturesSeriesFromRelations(): void {
    const futures = this.relations?.futures ?? [];
    const first = futures.find(f => !!f.securityId)?.securityId ?? '';
    if (!first) {
      this.futuresSeries = [];
      return;
    }

    const fallbackBase = this.extractBaseCode(first);
    this.fetchFuturesSeries(first, fallbackBase);
  }

  private fetchFuturesSeries(ticker: string, fallbackBase?: string): void {
    this.futuresSeriesLoading = true;
    this.futuresSeriesError = '';
    this.futuresSeriesSource = ticker;

    this.commonService.getFutInfo(ticker).subscribe({
      next: (info) => {
        this.futuresSeries = info.another_futures ?? [];
        this.futuresSeriesLoading = false;
      },
      error: () => {
        if (fallbackBase && fallbackBase !== ticker) {
          this.commonService.getFutInfo(fallbackBase).subscribe({
            next: (info) => {
              this.futuresSeries = info.another_futures ?? [];
              this.futuresSeriesSource = fallbackBase;
              this.futuresSeriesLoading = false;
            },
            error: () => {
              this.futuresSeries = [];
              this.futuresSeriesError = 'Не удалось загрузить фьючерсы серии.';
              this.futuresSeriesLoading = false;
            }
          });
          return;
        }

        this.futuresSeries = [];
        this.futuresSeriesError = 'Не удалось загрузить фьючерсы серии.';
        this.futuresSeriesLoading = false;
      }
    });
  }

  private extractBaseCode(securityId: string): string {
    const trimmed = securityId.trim().toUpperCase();
    if (trimmed.length <= 2) {
      return trimmed;
    }
    return trimmed.substring(0, 2);
  }

  private normalizeRelations(raw: any): InstrumentRelationsDto {
    const mapItem = (item: any): InstrumentRelationItem => ({
      dictionaryId: item?.dictionaryId ?? item?.DictionaryId ?? 0,
      securityId: item?.securityId ?? item?.securityid ?? item?.SecurityId ?? '',
      shortname: item?.shortname ?? item?.Shortname ?? '',
      market: item?.market ?? item?.Market ?? null,
      isin: item?.isin ?? item?.Isin ?? '',
      regNumber: item?.regNumber ?? item?.RegNumber ?? '',
      maturityDate: item?.maturityDate ?? item?.MaturityDate ?? null,
      faceValue: item?.faceValue ?? item?.FaceValue ?? null,
      currency: item?.currency ?? item?.Currency ?? '',
      primaryBoardId: item?.primaryBoardId ?? item?.PrimaryBoardId ?? '',
      currentYield: item?.currentYield ?? item?.CurrentYield ?? null,
      currentPrice: item?.currentPrice ?? item?.CurrentPrice ?? null
    });

    const bondsRaw = raw?.bonds ?? raw?.Bonds ?? [];
    const futuresRaw = raw?.futures ?? raw?.Futures ?? [];
    const optionsRaw = raw?.options ?? raw?.Options ?? [];
    const stockRaw = raw?.stock ?? raw?.Stock ?? null;

    return {
      stock: stockRaw ? mapItem(stockRaw) : null,
      bonds: Array.isArray(bondsRaw) ? bondsRaw.map(mapItem) : [],
      futures: Array.isArray(futuresRaw) ? futuresRaw.map(mapItem) : [],
      options: Array.isArray(optionsRaw) ? optionsRaw.map(mapItem) : []
    };
  }
}
