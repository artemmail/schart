import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { stat_dic } from '../data/companyinfo';
import { DataItem, FilteredDataItem, FilteredDataResult, OpenPosition, Recommendation, ShareholdersStructure, StockData } from '../models/fundamental.model';
import { environment } from '../environment';



@Injectable({
  providedIn: 'root'
})
export class DataService {

  private apiUrl = `${environment.apiUrl}/api/common`; // Замените на фактический URL вашего API


  private dataUrl = 'assets/dividends.json';
  private shareholdersUrl = 'assets/ShareholdersStructure.json'; // Добавим URL для нового файла

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
    const dataUrl = (standart === 'MULT' || standart === 'FIN')
      ? `/assets/shares/${ticker}/${standart}/data.json`
      : `/assets/shares/${ticker}/${standart}/${period}/data.json`;
  
    const dataRequest = this.http.get<DataItem[]>(dataUrl).pipe(
      map(dataItems => {
        return dataItems.map(item => {
          // Проверка, является ли строка датой (формат dd.mm.yyyy)
          const isDate = /^\d{2}\.\d{2}\.\d{4}$/.test(item.value);
          
          if (!isDate && item.value) {
            // Если это не дата, пытаемся преобразовать значение
            const sanitizedValue = item.value.replace(/\s+/g, '').replace(',', '.');
            const numericValue = parseFloat(sanitizedValue);
  
            return {
              ...item,
              value: isNaN(numericValue) ? item.value : numericValue.toString()
            };
          }
  
          // Если это дата, возвращаем исходное значение
          return item;
        });
      })
    );
  
    
      return dataRequest;
    
  }
  
  loadData2(ticker: string, standart = 'MSFO', period: string = 'y', filter?: string): Observable<DataItem[]> {
    const dataUrl = (standart === 'MULT' || standart === 'FIN')
      ? `/assets/shares/${ticker}/${standart}/data.json`
      : `/assets/shares/${ticker}/${standart}/${period}/data_ext.json`;
  
    const dataRequest = this.http.get<DataItem[]>(dataUrl).pipe(
      map(dataItems => {
        if (filter) {
          return dataItems.filter(item => item.name === filter);
        }
        return dataItems;
      })
    );
  
    
      return dataRequest;
    
  }



  loadRecommendations(ticker: string): Observable<Recommendation> {
    const recommendationUrl = `/assets/shares/${ticker}/recomendation.json`;
    return this.http.get<Recommendation>(recommendationUrl);
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
  getDividends(ticker: string): Observable<StockData | undefined> {
    return this.http.get<StockData[]>(this.dataUrl).pipe(
      map(data => {
        const stock = data.find(item => item.Ticker === ticker);
        return stock;
      })
    );
  }
  // Метод для получения структуры акционеров
  getShareholdersStructure(ticker: string): Observable<ShareholdersStructure | undefined> {
    return this.http.get<{ [key: string]: ShareholdersStructure }>(this.shareholdersUrl).pipe(
      map(data => data[ticker])
    );
  }
}
