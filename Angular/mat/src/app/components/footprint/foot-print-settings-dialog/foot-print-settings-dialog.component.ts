import {
  Component,
  Inject,
  Input,
  input,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ChartSettings } from 'src/app/models/ChartSettings';
import {
  SelectListItemText,
  candleModesPreset,
  profilePeriodsPreset,
  totalModesPreset,
} from 'src/app/models/preserts';
import { FootPrintComponent } from '../footprint.component';
import { ProfileModel } from 'src/app/models/profileModel';
import { ChartSettingsService } from 'src/app/service/chart-settings.service';
import { PresetSelectorComponent } from '../../Controls/PresetSelector/preset-selector.component';

@Component({
  standalone: false,
  selector: 'app-footprint-settings-dialog',
  templateUrl: './foot-print-settings-dialog.component.html',
  styleUrls: ['./foot-print-settings-dialog.component.css'],
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
  markup: ProfileModel;

  // Добавляем поле fp
  @Input() fp: FootPrintComponent;

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
      this.markup = this.fp.viewModel;
    }
  }

  onChange(event: any) {
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
    this.fp.ReLoad();
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
          this.fp.reloadPresets();
          this.fp.presetIndex = x;
        }
      });
  }

  delete() {
    this.chartSettingsService
      .deleteSettings(this.fp.FPsettings)
      .subscribe(async (x) => {
        await this.fp.reloadPresetsAsync();
        this.fp.presetIndex = this.fp.presetItems[0].Value;
      });
  }

  close() {
    this.close();
  }

  presetChange(a: number) {
    this.chartSettingsService.getChartSettings(a).subscribe((x) => {
      this.fp.FPsettings = x;
      this.settings = this.fp.FPsettings;
      this.fp.resize();
    });
  }

  changecolor(event: any) {
    console.log('Color change event:', event);
  }

  changecomment(event: any) {
    console.log('Comment change event:', event);
  }
}
