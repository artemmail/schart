import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ChartSettings } from 'src/app/models/ChartSettings';

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  constructor(private http: HttpClient) {}


  static DefaultSettings(): ChartSettings
    {
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
            maxTrades: false,
            name: ''
          };
    }
    
  public GetSettings(model: number | null): Observable<ChartSettings> {
 
    if (model == null)
      return this.http.get<ChartSettings>(
        `https://stockchart.ru/api/settings/get`
      );

    return this.http.get<ChartSettings>(
      `https://stockchart.ru/api/settings/get`,
      {
        params: { id: model },
      }
    );
  }
}
