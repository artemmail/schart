import { Component, Inject, Input, ViewChild, ViewEncapsulation } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ChartSettings } from 'src/app/models/ChartSettings';
import {
  SelectListItemText,
  candleModesPreset,
  profilePeriodsPreset,
  totalModesPreset,
} from 'src/app/models/preserts';
import { FootPrintComponent } from '../footprint/footprint.component';
import { ChartSettingsService } from 'src/app/service/chart-settings.service';
import { MaterialModule } from 'src/app/material.module';

@Component({
  standalone: true,
  selector: 'app-footprint-settings-dialog',
  imports: [MaterialModule],
  templateUrl: './footprint-settings-dialog.component.html',
  styleUrls: ['./footprint-settings-dialog.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class FootPrintSettingsDialogComponent {
  //  @ViewChild(PresetSelectorComponent) preset: PresetSelectorComponent;

  settings: ChartSettings;
  candleModes = candleModesPreset;
  totalModes = totalModesPreset;
  profilePeriods = profilePeriodsPreset;

  profileId: number;
  settingsVolumeVisible = true;
  settingsRutickerVisible = true;
  settingsDeltaVisible = true;
  newIndicatorType: string | null = null;

  // Добавляем поле fp
  @Input() fp: FootPrintComponent;
  @Input() reloadData?: () => Promise<void> | void;
  @Input() reloadPresets?: () => Promise<void> | void;

  constructor(private chartSettingsService: ChartSettingsService) {
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

  ngOnChanges() {
    if (this.fp) {
      this.settings = this.fp.FPsettings;
      this.settings.volume1 = this.fp.levelMarksService.getFilters().volume1;
      this.settings.volume2 = this.fp.levelMarksService.getFilters().volume2;
      this.ensureIndicatorsStorage();
    }
  }

  get profileParams() {
    return this.fp?.markupManager?.getToolParams?.('Profile') ?? null;
  }

  ensureIndicatorsStorage(): void {
    if (!this.fp) return;
    if (!this.fp.FPsettings.Indicators) this.fp.FPsettings.Indicators = [];
    if (!this.fp.FPsettings.IndicatorPanels) this.fp.FPsettings.IndicatorPanels = {};
  }

  get indicatorDefinitions() {
    return this.fp?.indicatorEngine?.listDefinitions?.() ?? [];
  }

  get indicators() {
    this.ensureIndicatorsStorage();
    return this.fp?.FPsettings.Indicators ?? [];
  }

  private findIndicatorDefinition(type: string) {
    return this.indicatorDefinitions.find((d) => d.type === type);
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

  addIndicator(): void {
    if (!this.fp) return;
    this.ensureIndicatorsStorage();
    const type = this.newIndicatorType;
    if (!type) return;

    const def = this.indicatorDefinitions.find((d) => d.type === type);
    if (!def) return;

    const id = `${type}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const params: any = {};
    for (const key of Object.keys(def.paramsSchema ?? {})) {
      params[key] = (def.paramsSchema as any)[key]?.default;
    }

    let panel: any = 'chart';
    if (def.defaultPanel === 'newPanel') {
      const panelId = `${type}-panel-${Date.now()}`;
      this.fp.FPsettings.IndicatorPanels![panelId] =
        this.fp.FPsettings.IndicatorPanels![panelId] ?? { height: Math.round(90 * this.fp.colorsService.sscale()) };
      panel = { id: panelId };
    }

    const nextIndicators = [...(this.fp.FPsettings.Indicators ?? []), { id, type, params, visible: true, panel }];
    this.applyIndicators(nextIndicators);
    this.newIndicatorType = null;
    this.onChange(null);
  }

  removeIndicator(id: string): void {
    if (!this.fp) return;
    this.ensureIndicatorsStorage();
    const nextIndicators = (this.fp.FPsettings.Indicators ?? []).filter((x) => x.id !== id);
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
      if (!this.fp.FPsettings.IndicatorPanels![id]) {
        this.fp.FPsettings.IndicatorPanels![id] = { height: Math.round(90 * this.fp.colorsService.sscale()) };
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
    this.fp.FPsettings.IndicatorPanels![idBase] =
      this.fp.FPsettings.IndicatorPanels![idBase] ?? { height: Math.round(90 * this.fp.colorsService.sscale()) };
    ind.panel = { id: idBase };
    this.onChange(null);
  }

  onChange(event: any) {
    this.fp.applyOideltaDivider();
    this.save();
    this.fp.resize();
  }

  onMarkupChange(event: any) {
    this.onChange(event);
  }

  private applyIndicators(nextIndicators: ChartSettings['Indicators']): void {
    if (!this.fp) return;
    const settings = this.fp.FPsettings;
    this.fp.FPsettings = { ...settings, Indicators: nextIndicators };
    this.fp.indicatorEngine?.requestFullRecalc?.();
  }

  onOideltaDivideChange(value: boolean) {
    this.fp.FPsettings.OIDeltaDivideBy2 = value;
    this.fp.applyOideltaDivider();
    this.save();
    this.fp.resize();
  }

  onChangeVolume(event: any) {
    this.fp.levelMarksService.save();
    // this.fp.levelMarksService.markParamsData.filters.volume1

    // var filters = this.fp.levelMarksService.getFilters();

    // this.fp.levelMarksService.setVolume1(this.settings.volume1);
    // this.fp.levelMarksService.setVolume1(this.settings.volume2);
    //filters.volume2 = this.settings.volume2;

    this.save();
    this.fp.resize();
  }

  onChangeReload(event: any) {
    this.save();
    void this.reloadData?.();
  }

  onProfileSelect(event: any) {
    this.fp.resize();
  }

  save() {
    //const old = this.preset.getSelectedpreset();
    this.chartSettingsService
      .updateSettings(this.fp.FPsettings)
      .subscribe((x) => {
        this.settings = this.fp.FPsettings;

        const index = this.fp.presetItems.findIndex(
          (item) => item.Value === this.fp.presetIndex
        );

        if (this.settings.Name !== this.fp.presetItems[index].Text) {
          void this.reloadPresets?.();
          this.fp.presetIndex = x;
        }
      });
  }

  delete() {
    this.chartSettingsService
      .deleteSettings(this.fp.FPsettings)
      .subscribe(async (x) => {
        await this.reloadPresets?.();
        this.fp.presetIndex = this.fp.presetItems[0].Value;
      });
  }

  close() {
    this.close();
  }

  presetChange(a: number) {
    this.chartSettingsService.getChartSettings(a).subscribe((x) => {
      this.fp.FPsettings = x;
      this.fp.applyOideltaDivider();
      this.settings = this.fp.FPsettings;
      this.fp.resize();

      this.chartSettingsService.saveChartSettings(a).subscribe();
    });
  }

  changecolor(event: any) {
    console.log('Color change event:', event);
  }

  changecomment(event: any) {
    console.log('Comment change event:', event);
  }
}
