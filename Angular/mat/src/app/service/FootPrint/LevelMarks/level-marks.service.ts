import { Injectable } from '@angular/core';
import { FootPrintParameters } from 'src/app/models/Params';

export class MarkLineLevel {
  constructor(public comment: string = '', public color: string = 'red') {}
}

export class VolumeFilter {
  constructor(public volume1: number = 0, public volume2: number = 0) {}
}

export class MarkParamsData {
  levels: Record<number, MarkLineLevel> = {};
  dates: Record<string, MarkLineLevel> = {};
  filters: VolumeFilter = new VolumeFilter();

  public toggleDate(date: string): void {
    if (!this.dates[date]) {
      this.dates[date] = new MarkLineLevel('', '#F0E68C');
    } else {
      delete this.dates[date];
    }
  }

  public togglePrice(price: number): void {
    if (!this.levels[price]) {
      this.levels[price] = new MarkLineLevel('', '#F0E68C');
    } else {
      delete this.levels[price];
    }
  }

  public getPriceMark(price: number): MarkLineLevel {
    return this.levels[price];
  }

  public geDateMark(date: string): MarkLineLevel {
    return this.dates[date];
  }

  static fromJSON(jsonString: string): MarkParamsData {
    const jsonObject = JSON.parse(jsonString);
    const markParamsData = new MarkParamsData();

    markParamsData.levels = this.deserializeLevels(jsonObject.levels);
    markParamsData.dates = this.deserializeDates(jsonObject.dates);
    markParamsData.filters = jsonObject.filters
      ? new VolumeFilter(jsonObject.filters.volume1, jsonObject.filters.volume2)
      : new VolumeFilter();

    return markParamsData;
  }

  private static deserializeLevels(levels: Record<string, any>): Record<number, MarkLineLevel> {
    const deserializedLevels: Record<number, MarkLineLevel> = {};
    for (const key in levels) {
      if (levels.hasOwnProperty(key)) {
        deserializedLevels[+key] = new MarkLineLevel(levels[key].comment, levels[key].color);
      }
    }
    return deserializedLevels;
  }

  private static deserializeDates(dates: Record<string, any>): Record<string, MarkLineLevel> {
    const deserializedDates: Record<string, MarkLineLevel> = {};
    for (const key in dates) {
      if (dates.hasOwnProperty(key)) {
        deserializedDates[key] = new MarkLineLevel(dates[key].comment, dates[key].color);
      }
    }
    return deserializedDates;
  }

  public toJSON(): string {
    
    return JSON.stringify({levels: this.levels, dates: this.dates, filters: this.filters});
  }
}

/*
@Injectable({
  providedIn: 'root',
})*/
export class LevelMarksService {
  private currentParams: FootPrintParameters | null = null;
  public markParamsData: MarkParamsData;

  public getDates():Record<string, MarkLineLevel>
  {
      return this.markParamsData.dates;
  }

  public getPrices():Record<number, MarkLineLevel>
  {
      return this.markParamsData.levels;
  }

  constructor() {
    this.markParamsData = new MarkParamsData();
  }

  private getStorageKey(params: FootPrintParameters): string {
    return `levelsMark_${params.ticker}_${params.period}_${params.priceStep}`;
  }

  public load(params: FootPrintParameters): void {
    this.currentParams = {...params};
    const key = this.getStorageKey(params);
    const jsonString = window.localStorage.getItem(key);
    if (jsonString) {
      this.markParamsData = MarkParamsData.fromJSON(jsonString);
    } else {
      this.markParamsData = new MarkParamsData();
    }
  }

  public save(): void {
    if (!this.currentParams) {
      throw new Error('LevelMarksService not initialized with FootPrintParameters.');
    }
    const key = this.getStorageKey(this.currentParams);
    var s =this.markParamsData.toJSON() ;
    window.localStorage.setItem(key, s);
  }

  public toggleDate(date: string): void {
    this.markParamsData.toggleDate(date);
    this.save();
  }


  public setVolume1(vol: number): void {
    this.markParamsData.filters.volume1 = vol;
    this.save();
  }

  public setVolume2(vol: number): void {
    this.markParamsData.filters.volume2 = vol;
    this.save();
  }

  public togglePrice(price: number): void {
    this.markParamsData.togglePrice(price);
    this.save();
  }

  public getPriceMark(price: number): MarkLineLevel {
    return this.markParamsData.getPriceMark(price);
  }

  public getDateMark(date: string): MarkLineLevel {
    return this.markParamsData.geDateMark(date);
  }

  public getFilters(): VolumeFilter {
    return this.markParamsData.filters;
  }

  public saveParamsHistory(params: FootPrintParameters): void {
    let hisDic: Record<string, any> = {};
    try {
      const storedHistory = window.localStorage.getItem('footPrintHistory');
      if (storedHistory) {
        hisDic = JSON.parse(storedHistory);
      }
    } catch (e) {
      console.error('Error parsing history from localStorage', e);
    }

    const key = JSON.stringify(params);
    const count = hisDic[key] ? hisDic[key].count + 1 : 1;

    hisDic[key] = { count, params, date: new Date() };
    window.localStorage.setItem('footPrintHistory', JSON.stringify(hisDic));
    this.updateHistory();
  }

  public paramToStr(param: FootPrintParameters): string {
    return `${param.ticker},${param.startDate}-${param.endDate},таймфрейм:${param.period} мин,шаг:${param.priceStep}`;
  }

  public updateHistory(): void {
    try {
      const storedHistory = window.localStorage.getItem('footPrintHistory');
      if (!storedHistory) return;

      const hisDic = JSON.parse(storedHistory);
      if (!hisDic) return;

      // Logic for updating history view can be placed here
    } catch (e) {
      console.error('Error updating history', e);
    }
  }
}