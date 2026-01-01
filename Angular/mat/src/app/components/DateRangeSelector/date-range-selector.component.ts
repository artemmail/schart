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
  private valueChangesInitialized = false;

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
        const initialMarket = this.resolveInitialRperiod(markets);
        this.marketControl.setValue(initialMarket);
      } else {
        this.presets = [];
        this.Dic = {};
        this.marketControl.setValue('custom');
      }
    });

    // Подписка на изменения выбора пресета
    if (!this.valueChangesInitialized) {
      this.marketControl.valueChanges.subscribe((value) => {
        if (this.Dic && value in this.Dic && value !== 'custom') {
          this.selectionChange.emit(this.Dic[value]);
        }
      });
      this.valueChangesInitialized = true;
    }
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

  private resolveInitialRperiod(list: SelectListItemParams[]): string {
    if (this.rperiod) {
      if (this.rperiod in this.Dic) {
        return this.rperiod;
      }

      if (this.rperiod === 'custom') {
        return 'custom';
      }
    }

    const firstPreset = list.find((item) => item.Value.rperiod)?.Value.rperiod;
    return firstPreset ?? 'custom';
  }
}
