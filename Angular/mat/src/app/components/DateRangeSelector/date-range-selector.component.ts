import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Observable, of } from 'rxjs';
import { SelectListItemParams, SelectListItemText } from 'src/app/models/preserts';
import { FootPrintRequestParams } from 'src/app/models/FootPrintPar';
import { CommonService } from 'src/app/service/common.service';
import { switchMap } from 'rxjs/operators';

@Component({
  standalone: false,
  selector: 'app-date-range-selector',
  templateUrl: './date-range-selector.component.html',
  styleUrls: ['./date-range-selector.component.css'],
})
export class PresetSelectorComponent1 implements OnInit {
  @Input() ticker: string  = 'GAZP';
  @Input() rperiod: string | null = 'custom';
  @Output() selectionChange = new EventEmitter<FootPrintRequestParams>();

  marketControl = new FormControl('');
  periodPresets$: Observable<SelectListItemParams[]> = of([]);

  presets: SelectListItemText[] = [];
  Dic: { [rperiod: string]: FootPrintRequestParams } = {};

  constructor(private commonService: CommonService) {}

  ngOnInit(): void {
    this.loadPeriodPresets();
    // Инициализация
  }

  public loadPeriodPresets(): void {
    if (!this.ticker) {
      // Если тикер не задан, очищаем пресеты
      this.presets = [];
      this.Dic = {};
      this.marketControl.setValue('custom');
      return;
    }

    this.periodPresets$ = this.commonService.PresetsItems(this.ticker);

    this.periodPresets$.subscribe((markets) => {
      if (markets && markets.length > 0) {
        this.presets = this.transformList(markets);
        this.Dic = this.createRperiodDictionary(markets);
        const initialMarket = this.rperiod;

        this.marketControl.setValue(initialMarket);
      } else {
        this.presets = [];
        this.Dic = {};
        this.marketControl.setValue('custom');
      }
    });

    // Подписка на изменения выбора пресета
    this.marketControl.valueChanges.subscribe((value) => {
      if (this.Dic && value in this.Dic && value !== 'custom') {
        this.selectionChange.emit(this.Dic[value]);
      }
    });
  }

  public setCustom() {
    this.marketControl.setValue('custom');
  }

  createRperiodDictionary(list: SelectListItemParams[]): { [rperiod: string]: FootPrintRequestParams } {
    return list.reduce((acc, item) => {
      if (item.Value.rperiod) {
        acc[item.Value.rperiod] = item.Value;
      }
      return acc;
    }, {} as { [rperiod: string]: FootPrintRequestParams });
  }

  transformList(list: SelectListItemParams[]): SelectListItemText[] {
    return list.map((item) => ({
      Text: item.Text,
      Value: item.Value.rperiod || '',
    }));
  }

  getSelectedPreset(): FootPrintRequestParams {
    return this.Dic[this.marketControl.value];
  }
}
