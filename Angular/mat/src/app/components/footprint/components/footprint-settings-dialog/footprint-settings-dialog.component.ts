import { Component, Input, Optional, ViewEncapsulation, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { MatDialogRef } from '@angular/material/dialog';
import { ChartSettings } from 'src/app/models/ChartSettings';
import {
  SelectListItemText,
  candleModesPreset,
  profilePeriodsPreset,
  totalModesPreset,
} from 'src/app/models/preserts';
import type { FootprintController } from '../../models/footprint-controller';
import { MaterialModule } from 'src/app/material.module';
import { IndicatorDefinition } from '../../indicators/indicator-api';

type IndicatorProvider = 'stockchart' | 'technicalindicators';

@Component({
  standalone: true,
  selector: 'app-footprint-settings-dialog',
  imports: [MaterialModule],
  templateUrl: './footprint-settings-dialog.component.html',
  styleUrls: ['./footprint-settings-dialog.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class FootPrintSettingsDialogComponent implements OnDestroy {
  private stateSubscription?: Subscription;
  private draftSessionId?: number;
  filters = { volume1: 0, volume2: 0 };
  //  @ViewChild(PresetSelectorComponent) preset: PresetSelectorComponent;

  settings: ChartSettings;
  candleModes = candleModesPreset;
  totalModes = totalModesPreset;
  profilePeriods = profilePeriodsPreset;
  themePresets: SelectListItemText[] = [
    { Value: 'Light', Text: 'Светлая' },
    { Value: 'Dark', Text: 'Темная' },
  ];

  profileId: number;
  settingsVolumeVisible = true;
  settingsRutickerVisible = true;
  settingsDeltaVisible = true;
  newIndicatorType: string | null = null;
  newTechnicalIndicatorType: string | null = null;

  // Добавляем поле fp
  @Input() fp: FootprintController;

  constructor(
    @Optional() private dialogRef?: MatDialogRef<FootPrintSettingsDialogComponent>
  ) {
    /*if (data) {
      this.fp = data.fp;
    }*/
  }

  getHtmlContent(): string {
    return this.legends[this.settings.style];
  }

  legends = {
    Ruticker: 'Отображает направление сделок с возможностью фильтрации',
    ASKxBID:
      'Отображает в кластере число покупок и число продаж, интерсивность цвета указывает разницу между покупками и продажами',
    VolumeDelta: 'Объем и разница между покупками и продажами в одном кластере',
    Volume: 'Не учитывает направление сделок, фильтрует объем',
    Volfix: 'Не учитывает направление сделок, фильтрует объем',
    Density:
      'Визуально отображает крупные сделки в кластере - соотношение сделок и объема. Чем темнее, тем сделки крупнее',
  };

  classicStyles = {
    'ASK+BID': 'Покупки и продажи рядом в одну линию',
    'ASK/BID': 'Покупки и продажи в два ряда',
    'ASK-BID': 'Разница между покупками и продажами',
    ASK: 'Только покупки',
    BID: 'Только продажи',
    Tree: 'Покупки и продажи слева и справа от центра',
  };

  deltaStyles = {
    Tree: 'Визуализация с помощью размера. Объем - синий, дельта(разница покупок и продаж) - зеленая или красная',
    Delta:
      'Визуализация с помощью интенсивности цвета. Объем - синий, дельта(разница покупок и продаж) - зеленая или красная.',
  };

  ngOnChanges(): void {
    this.stateSubscription?.unsubscribe();
    this.draftSessionId = undefined;
    this.stateSubscription = this.fp?.state$.subscribe(state => {
      if ((state.status === 'ready' || state.status === 'empty') && state.sessionId !== this.draftSessionId) {
        this.draftSessionId = state.sessionId;
        this.settings = structuredClone(state.snapshot.settings);
        this.filters = this.fp.getVolumeFilters();
        this.ensureIndicatorsStorage();
      }
    });
  }

  ngOnDestroy(): void { this.stateSubscription?.unsubscribe(); }

  get profileParams() {
    return this.fp?.getMarkupParams('Profile') ?? null;
  }

  ensureIndicatorsStorage(): void {
    if (!this.settings) return;
    if (!this.settings.Indicators) this.settings.Indicators = [];
    if (!this.settings.IndicatorPanels) this.settings.IndicatorPanels = {};
  }

  get indicatorDefinitions() {
    return this.fp?.indicatorDefinitions ?? [];
  }

  get indicators() {
    this.ensureIndicatorsStorage();
    return this.settings?.Indicators ?? [];
  }

  getDefinitionsForProvider(provider: IndicatorProvider) {
    return this.indicatorDefinitions.filter((def) => this.getDefinitionProvider(def) === provider);
  }

  getIndicatorsForProvider(provider: IndicatorProvider) {
    return this.indicators.filter((ind) => this.getDefinitionProvider(this.findIndicatorDefinition(ind.type)) === provider);
  }

  getNewIndicatorType(provider: IndicatorProvider): string | null {
    return provider === 'technicalindicators' ? this.newTechnicalIndicatorType : this.newIndicatorType;
  }

  setNewIndicatorType(provider: IndicatorProvider, type: string | null): void {
    if (provider === 'technicalindicators') {
      this.newTechnicalIndicatorType = type;
      return;
    }

    this.newIndicatorType = type;
  }

  addIndicatorForProvider(provider: IndicatorProvider): void {
    const added = this.addIndicatorByType(this.getNewIndicatorType(provider));
    if (added) {
      this.setNewIndicatorType(provider, null);
    }
  }

  private findIndicatorDefinition(type: string) {
    return this.indicatorDefinitions.find((d) => d.type === type);
  }

  private getDefinitionProvider(def: IndicatorDefinition | undefined): IndicatorProvider {
    return def?.provider === 'technicalindicators' ? 'technicalindicators' : 'stockchart';
  }

  getIndicatorDisplayName(type: string): string {
    const def = this.findIndicatorDefinition(type);
    return def?.displayName ?? type;
  }

  getIndicatorSchema(type: string): any {
    const def = this.findIndicatorDefinition(type);
    return def?.paramsSchema ?? null;
  }

  isPanelFixed(type: string): boolean {
    const def = this.findIndicatorDefinition(type);
    return def?.panelBehavior === 'fixed';
  }

  showVisibilityToggle(type: string): boolean {
    return type !== 'open-positions-interest';
  }

  addIndicator(): void {
    this.addIndicatorForProvider('stockchart');
  }

  private addIndicatorByType(type: string | null): boolean {
    if (!this.fp) return false;
    this.ensureIndicatorsStorage();
    if (!type) return false;

    const def = this.indicatorDefinitions.find((d) => d.type === type);
    if (!def) return false;

    const id = `${type}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const params: any = {};
    for (const key of Object.keys(def.paramsSchema ?? {})) {
      params[key] = (def.paramsSchema as any)[key]?.default;
    }

    let panel: any = 'chart';
    if (def.defaultPanel === 'newPanel') {
      const panelId = `${type}-panel-${Date.now()}`;
      this.settings.IndicatorPanels![panelId] =
        this.settings.IndicatorPanels![panelId] ?? { height: this.fp.defaultPanelHeight };
      panel = { id: panelId };
    }

    const nextIndicators = [...(this.settings.Indicators ?? []), { id, type, params, visible: true, panel }];
    this.applyIndicators(nextIndicators);
    this.onChange(null);
    return true;
  }

  removeIndicator(id: string): void {
    if (!this.fp) return;
    this.ensureIndicatorsStorage();
    const nextIndicators = (this.settings.Indicators ?? []).filter((x) => x.id !== id);
    this.applyIndicators(nextIndicators);
    this.onChange(null);
  }

  getPanelValue(ind: any): string {
    if (!ind?.panel || ind.panel === 'chart') return 'chart';
    return `panel:${ind.panel.id}`;
  }

  setPanelValue(ind: any, value: string): void {
    if (!this.fp) return;
    if (this.isPanelFixed(ind?.type)) {
      return;
    }
    this.ensureIndicatorsStorage();
    if (value === 'chart') {
      ind.panel = 'chart';
      return;
    }
    if (value.startsWith('panel:')) {
      const id = value.slice('panel:'.length);
      ind.panel = { id };
      if (!this.settings.IndicatorPanels![id]) {
        this.settings.IndicatorPanels![id] = { height: this.fp.defaultPanelHeight };
      }
    }
  }

  addNewPanelFor(ind: any): void {
    if (!this.fp) return;
    if (this.isPanelFixed(ind?.type)) {
      return;
    }
    this.ensureIndicatorsStorage();
    const idBase = `${ind?.type ?? 'panel'}-${Date.now()}`;
    this.settings.IndicatorPanels![idBase] =
      this.settings.IndicatorPanels![idBase] ?? { height: this.fp.defaultPanelHeight };
    ind.panel = { id: idBase };
    this.onChange(null);
  }

  onChange(event: any) {
    this.fp.applySettings(this.settings);
    this.save();
    this.fp.resize();
  }

  onThemePresetChange(preset: string) {
    if (!this.fp) return;
    this.fp.applyTheme(preset);
    this.save();
  }

  onMarkupChange(event: any) {
    this.fp.changeMarkupParams(this.profileParams, 'tool', 'Profile');
    this.onChange(event);
  }

  private applyIndicators(nextIndicators: ChartSettings['Indicators']): void {
    if (!this.fp) return;
    const settings = this.settings;
    this.settings = { ...settings, Indicators: nextIndicators };
    this.fp.applySettings(this.settings);
  }

  onOideltaDivideChange(value: boolean) {
    this.settings.OIDeltaDivideBy2 = value;
    this.fp.applySettings(this.settings);
    this.save();
    this.fp.resize();
  }

  onChangeVolume(event: any) {
    this.fp.saveVolumeFilters(this.filters);


    //filters.volume2 = this.settings.volume2;

    this.save();
    this.fp.resize();
  }

  onChangeReload(event: any) {
    void this.saveAndReload();
  }

  onProfileSelect(event: any) {
    this.fp.resize();
  }

  save(): void {
    void this.fp.saveSettings(this.settings);
  }

  private async saveAndReload(): Promise<void> {
    await this.fp.saveSettings(this.settings, true);
  }

  async delete(): Promise<void> {
    await this.fp.deletePreset();
  }

  close(): void { this.dialogRef?.close(); }

  async presetChange(index: number): Promise<void> {
    await this.fp.selectPreset(index);
  }

  changecolor(event: any) {}

  changecomment(event: any) {}
}
