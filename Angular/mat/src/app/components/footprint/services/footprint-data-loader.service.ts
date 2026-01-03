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

  private async requestRange(params: FootPrintParameters): Promise<boolean> {

        let CandlesRangeSetParams = {
      ...params,
      ticker1: 'GAZP*2',
      ticker2: 'SBER',
    };


    try {
      const rangeData = await firstValueFrom(
        this.clusterStreamService.getRangeSetArray(params)
      );
      debugger
      this.currentData = new ClusterData(rangeData);
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


