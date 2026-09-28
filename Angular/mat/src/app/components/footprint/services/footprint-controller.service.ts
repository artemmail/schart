import { Injectable, OnDestroy } from '@angular/core';
import { Observable, Subject, Subscription, firstValueFrom, takeUntil } from 'rxjs';
import { ChartSettings } from 'src/app/models/ChartSettings';
import { FootPrintParameters } from 'src/app/models/Params';
import { ChartSettingsService } from 'src/app/service/chart-settings.service';
import { LevelMarksService } from 'src/app/service/FootPrint/LevelMarks/level-marks.service';
import { DialogService } from 'src/app/service/DialogService.service';
import { FootprintController, MarkupViewState } from '../models/footprint-controller';
import { copyFootprintParams, FootprintInitOptions } from '../models/footprint-data.types';
import { FootprintSessionService } from './footprint-session.service';
import type { IndicatorDefinition } from '../indicators/indicator-api';
import type { MarkUpManager } from '../markup/markup-manager';

export interface FootprintRendererPort {
  readonly FPsettings: ChartSettings;
  readonly canvas: HTMLCanvasElement | null;
  readonly colorsService: { sscale(): number };
  readonly indicatorEngine: { listDefinitions(): IndicatorDefinition[] };
  readonly markupManager: MarkUpManager;
  updatePresentation(settings: ChartSettings): void;
  applyThemePreset(preset: string, force: boolean): void;
  resize(): void;
  getCsv(): void;
}

@Injectable()
export class FootprintControllerService implements FootprintController, OnDestroy {
  private renderer?: FootprintRendererPort;
  private destroyed = false;
  private cancellation$ = new Subject<void>();
  private subscription: Subscription;
  private inputParams: FootPrintParameters | null = null;
  private options: FootprintInitOptions = { minimode: false, deltamode: false };
  private commandQueue: Promise<unknown> = Promise.resolve();
  private drafts = new WeakMap<object, { signature: string; value: Record<string, any> }>();
  commandError: string | null = null;
  readonly state$;
  readonly settingsChanges$;

  constructor(private session: FootprintSessionService, private presets: ChartSettingsService,
    private marks: LevelMarksService, private dialogs: DialogService) {
    this.state$ = session.state$;
    this.settingsChanges$ = session.settingsChanges$;
    let previousId = session.currentSessionId;
    this.subscription = session.state$.subscribe(state => {
      if (state.sessionId !== previousId) { previousId = state.sessionId; this.cancellation$.next(); }
      if (state.status === 'ready' || state.status === 'empty') {
        this.inputParams = copyFootprintParams(state.snapshot.params);
        this.options = { ...state.snapshot.options };
      } else if (state.status === 'loading') this.inputParams = copyFootprintParams(state.params);
      else if (state.status === 'idle') this.inputParams = null;
    });
  }

