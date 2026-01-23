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
      ? this.http.get<DataItem[]>(`/assets/shares/${safeTicker}/${standart}/data.json`)
      : this.http.get<DataItem[]>(`${environment.apiUrl}/api/statements/${safeTicker}`, {
          params: { standart, period, mode: 'raw' }
        });

    return dataRequest.pipe(
      map(dataItems => {
        return dataItems.map(item => {
          const valueStr = item.value !== null && item.value !== undefined ? item.value.toString() : '';
          // Проверка, является ли строка датой (формат dd.mm.yyyy)
          const isDate = /^\d{2}\.\d{2}\.\d{4}$/.test(valueStr);

          if (!isDate && valueStr) {
            // Если это не дата, пытаемся преобразовать значение
            const sanitizedValue = valueStr.replace(/\s+/g, '').replace(',', '.');
            const numericValue = parseFloat(sanitizedValue);

            return {
              ...item,
              value: isNaN(numericValue) ? valueStr : numericValue.toString()
            };
          }

          // Если это дата или пусто, возвращаем исходное значение
          return {
            ...item,
            value: valueStr
          };
        });
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
      ? this.http.get<DataItem[]>(`/assets/shares/${safeTicker}/${standart}/data.json`)
      : this.http.get<DataItem[]>(`${environment.apiUrl}/api/statements/${safeTicker}`, {
          params: { standart, period, mode: 'ext' }
        });

    return dataRequest.pipe(
      map(dataItems => {
        if (filter) {
          return dataItems.filter(item => item.name === filter);
        }
        return dataItems;
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
        
        const displayName = stat_dic[nameToFilter] || nameToFilter; // Используем имя из dic.json или оригинальное имя
        const filteredData = dataItems
          .filter(item => item.name === nameToFilter && item.value ) // Фильтрация по отображаемому имени
          .map(({ year, value }) => ({
            year,
            value: parseFloat(value)
          } as FilteredDataItem));

        return { filteredData, displayName }; // Возвращаем объект с фильтрованными данными и именем
      })
    );
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
