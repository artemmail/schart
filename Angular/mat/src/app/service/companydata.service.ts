import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { stat_dic } from '../data/companyinfo';
import { DataItem, FilteredDataItem, FilteredDataResult, OpenPosition, Recommendation, ShareholdersStructure, StockData } from '../models/fundamental.model';
import { environment } from '../environment';



@Injectable({
  providedIn: 'root'
})
export class DataService {

  private apiUrl = `${environment.apiUrl}/api/common`; // Замените на фактический URL вашего API

  private shareholdersApiUrl = `${environment.apiUrl}/api/shareholders`;
  private recommendationsApiUrl = `${environment.apiUrl}/api/recommendations`;

  constructor(private http: HttpClient) { }


  // Метод для получения всех доступных контрактов
  getAllContracts(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/contracts`, { withCredentials: true });
  }

  // Метод для получения всех открытых позиций по имени контракта
  getOpenPositionsByContract(contractName: string): Observable<OpenPosition[]> {
    return this.http
      .get<OpenPosition[]>(`${this.apiUrl}/positions/${contractName}`, { withCredentials: true })
      .pipe(
        map(positions =>
          positions.map(position => ({
            ...position,
            Date: new Date(position.Date) // Преобразуем ISO строку в объект Date
          })).sort((a, b) => a.Date.getTime() - b.Date.getTime()) // Сортируем по дате
      )
    );
  }

  loadData(ticker: string, standart = 'MSFO', period: string = 'y'): Observable<DataItem[]> {
    const safeTicker = (ticker || '').trim();
    if (!safeTicker) {
      return of([]);
    }

    const useAssets = standart === 'MULT' || standart === 'FIN';
    const dataRequest = useAssets
      ? this.http.get<any[]>(`/assets/shares/${safeTicker}/${standart}/data.json`)
      : this.http.get<DataItem[]>(`${environment.apiUrl}/api/statements/${safeTicker}`, {
          params: { standart, period, mode: 'raw' }
        });

    return dataRequest.pipe(
      map(dataItems => {
        const normalized = useAssets
          ? this.mapAssetItems(dataItems)
          : (dataItems as DataItem[]);
        return normalized.map(item => this.normalizeStatementItem(item));
      })
    );
  }
  
  loadData2(ticker: string, standart = 'MSFO', period: string = 'y', filter?: string): Observable<DataItem[]> {
    const safeTicker = (ticker || '').trim();
    if (!safeTicker) {
      return of([]);
    }

    const useAssets = standart === 'MULT' || standart === 'FIN';
    const dataRequest = useAssets
      ? this.http.get<any[]>(`/assets/shares/${safeTicker}/${standart}/data.json`)
      : this.http.get<DataItem[]>(`${environment.apiUrl}/api/statements/${safeTicker}`, {
          params: { standart, period, mode: 'ext' }
        });

    return dataRequest.pipe(
      map(dataItems => {
        const normalized = useAssets
          ? this.mapAssetItems(dataItems)
          : (dataItems as DataItem[]);
        const mapped = normalized.map(item => this.normalizeStatementItem(item));
        if (filter) {
          return mapped.filter(item => item.metricKey === filter);
        }
        return mapped;
      })
    );
  }



  loadRecommendations(ticker: string): Observable<Recommendation> {
    const safeTicker = (ticker || '').trim().toUpperCase();
    if (!safeTicker) {
      return of({ ReasonsUp: [], ReasonsDown: [] });
    }

    return this.http.get<Recommendation>(`${this.recommendationsApiUrl}/${safeTicker}`).pipe(
      catchError(() => of({ ReasonsUp: [], ReasonsDown: [] }))
    );
  }

  loadFilteredData(ticker: string, nameToFilter: string, standart = 'MSFO', period: string = 'y'): Observable<FilteredDataResult> {
    return this.loadData2(ticker, standart, period).pipe(
      map(dataItems => {
        const filtered = dataItems.filter(item => item.metricKey === nameToFilter && item.value);
        const displayName = filtered[0]?.displayName || stat_dic[nameToFilter] || nameToFilter;
        const filteredData = filtered
          .filter(item => item.valueType === 'number')
          .map(({ year, value }) => ({
            year,
            value: parseFloat(value)
          } as FilteredDataItem));

        return { filteredData, displayName };
      })
    );
  }

  private mapAssetItems(items: any[]): DataItem[] {
    return (items ?? []).map(item => {
      const metricKey = item.name ?? '';
      const displayName = stat_dic[metricKey] || metricKey;
      const valueType = this.getDefaultValueType(metricKey);
      const isClickable = this.getDefaultIsClickable(metricKey);
      const valueStr = item.value !== null && item.value !== undefined ? item.value.toString() : '';
      return {
        metricKey,
        displayName,
        isClickable,
        valueType,
        year: item.year?.toString?.() ?? '',
        value: valueStr,
        link: valueType === 'url' ? valueStr : null
      } as DataItem;
    });
  }

  private normalizeStatementItem(item: DataItem): DataItem {
    const valueStr = item.value !== null && item.value !== undefined ? item.value.toString() : '';
    const metricKey = item.metricKey ?? '';
    const displayName = item.displayName || stat_dic[metricKey] || metricKey;
    const valueType = item.valueType || this.getDefaultValueType(metricKey);
    const isClickable = item.isClickable ?? this.getDefaultIsClickable(metricKey);
    const link = item.link ?? (valueType === 'url' ? valueStr : null);
    const isDate = /^\d{2}\.\d{2}\.\d{4}$/.test(valueStr);

    if (!isDate && valueStr && valueType === 'number') {
      const sanitizedValue = valueStr.replace(/\s+/g, '').replace(',', '.');
      const numericValue = parseFloat(sanitizedValue);
      return {
        ...item,
        metricKey,
        displayName,
        valueType,
        isClickable,
        link,
        value: isNaN(numericValue) ? valueStr : numericValue.toString()
      };
    }

    return {
      ...item,
      metricKey,
      displayName,
      valueType,
      isClickable,
      link,
      value: valueStr
    };
  }

  private getDefaultIsClickable(metricKey: string): boolean {
    return this.getDefaultValueType(metricKey) === 'number';
  }

  private getDefaultValueType(metricKey: string): string {
    if (!metricKey) {
      return 'number';
    }
    const lower = metricKey.toLowerCase();
    if (lower === 'report_url' || lower === 'presentation_url' || lower === 'year_report_url') {
      return 'url';
    }
    if (lower === 'date') {
      return 'date';
    }
    if (lower === 'currency') {
      return 'string';
    }
    return 'number';
  }
  // Метод для получения данных о дивидендах
  getDividends(ticker: string): Observable<StockData> {
    const safeTicker = (ticker || '').trim();
    return this.http.get<StockData>(`${environment.apiUrl}/api/dividends/${safeTicker}`).pipe(
      catchError(() =>
        of({
          Ticker: safeTicker || '',
          Title: `Дивиденды ${safeTicker || ''}`.trim(),
          Description: 'нет информации',
          Dividends: []
        })
      )
    );
  }
  // Метод для получения структуры акционеров
  getShareholdersStructure(ticker: string): Observable<ShareholdersStructure | undefined> {
    const safeTicker = (ticker || '').trim().toUpperCase();
    if (!safeTicker) {
      return of({
        Title: 'Структура акционеров',
        LastUpdateDate: '',
        Shareholders: []
      });
    }

    return this.http.get<ShareholdersStructure>(`${this.shareholdersApiUrl}/${safeTicker}`).pipe(
      catchError(() =>
        of({
          Title: `Структура акционеров ${safeTicker}`.trim(),
          LastUpdateDate: '',
          Shareholders: []
        })
      )
    );
  }
}
