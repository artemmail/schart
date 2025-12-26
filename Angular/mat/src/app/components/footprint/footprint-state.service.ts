import { Injectable } from '@angular/core';
import { ChartSettings } from 'src/app/models/ChartSettings';
import { FootPrintParameters } from 'src/app/models/Params';
import { ChartSettingsService } from 'src/app/service/chart-settings.service';
import { ClusterData } from './clusterData';

export interface FootprintComponentState {
  data: ClusterData | null;
  params: FootPrintParameters | null;
  settings: ChartSettings;
  hiddenHint: boolean;
  selectedPrice: number | null;
  selectedPrice1: number | null;
  dragMode: number | null;
  viewInitialized: boolean;
}

@Injectable()
export class FootprintStateService {
  private state: FootprintComponentState = {
    data: null,
    params: null,
    settings: ChartSettingsService.DefaultSettings(),
    hiddenHint: true,
    selectedPrice: null,
    selectedPrice1: null,
    dragMode: null,
    viewInitialized: false,
  };

  get snapshot(): FootprintComponentState {
    return this.state;
  }

  private update(partial: Partial<FootprintComponentState>): void {
    this.state = { ...this.state, ...partial };
  }

  setParams(params: FootPrintParameters | null): void {
    this.update({ params });
  }

  setData(data: ClusterData | null): void {
    this.update({ data });
  }

  setSelectedPrice(price: number | null): void {
    this.update({ selectedPrice: price });
  }

  setSelectedPrice1(price: number | null): void {
    this.update({ selectedPrice1: price });
  }

  setDragMode(mode: number | null): void {
    this.update({ dragMode: mode });
  }

  setSettings(settings: ChartSettings): void {
    this.update({ settings });
  }

  clearSelection(): void {
    this.update({ selectedPrice: null, selectedPrice1: null });
  }

  setHintHidden(hidden: boolean): void {
    this.update({ hiddenHint: hidden });
  }

  markViewInitialized(): void {
    this.update({ viewInitialized: true });
  }
}
