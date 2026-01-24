import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../environment';
import { ChartSettings } from '../models/ChartSettings';
import { SelectListItemNumber } from '../models/preserts';
import {
  DEFAULT_VOLUME_HEIGHTS,
  MINI_VOLUME_HEIGHTS,
  getVolumeHeightDefaults,
  normalizeVolumeHeights,
} from '../models/volume-heights';
import { DEFAULT_THEME_PRESET, ThemePreset } from '../services/theme/theme.model';

@Injectable({
  providedIn: 'root',
})
export class ChartSettingsService {
  private apiUrl = `${environment.apiUrl}/api/Settings`; // Базовый URL для API контроллера

  constructor(private http: HttpClient) {}


  public getChartSettings(model: number | null): Observable<ChartSettings> {
    const normalize = (settings: ChartSettings) =>
      ChartSettingsService.normalizeSettings(settings);

    if (model == null) {
      return this.http
        .get<ChartSettings>(`${this.apiUrl}/get`, { withCredentials: true })
        .pipe(map(normalize));
    }

    return this.http
      .get<ChartSettings>(`${this.apiUrl}/get`, {
        params: { id: model },
        withCredentials: true,
      })
      .pipe(map(normalize));
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
    return this.http.put<number>(this.apiUrl, ChartSettingsService.normalizeSettings(model));
  }

  deleteSettings(model: ChartSettings): Observable<number> {
    return this.http.delete<number>(this.apiUrl, { body: model });
  }

  static miniSettings(): ChartSettings {
    const storedTheme = ChartSettingsService.getStoredThemePreset();
    return {
      CandlesOnly: true,
      Head: false,
      OI: false,
      OIDelta: false,
      OIDeltaDivideBy2: false,
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
      ThemePreset: storedTheme ?? DEFAULT_THEME_PRESET,
      VolumesHeight: { ...MINI_VOLUME_HEIGHTS },
      DeltaGraph: false,
      DialogPositions: {},
      Indicators: [],
      IndicatorPanels: {}
    };
  }

  static DefaultSettings(): ChartSettings {
    const storedTheme = ChartSettingsService.getStoredThemePreset();
  return {
  VolumesHeight: { ...DEFAULT_VOLUME_HEIGHTS },
  Default: false,
  CandlesOnly: false,
  Head: true,
  OI: true,
  OIDelta: true,
  OIDeltaDivideBy2: false,
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
  ThemePreset: storedTheme ?? DEFAULT_THEME_PRESET,

  DeltaGraph: false,
  DialogPositions: {},
  Indicators: [],
  IndicatorPanels: {}
};
  }

  static normalizeSettings(settings: ChartSettings): ChartSettings {
    const defaults = getVolumeHeightDefaults(!!settings.CandlesOnly);
    const storedTheme = ChartSettingsService.getStoredThemePreset();
    const settingsTheme =
      settings.ThemePreset === 'Dark' || settings.ThemePreset === 'Light'
        ? settings.ThemePreset
        : null;
    return {
      ...settings,
      ThemePreset: storedTheme ?? settingsTheme ?? DEFAULT_THEME_PRESET,
      OIDeltaDivideBy2: settings.OIDeltaDivideBy2 ?? false,
      VolumesHeight: normalizeVolumeHeights(settings.VolumesHeight, defaults),
      Indicators: settings.Indicators ?? [],
      IndicatorPanels: settings.IndicatorPanels ?? {},
    };
  }

  private static getStoredThemePreset(): ThemePreset | null {
    try {
      const storage = typeof window !== 'undefined' ? window.localStorage : null;
      const value = storage?.getItem('uiThemePreset');
      if (value === 'Dark' || value === 'Light') {
        return value;
      }
    } catch {
      return null;
    }
    return null;
  }
}
