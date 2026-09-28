import type { ChartSettings } from 'src/app/models/ChartSettings';
import type { FootPrintParameters } from 'src/app/models/Params';
import type { SelectListItemNumber } from 'src/app/models/preserts';
import type { ClusterData } from './cluster-data';
import type { IndicatorDefinition } from '../indicators/indicator-api';
import type { MarkupDefinition } from '../markup/markup-api';
import type { Observable } from 'rxjs';
import type { FootprintLoadState } from './footprint-data.types';

export interface MarkupViewState {
  readonly activeTool: string;
  readonly definition: MarkupDefinition | null;
  readonly canDelete: boolean;
  readonly params: Record<string, any> | null;
  readonly toolParams: Record<string, any> | null;
}

/** UI sees data and commands, never renderer/managers or transport services. */
export interface FootprintController {
  readonly state$: Observable<FootprintLoadState>;
  readonly settingsChanges$: Observable<{ sessionId: number; settings: Readonly<ChartSettings> }>;
  readonly params: FootPrintParameters | null;
  readonly data: ClusterData | null;
  readonly settings: ChartSettings | null;
  readonly presetIndex: number | undefined;
  readonly presetItems: SelectListItemNumber[];
  readonly commandError: string | null;
  readonly indicatorDefinitions: IndicatorDefinition[];
  readonly markupDefinitions: MarkupDefinition[];
  readonly markupState: MarkupViewState;
  readonly defaultPanelHeight: number;
  getMarkupParams(type: string): Record<string, any>;
  changeMarkupParams(params: Record<string, any>, scope?: 'tool' | 'instance', type?: string): void;
  selectMarkupTool(type: string): void;
  deleteMarkup(): void;
  clearMarks(ticker?: string): void;
  getVolumeFilters(): { volume1: number; volume2: number };
  saveVolumeFilters(filters: { volume1: number; volume2: number }): void;
  applySettings(settings: ChartSettings): void;
  applyTheme(preset: string): void;
  saveDialogPosition(key: string, position: { x: number; y: number }): Promise<boolean>;
  selectPreset(index: number, overrides?: Partial<FootPrintParameters>): Promise<boolean>;
  saveSettings(settings?: ChartSettings, reload?: boolean): Promise<boolean>;
  deletePreset(): Promise<boolean>;
  reload(params?: FootPrintParameters): Promise<boolean>;
  refreshPresets(): Promise<boolean>;
  resize(): void;
  exportCsv(): void;
  exportImage(): Promise<void>;
}
