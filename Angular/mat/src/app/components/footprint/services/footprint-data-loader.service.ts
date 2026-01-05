import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { FootPrintParameters } from 'src/app/models/Params';
import { ChartSettings } from 'src/app/models/ChartSettings';
import { SelectListItemNumber } from 'src/app/models/preserts';
import { ChartSettingsService } from 'src/app/service/chart-settings.service';
import { LevelMarksService } from 'src/app/service/FootPrint/LevelMarks/level-marks.service';
import { ClusterStreamService } from 'src/app/service/FootPrint/ClusterStream/cluster-stream.service';
import { DialogService } from 'src/app/service/DialogService.service';
import { FootprintUtilitiesService } from './footprint-utilities.service';
import { ClusterData } from '../models/cluster-data';
import { HttpErrorResponse } from '@angular/common/http';
import { CandlesRangeSetValue } from 'src/app/models/candles-range-set';
import {
  FootprintInitOptions,
  FootprintUpdateEvent,
  FootprintUpdateType,
} from '../models/footprint-data.types';

@Injectable()
export class FootprintDataLoaderService implements OnDestroy {
  private presetIndex?: number;
  private options: FootprintInitOptions = { minimode: false, deltamode: false };
  private currentData: ClusterData | null = null;

  private dataSubject = new BehaviorSubject<ClusterData | null>(null);
  readonly data$ = this.dataSubject.asObservable();

  private settingsSubject = new BehaviorSubject<ChartSettings | null>(null);
  readonly settings$ = this.settingsSubject.asObservable();

  private paramsSubject = new BehaviorSubject<FootPrintParameters | null>(null);
  readonly params$ = this.paramsSubject.asObservable();

  private presetsSubject = new BehaviorSubject<SelectListItemNumber[]>([]);
  readonly presets$ = this.presetsSubject.asObservable();

  constructor(
    private settingsService: ChartSettingsService,
    private levelMarksService: LevelMarksService,
    private clusterStreamService: ClusterStreamService,
    private dialogService: DialogService,
    private utilities: FootprintUtilitiesService
  ) {}

  ngOnDestroy(): void {
    this.destroy();
  }

  async initialize(
    params: FootPrintParameters,
    presetIndex: number,
    options: FootprintInitOptions
  ): Promise<boolean> {
    this.options = options;
    this.presetIndex = presetIndex;
    this.paramsSubject.next(params);

    await this.loadPresets();
    return this.applySettingsAndLoadData(params);
  }

  async reload(params: FootPrintParameters): Promise<boolean> {
    return this.applySettingsAndLoadData(params);
  }

  destroy() {
    this.paramsSubject.next(null);
    this.settingsSubject.next(null);
    this.presetsSubject.next([]);
    this.currentData = null;
    this.dataSubject.next(null);
    this.options = { minimode: false, deltamode: false };
    this.presetIndex = undefined;
  }

  applyRealtimeUpdate(
    type: FootprintUpdateType,
    payload: any
  ): FootprintUpdateEvent | null {
    if (!this.currentData) return null;

    let merged: boolean | undefined = undefined;
    switch (type) {
      case 'cluster':
        merged = this.currentData.handleCluster(payload);
        break;
      case 'ticks':
        merged = this.currentData.handleTicks(payload);
        break;
      case 'ladder':
        this.currentData.handleLadder(payload);
        break;
    }

    this.dataSubject.next(this.currentData);
    return { type, merged };
  }

  private async applySettingsAndLoadData(
    params: FootPrintParameters
  ): Promise<boolean> {
    const settings = await this.resolveSettings();
    params.candlesOnly =
      params.candlesOnly ?? settings.CandlesOnly ?? false;
    this.paramsSubject.next(params);
    this.settingsSubject.next(settings);
    this.levelMarksService.load(params);
    return this.requestRange(params);
  }

