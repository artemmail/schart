import type { ChartSettings } from 'src/app/models/ChartSettings';
import type { FootPrintParameters } from 'src/app/models/Params';
import type { SelectListItemNumber } from 'src/app/models/preserts';
import type { ClusterData } from './cluster-data';

export interface FootprintInitOptions {
  minimode: boolean;
  deltamode: boolean;
}

export type FootprintUpdateType = 'cluster' | 'ticks' | 'ladder';

export interface FootprintUpdateEvent {
  sessionId: number;
  type: FootprintUpdateType;
  merged?: boolean;
}

export interface FootprintPendingUpdate {
  type: FootprintUpdateType;
  payload: any;
}

export interface FootprintLoadRequest {
  readonly sessionId: number;
  readonly params: Readonly<FootPrintParameters>;
  readonly presetIndex: number | undefined;
  readonly options: Readonly<FootprintInitOptions>;
  readonly loadPresets: boolean;
  readonly settings?: ChartSettings;
}

export interface FootprintPreparedSession {
  readonly sessionId: number;
  readonly params: Readonly<FootPrintParameters>;
  readonly presetIndex: number | undefined;
  readonly options: Readonly<FootprintInitOptions>;
  readonly settings: ChartSettings;
  readonly presets: SelectListItemNumber[];
}

export interface FootprintSnapshot extends FootprintPreparedSession {
  readonly data: ClusterData;
}

export type FootprintLoadState =
  | { status: 'idle'; sessionId: number }
  | { status: 'loading'; sessionId: number; params: Readonly<FootPrintParameters> }
  | { status: 'error'; sessionId: number; params: Readonly<FootPrintParameters>; message: string }
  | { status: 'ready' | 'empty'; sessionId: number; snapshot: FootprintSnapshot };

/** Keep caller-owned dates and form objects outside the active session. */
export function copyFootprintParams(params: Readonly<FootPrintParameters>): FootPrintParameters {
  return {
    ...params,
    startDate: params.startDate instanceof Date ? new Date(params.startDate) : params.startDate,
    endDate: params.endDate instanceof Date ? new Date(params.endDate) : params.endDate,
  };
}