  bindRenderer(renderer: FootprintRendererPort): void { if (!this.destroyed) this.renderer = renderer; }
  get params() { return this.inputParams ? copyFootprintParams(this.inputParams) : null; }
  get data() { return this.session.snapshot?.data ?? null; }
  get settings() { return this.session.snapshot?.settings ?? null; }
  get presetIndex() { return this.session.snapshot?.presetIndex; }
  get presetItems() { return this.session.snapshot?.presets ?? []; }
  get indicatorDefinitions() { return this.renderer?.indicatorEngine?.listDefinitions() ?? []; }
  get defaultPanelHeight() { return Math.round(90 * (this.renderer?.colorsService.sscale() ?? 1)); }
  get markupDefinitions() { return this.renderer?.markupManager?.listToolbarDefinitions() ?? []; }
  get markupState(): MarkupViewState {
    const manager = this.renderer?.markupManager;
    const type = manager?.activeDefinition?.type;
    return { activeTool: manager?.activeToolType ?? 'Edit', definition: manager?.activeDefinition ?? null,
      canDelete: manager?.hasSelection() ?? false, params: this.draft(manager?.activeParams),
      toolParams: type ? this.getMarkupParams(type) : null };
  }
  getMarkupParams(type: string) { return this.draft(this.renderer?.markupManager?.getToolParams(type)) ?? {}; }
  private draft(source?: Record<string, any> | null): Record<string, any> | null {
    if (!source) return null;
    const signature = JSON.stringify(source);
    if (this.drafts.get(source)?.signature !== signature) {
      this.drafts.set(source, { signature, value: structuredClone(source) });
    }
    return this.drafts.get(source)!.value;
  }
  selectMarkupTool(type: string): void { if (!this.destroyed) this.renderer?.markupManager?.changeMode(type); }
  deleteMarkup(): void { if (!this.destroyed) this.renderer?.markupManager?.deleteCurrent(); }
  clearMarks(ticker = this.params?.ticker): void {
    if (this.destroyed) return;
    this.renderer?.markupManager?.clearAll(false);
    this.marks.clearStorageForTicker(ticker);
    this.renderer?.resize();
  }
  changeMarkupParams(params: Record<string, any>, scope: 'tool' | 'instance' = 'instance', type?: string): void {
    if (this.destroyed) return;
    const manager = this.renderer?.markupManager;
    const target = scope === 'tool' ? manager?.getToolParams(type ?? manager.activeDefinition?.type ?? '') : manager?.activeParams;
    if (!target) return;
    Object.assign(target, structuredClone(params));
    manager!.onParamsChanged(scope !== 'tool');
  }
  getVolumeFilters() { return { ...this.marks.getFilters() }; }
  saveVolumeFilters(filters: { volume1: number; volume2: number }): void {
    if (this.destroyed) return;
    Object.assign(this.marks.getFilters(), filters); this.marks.save(); this.renderer?.resize();
  }
  applySettings(settings: ChartSettings): void {
    if (this.destroyed || !this.session.snapshot) return;
    this.session.captureSettings(settings);
    this.renderer?.updatePresentation(this.session.snapshot.settings);
  }
  applyTheme(preset: string): void {
    if (!this.destroyed) { this.renderer?.applyThemePreset(preset, true); this.renderer?.resize(); }
  }
  initialize(params: FootPrintParameters, index: number, options: FootprintInitOptions): Promise<boolean> {
    if (this.destroyed) return Promise.resolve(false);
    this.inputParams = copyFootprintParams(params); this.options = { ...options }; this.commandError = null;
    return this.session.initialize(params, index, options);
  }
  reload(params = this.params, index = this.presetIndex, options = this.options): Promise<boolean> {
    if (this.destroyed || !params) return Promise.resolve(false);
    this.inputParams = copyFootprintParams(params); this.options = { ...options }; this.commandError = null;
    return this.session.reload(params, index, options);
  }
  async selectPreset(index: number, overrides: Partial<FootPrintParameters> = {}): Promise<boolean> {
    if (this.destroyed || !this.params) return false;
    const task = this.reload({ ...this.params, candlesOnly: undefined, ...overrides }, index);
    const id = this.session.currentSessionId;
    const committed = await task;
    if (!committed || !this.current(id)) return false;
    return this.command(id, async () => { await this.read(id, () => this.presets.saveChartSettings(index)); });
  }
  async refreshPresets(): Promise<boolean> {
    const id = this.session.currentSessionId;
    return this.command(id, () => this.refreshMetadata(id, this.presetIndex));
  }
  async saveSettings(settings = this.settings, reload = false): Promise<boolean> {
    if (!settings || !this.session.snapshot) return false;
    const id = this.session.currentSessionId;
    const captured = structuredClone(settings);
    // Window positions are independent of an open settings-dialog draft.
    captured.DialogPositions = structuredClone(this.settings?.DialogPositions ?? {});
    this.applySettings(captured);
    return this.command(id, async () => {
      const index = await this.read(id, () => this.presets.updateSettings(captured));
      const item = this.presetItems.find(item => item.Value === this.presetIndex);
      if (index !== this.presetIndex || captured.Name !== item?.Text) await this.refreshMetadata(id, index);
      if (reload && this.current(id)) return this.reload({ ...this.params!, candlesOnly: captured.CandlesOnly });
      return true;
    });
  }
  saveDialogPosition(key: string, position: { x: number; y: number }): Promise<boolean> {
    if (this.destroyed || !this.settings) return Promise.resolve(false);
    const settings = structuredClone(this.settings);
    settings.DialogPositions = { ...settings.DialogPositions, [key]: { ...position } };
    this.applySettings(settings);
    return this.saveSettings();
  }
  async deletePreset(): Promise<boolean> {
    const settings = this.settings;
    if (!settings) return false;
    const id = this.session.currentSessionId;
    return this.command(id, async () => {
      await this.read(id, () => this.presets.deleteSettings(structuredClone(settings)));
      const items = await this.read(id, () => this.presets.getPresets());
      this.session.updatePresets(items, items[0]?.Value);
      return this.reload({ ...this.params!, candlesOnly: undefined }, items[0]?.Value);
    });
  }
  private async refreshMetadata(id: number, index?: number): Promise<void> {
    const items = await this.read(id, () => this.presets.getPresets());
    if (this.current(id)) this.session.updatePresets(items, index);
  }
  private current(id: number): boolean { return !this.destroyed && this.session.currentSessionId === id; }
  private async read<T>(id: number, source: () => Observable<T>): Promise<T> {
    if (!this.current(id)) throw new Error('Session superseded');
    const result = await firstValueFrom(source().pipe(takeUntil(this.cancellation$)));
    if (!this.current(id)) throw new Error('Session superseded');
    return result;
  }
  private command(id: number, action: () => Promise<void | boolean>): Promise<boolean> {
    // Keep writes ordered; a queued command still belongs to its original session.
    const task = this.commandQueue.then(async () => {
      if (!this.current(id)) return false;
      this.commandError = null;
      try { const result = await action(); return result !== false && !this.destroyed; }
      catch (error) {
        if (this.current(id)) this.commandError = error instanceof Error ? error.message : 'Не удалось выполнить команду графика.';
        return false;
      }
    });
    this.commandQueue = task;
    return task;
  }
  resize(): void { if (!this.destroyed) this.renderer?.resize(); }
  exportCsv(): void { if (!this.destroyed) this.renderer?.getCsv(); }
  async exportImage(): Promise<void> {
    if (!this.destroyed && this.renderer?.canvas) await this.dialogs.saveImage(this.renderer.canvas);
  }
  ngOnDestroy(): void { this.destroy(); }
  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true; this.cancellation$.next(); this.cancellation$.complete();
    this.subscription.unsubscribe(); this.renderer = undefined; this.inputParams = null; this.drafts = new WeakMap();
  }
}