  private async resolveSettings(): Promise<ChartSettings> {
    let settings = ChartSettingsService.miniSettings();
    if (!this.options.minimode && this.presetIndex !== undefined) {
      settings = await firstValueFrom(
        this.settingsService.getChartSettings(this.presetIndex)
      );
    } else if (this.options.minimode) {
      settings.DeltaGraph = this.options.deltamode;
    }
    return settings;
  }

  private async loadPresets() {
    const presets = await this.utilities.loadPresets();
    this.presetsSubject.next(presets);
    if ((this.presetIndex === undefined || this.presetIndex === null) && presets.length) {
      this.presetIndex = presets[0].Value;
    }
  }

  setPresetIndex(presetIndex: number) {
    this.presetIndex = presetIndex;
  }

  private buildClusterDataFromRangeSet(
    rangeSet: CandlesRangeSetValue[],
    priceScale: number
  ): ClusterData {
    const emptyPad = Math.max(Math.abs(priceScale || 1) * 0.001, 1e-6);
    let a =0;
    const prepared = rangeSet
      .filter((value) => value.Date !== undefined)
      .map((value, index) => {
        const date = new Date(value.Date );
        const rawPrice1 = value.Price1normalized;
        const rawPrice2 = value.Price2normalized;
        const price1 = Number(rawPrice1);
        const price2 = Number(rawPrice2);
        

        if (!Number.isFinite(price1) || !Number.isFinite(price2)) {
          return null;
        }

        let high = Math.max(price1, price2);
        let low = Math.min(price1, price2);

        if (high === low) {
          const base = Math.max(Math.abs(price1), Math.abs(price2));
          const pad = Math.max(base * 0.001, 1e-6);
          high += pad;
          low -= pad;
        }

        

        return {
          Number: index + 1,
          x: date,
          o: price1,
          c: price2,
          l: low,
          h: high,
          q: 0,
          bq: 0,
          v: 0,
          bv: 0,
          oi: 0,
          cl: [],
        };
      })
      .filter((value): value is NonNullable<typeof value> => value !== null)
      .sort((a, b) => a.x.getTime() - b.x.getTime())
      .map((value, index) => ({
        ...value,
        Number: index + 1,
      }));

    if (!prepared.length) {
      const now = new Date();
      prepared.push({
        Number: 1,
        x: now,
        o: 1,
        c: 1,
        l: 1 - emptyPad,
        h: 1 + emptyPad,
        q: 0,
        bq: 0,
        v: 0,
        bv: 0,
        oi: 0,
        cl: [],
      });
    }

    return new ClusterData({
      priceScale: priceScale || 1,
      clusterData: prepared,
    });
  }

  private async requestRange(params: FootPrintParameters): Promise<boolean> {
    try {
      const isArbitrageMode = params.type === 'arbitrage';

      if (isArbitrageMode) {
        params.ticker1 = params.ticker1 ?? 'SBER';
        params.ticker2 = params.ticker2 ?? 'GAZP';
      }

      if (isArbitrageMode && (params.ticker1 || params.ticker2)) {
        
        const rangeSet = await firstValueFrom(
          this.clusterStreamService.getRangeSetArray({
            ticker: params.ticker,
            ticker1: params.ticker1,
            ticker2: params.ticker2,
            rperiod: params.rperiod,
            startDate: params.startDate,
            endDate: params.endDate,
            period: params.period,
            timeEnable: params.postmarket ?? false,
          })
        );

        let rangeData = this.buildClusterDataFromRangeSet(
          rangeSet,
          params.priceStep
        );
        if (rangeSet?.length) {
          rangeData.rangeSetLines = (rangeSet);
        }
        this.currentData = rangeData;
      } else {
        const rangeData = await firstValueFrom(
          this.clusterStreamService.GetRange(params)
        );
        this.currentData = rangeData;
      }

      this.dataSubject.next(this.currentData);
      return true;
    } catch (err) {
      console.error('Ошибка при выполнении запроса к серверу', err);
      if (err instanceof HttpErrorResponse) {
        await this.dialogService.info_async(err.error);
      } else {
        await this.dialogService.info_async(err);
      }
      return false;
    }
  }
}


