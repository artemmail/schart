import { ChartSettings } from 'src/app/models/ChartSettings';
import { FootPrintParameters } from 'src/app/models/Params';
import { FootprintUpdateEvent } from './footprint-data.types';
import { ClusterData } from './clusterData';

export interface FootprintSnapshot {
  data: ClusterData;
  params: FootPrintParameters;
  settings: ChartSettings;
}

export type FootprintRenderCommand =
  | {
      type: 'snapshot';
      snapshot: FootprintSnapshot;
    }
  | {
      type: 'delta';
      delta: FootprintUpdateEvent;
    }
  | {
      type: 'settings';
      settings: ChartSettings;
      params?: FootPrintParameters;
    };

export interface FootprintRenderer {
  applyRenderCommand(command: FootprintRenderCommand): void;
}
