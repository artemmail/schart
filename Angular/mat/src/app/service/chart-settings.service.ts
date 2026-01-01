import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environment';
import { ChartSettings } from '../models/ChartSettings';
import { SelectListItemNumber } from '../models/preserts';

@Injectable({
  providedIn: 'root',
})
export class ChartSettingsService {
  private apiUrl = `${environment.apiUrl}/api/Settings`; // Базовый URL для API контроллера

  constructor(private http: HttpClient) {}


  public getChartSettings(model: number | null): Observable<ChartSettings> {
 
    if (model == null)
      return this.http.get<ChartSettings>(
        `${this.apiUrl}/get`, { withCredentials: true }
      );

    return this.http.get<ChartSettings>(
      `${this.apiUrl}/get`,
      {
        params: { id: model },
        withCredentials: true
      },
    );
  }

  saveChartSettings(id: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/Post?id=${id}`, {}, { withCredentials: true });
  }

  

  getPresets(): Observable<SelectListItemNumber[]> {
    return this.http.get<SelectListItemNumber[]>(`${this.apiUrl}/Presets`);
  }

  createChartSettings(settings: string): Observable<number> {
    return this.http.post<number>(`${this.apiUrl}/Create`, { settings });
  }

  deleteChartSettings(settings: string): Observable<number> {
    return this.http.post<number>(`${this.apiUrl}/Delete`, { settings });
  }

  updateSettings(model: ChartSettings): Observable<number> {
    return this.http.put<number>(this.apiUrl, model);
  }

  deleteSettings(model: ChartSettings): Observable<number> {
    return this.http.delete<number>(this.apiUrl, { body: model });
  }

  static miniSettings(): ChartSettings {
    return {
      CandlesOnly: true,
      Head: false,
      OI: false,
      OIDelta: false,
      Delta: false,
      DeltaBars: false,
      CompressToCandles: 'Always',
      totalMode: 'Hidden',
      TopVolumes: false,
      SeparateVolume: false,
      ShrinkY: true,
      ToolTip: true,
      ExtendedToolTip: true,
      Postmarket: true,
      OpenClose: true,
      style: 'Ruticker',
      deltaStyle: 'Delta',
      classic: 'ASK+BID',
      Contracts: false,
      oiEnable: false,
      horizStyle: false,
      Bars: false,
      volume1: 0,
      volume2: 0,
      MaxTrades: false,
      Default: false,
      Name: 'Свечи мини',
      VolumesHeight: [95, 110, 132, 75, 120, 123],
      
  DeltaGraph: false
    };
  }

  static DefaultSettings(): ChartSettings {
    return {
  VolumesHeight: [50, 50, 50, 50, 120, 50, 50],
  Default: false,
  CandlesOnly: false,
  Head: true,
  OI: true,
  OIDelta: true,
  Delta: true,
  DeltaBars: true,
  CompressToCandles: 'Auto',
  totalMode: 'Left',
  TopVolumes: false,
  SeparateVolume: false,
  ShrinkY: false,
  ToolTip: true,
  ExtendedToolTip: true,
  Postmarket: true,
  OpenClose: true,
  style: 'Volume',
  deltaStyle: 'Delta',
  classic: 'ASK+BID',
  Contracts: true,
  oiEnable: true,
  horizStyle: false,
  Bars: false,
  volume1: 0,
  volume2: 0,
  MaxTrades: false,
  Name: '',

  DeltaGraph: false
};
  }
}
