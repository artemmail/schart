import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, shareReplay } from 'rxjs';
import { environment } from '../environment';

import { TickerPreset, TickerPresetNew } from '../models/tickerpreset';
import { FootPrintRequestParams, FootPrintRequestParamsNew } from '../models/FootPrintPar';
import { SelectListItemNumber, SelectListItemParams, SelectListItemText } from '../models/preserts';
import { addUTC, removeUTC } from './FootPrint/Formating/formatting.service';


export interface AnotherFuture {
  Securityid: string;
  lastPrice: number;
}

export interface FutInfo {
  fullName: string;
  shortName: string;
  minStep: number;
  expriation: Date;  // Изменено с string на Date
  lastPrice: number;
  volume: number;
  oi: number;
  oiDelta: number;
  another_futures: AnotherFuture[];
  options: string[];
}


@Injectable({
  providedIn: 'root'
})
export class CommonService {
  constructor(private http: HttpClient) {}

  private categories$: Observable<SelectListItemText[]>;
  private markets$: Observable<SelectListItemNumber[]>;
  private presetsCache = new Map<string, Observable<SelectListItemParams[]>>();

  public Markets(): Observable<SelectListItemNumber[]> {
    if (!this.markets$) {
      this.markets$ = this.http.get<SelectListItemNumber[]>(`${environment.apiUrl}/api/common/marketsnum`)
        .pipe(shareReplay(1)); // Кешируем результат
    }
    return this.markets$;
  }

  public Categories(): Observable<SelectListItemText[]> {
    if (!this.categories$) {
      this.categories$ = this.http.get<SelectListItemText[]>(`${environment.apiUrl}/api/common/categories`)
        .pipe(shareReplay(1)); // Кешируем результат
    }
    return this.categories$;
  }

  public getFutInfo(ticker: string): Observable<FutInfo> {
    return this.http.get<FutInfo>(`${environment.apiUrl}/api/common/futinfo/${ticker}`).pipe(
      map(data => ({
        ...data,
        expriation: new Date(data.expriation)  // Парсинг строки в Date
      }))
    );
  }

  public PresetsItems(ticker: string): Observable<SelectListItemParams[]> {
    if (!this.presetsCache.has(ticker)) {
      const params = new HttpParams().set('ticker', ticker);
      const observable = this.http.get<SelectListItemParams[]>(`${environment.apiUrl}/api/common/presets`, { params })
        .pipe(
          map(presets => this.convertDatesInPresets(presets)),
          shareReplay(1) // Кешируем результат
        );
      this.presetsCache.set(ticker, observable);
    }
    return this.presetsCache.get(ticker);
  }

  toHttpParams(params: FootPrintRequestParams): HttpParams {
    let httpParams = new HttpParams();

    if (params.ticker !== undefined) {
      httpParams = httpParams.set('ticker', params.ticker);
    }

    if (params.priceStep !== undefined) {
      httpParams = httpParams.set('priceStep', params.priceStep.toString());
    }

    if (params.startDate !== undefined) {
      httpParams = httpParams.set('startDate', removeUTC(params.startDate));
    }

    if (params.endDate !== undefined) {
      httpParams = httpParams.set('endDate', removeUTC(params.endDate));
    }

    if (params.postmarket !== undefined) {
      httpParams = httpParams.set('postmarket', params.postmarket.toString());
    }

    if (params.rperiod !== undefined) {
      httpParams = httpParams.set('rperiod', params.rperiod);
    }

    if (params.period !== undefined) {
      httpParams = httpParams.set('period', params.period.toString());
    }

    return httpParams;
  }

  public getControls(params: FootPrintRequestParams): Observable<TickerPreset> {
    return this.http.get<TickerPreset>('/api/common/jsonChartControls', {
      withCredentials: true,
      params: this.toHttpParams(params)
    }).pipe(
      map(preset => this.convertDatesInPreset(preset))
    );
  }

