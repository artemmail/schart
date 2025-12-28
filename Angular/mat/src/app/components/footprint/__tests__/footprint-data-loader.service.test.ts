import { firstValueFrom, of } from 'rxjs';
import { FootprintDataLoaderService } from '../footprint-data-loader.service';
import { FootPrintParameters } from 'src/app/models/Params';
import { ChartSettings } from 'src/app/models/ChartSettings';

describe('FootprintDataLoaderService', () => {
  const baseParams: FootPrintParameters = {
    ticker: 'TEST',
    period: 1,
    priceStep: 1,
    startDate: new Date('2024-01-01T00:00:00Z'),
    endDate: new Date('2024-01-02T00:00:00Z'),
    candlesOnly: undefined,
  };

  const rangeData = {
    priceScale: 1,
    clusterData: [
      {
        Number: 1,
        x: new Date('2024-01-01T00:00:00Z'),
        o: 1,
        c: 1,
        l: 1,
        h: 1,
        q: 10,
        bq: 10,
        v: 20,
        bv: 20,
        oi: 5,
      },
    ],
  };

  const createService = () => {
    const settings: ChartSettings = { ...ChartSettingsServiceStub.miniSettings() };
    const settingsService = new ChartSettingsServiceStub(settings);
    const levelMarksService = new LevelMarksServiceStub();
    const clusterStreamService = new ClusterStreamServiceStub(rangeData);
    const dialogService = new DialogServiceStub();
    const utilities = new FootprintUtilitiesServiceStub();

    const service = new FootprintDataLoaderService(
      settingsService as any,
      levelMarksService as any,
      clusterStreamService as any,
      dialogService as any,
      utilities as any
    );

    return {
      service,
      settingsService,
      levelMarksService,
      clusterStreamService,
      dialogService,
      utilities,
    };
  };

  it('merges realtime updates into the current dataset', async () => {
    const { service, clusterStreamService, utilities } = createService();
    utilities.presetsToReturn = [{ Text: 'One', Value: 1 }];

    await service.initialize(baseParams, 1, { minimode: false, deltamode: false });

    const tickPayload = [
      {
        number: 2,
        tradeDate: new Date('2024-01-01T00:01:00Z'),
        price: 2,
        quantity: 5,
        direction: 1,
        volume: 10,
        oi: 6,
      },
    ];

    const update = service.applyRealtimeUpdate('ticks', tickPayload);

    expect(update).toEqual({ type: 'ticks', merged: true });
    const data = await firstValueFrom(service.data$);
    expect(data?.clusterData[data.clusterData.length - 1].Number).toBe(2);
    expect(clusterStreamService.requestCount).toBe(1);
  });

  it('applies resolved settings to params and emits them', async () => {
    const { service, settingsService, levelMarksService, utilities } = createService();
    utilities.presetsToReturn = [{ Text: 'Mini', Value: 5 }];

    const params: FootPrintParameters = { ...baseParams };
    settingsService.settingsToReturn = { ...ChartSettingsServiceStub.miniSettings(), DeltaGraph: false };

    const options = { minimode: true, deltamode: true } as const;
    await service.initialize(params, 5, options);

    const emittedSettings = await firstValueFrom(service.settings$);
    const emittedParams = await firstValueFrom(service.params$);

    expect(emittedSettings?.DeltaGraph).toBe(true);
    expect(emittedParams?.candlesOnly).toBe(true);
    expect(levelMarksService.loadedParams).toEqual(params);
  });
});

class ChartSettingsServiceStub {
  constructor(public settingsToReturn: ChartSettings) {}

  getChartSettings() {
    return of(this.settingsToReturn);
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
      Name: 'Preset',
      VolumesHeight: [1, 2, 3, 4, 5, 6],
      DeltaGraph: false,
    };
  }
}

class LevelMarksServiceStub {
  loadedParams: FootPrintParameters | null = null;
  load(params: FootPrintParameters) {
    this.loadedParams = params;
  }
}

class ClusterStreamServiceStub {
  requestCount = 0;
  constructor(private data: { priceScale: number; clusterData: any[] }) {}
  GetRange() {
    this.requestCount++;
    return of(this.data);
  }
}

class DialogServiceStub {
  info_async = jest.fn();
}

class FootprintUtilitiesServiceStub {
  presetsToReturn: { Text: string; Value: number }[] = [];
  loadPresets() {
    return Promise.resolve(this.presetsToReturn);
  }
}