  toHttpParamsNew(params: FootPrintRequestParamsNew): HttpParams {
    let httpParams = new HttpParams();

    if (params.ticker !== undefined) {
      httpParams = httpParams.set('ticker', params.ticker);
    }

    if (params.priceStep !== undefined) {
      httpParams = httpParams.set('priceStep', params.priceStep.toString());
    }

    if (params.startDate !== undefined) {
      httpParams = httpParams.set('startDate', removeUTC( params.startDate));
    }

    if (params.endDate !== undefined) {
      httpParams = httpParams.set('endDate', removeUTC(params.endDate));
    }

    if (params.rperiod !== undefined) {
      httpParams = httpParams.set('rperiod', params.rperiod);
    }

    if (params.period !== undefined) {
      httpParams = httpParams.set('period', params.period.toString());
    }

    if (params.type !== undefined) {
      httpParams = httpParams.set('type', params.type);
    }

    if (params.candlesOnly !== undefined) {
      httpParams = httpParams.set('candlesOnly', params.candlesOnly);
    }


    return httpParams;
  }

  // Новый метод для вызова jsonChartControlsNew
  public getControlsNew(params: FootPrintRequestParamsNew): Observable<TickerPresetNew> {

    params = {...params};
    if (params.startDate) 
      params.startDate =  new Date( addUTC( new Date ( params.startDate)));
    if (params.endDate)
       params.endDate = new Date( addUTC( new Date( params.endDate)));
    return this.http.get<TickerPresetNew>('/api/common/jsonChartControlsNew', {
      withCredentials: true,
      params: this.toHttpParamsNew(params)
    }).pipe(
      
      map(preset => this.convertDatesInPresetNew(preset))
    );
  }

  public ModifyTickers(s: string): Observable<SelectListItemText[]> {
    const params = new HttpParams().set('tickers', s);
    return this.http.get<SelectListItemText[]>(`${environment.apiUrl}/api/common/ModifyTickers`, { params });
  }

  parseDate(dateString: string): Date {
    const [day, month, year] = dateString.split('.').map(Number);
    return new Date(year, month - 1, day);
  }

  private convertDatesInPreset(preset: TickerPreset): TickerPreset {
    if (preset.startDate) {
      preset.startDate = new Date(preset.startDate as unknown as string);
    }
    if (preset.endDate) {
      preset.endDate = new Date(preset.endDate as unknown as string);
    }
    if (preset.presetList) {
      preset.presetList = preset.presetList.map(item => {
        if (item.startDate) {
          item.startDate = this.parseDate(item.startDate as unknown as string);
        }
        if (item.endDate) {
          item.endDate = this.parseDate(item.endDate as unknown as string);
        }
        return item;
      });
    }
    return preset;
  }


  private convertDatesInPresetNew(preset: TickerPresetNew): TickerPresetNew {
   
    if (preset.startDate) {
      const startDateString = preset.startDate as unknown as string;
      // Check if the startDate ends with 'Z' before adding UTC
      preset.startDate = startDateString.endsWith('Z') 
        ? new Date(addUTC(new Date(startDateString))) 
        : new Date(startDateString);
    }
  
    if (preset.endDate) {
      const endDateString = preset.endDate as unknown as string;
      // Check if the endDate ends with 'Z' before adding UTC
      preset.endDate = endDateString.endsWith('Z') 
        ? new Date(addUTC(new Date(endDateString))) 
        : new Date(endDateString);
    }
  
    return preset;
  }
  

  private convertDatesInPresetNew1(preset: TickerPresetNew): TickerPresetNew {
 
    if (preset.startDate) {
      preset.startDate =  new Date( addUTC( new Date(preset.startDate as unknown as string)));
    }
    if (preset.endDate) {
      preset.endDate = new Date( addUTC( new Date(preset.endDate as unknown as string)));
    }
   
    return preset;
  }

  private convertDatesInPresets(presets: SelectListItemParams[]): SelectListItemParams[] {
    return presets.map(preset => {
      if (preset.Value.startDate) {
        preset.Value.startDate = this.parseDate(preset.Value.startDate as unknown as string);
      }
      if (preset.Value.endDate) {
        preset.Value.endDate = this.parseDate(preset.Value.endDate as unknown as string);
      }
      return preset;
    });
  }
}