import {
  Component,
  ViewChild,
  AfterViewInit,
  OnInit,
  Input,
  forwardRef,
  ChangeDetectorRef,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { DateRangePickerComponent } from '../../Controls/DateRange/date-range-picker.component';
import { TickerPresetNew } from 'src/app/models/tickerpreset';
import { SelectListItemNumber, SmallPeriodPreset } from 'src/app/models/preserts';
import { TickerAutocompleteComponent } from '../ticker-autocomplete/ticker-autocomplete.component';

import { FootPrintParameters } from 'src/app/models/Params';
import { FootPrintRequestParams } from 'src/app/models/FootPrintPar';
import { MatEventEmitterService } from 'src/app/service/mat-event-emitter.service';
import { CommonService } from 'src/app/service/common.service';
import { tap } from 'rxjs/operators';
import { PresetSelectorComponent1 } from '../../DateRangeSelector/date-range-selector.component';
import { MaterialModule } from 'src/app/material.module';
import { ComboBoxComponent } from '../ComboBox/combobox.component';

@Component({
  standalone: true,
  selector: 'footprint-params',
  imports: [
    MaterialModule,
    DateRangePickerComponent,
    TickerAutocompleteComponent,
    PresetSelectorComponent1,
    ComboBoxComponent,
  ],
  templateUrl: './footpintparmas.component.html',
  styleUrls: ['./footpintparmas.component.css'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FootPrintParamsComponent),
      multi: true,
    },
  ],
})
export class FootPrintParamsComponent
  implements AfterViewInit, OnInit, ControlValueAccessor
{
  @ViewChild(DateRangePickerComponent) DateRange: DateRangePickerComponent;
  @ViewChild(TickerAutocompleteComponent)
  tickerAutocomplete: TickerAutocompleteComponent;
  @ViewChild('presetSelector') presetSelector: PresetSelectorComponent1;
  @Input() params: TickerPresetNew;

  presets2: SelectListItemNumber[] = SmallPeriodPreset;
  loadMode: 'candles' | 'clusters' | 'arbitrage' = 'clusters';

  constructor(
    private commonService: CommonService,
    public matEventEmitterService: MatEventEmitterService,
    private cdr: ChangeDetectorRef
  ) {
    this.subscribeToEventEmitter();
  }

  refresh() {}

  onLoadModeChange(mode: 'candles' | 'clusters' | 'arbitrage') {
    this.loadMode = mode;
    if (!this.params) {
      return;
    }

    if (mode === 'arbitrage') {
      this.applyArbitrageDefaults();
    } else {
      this.params.type = undefined;
      this.params.candlesOnly = mode === 'candles';
    }
  }

  isArbitrageMode(): boolean {
    return this.loadMode === 'arbitrage';
  }

  isClusterMode(): boolean {
    return this.loadMode === 'clusters';
  }
  onArbitrageTickersChange() {
    if (this.isArbitrageMode() && this.params) {
      this.params.type = 'arbitrage';
    }
  }

  onDateRangeSelectionChange(range: { start: Date | null; end: Date | null }) {
    if (!this.params || !this.presetSelector) {
      return;
    }

    const matched = this.findPresetByRange(range.start, range.end);
    const next = matched ?? 'custom';

    this.params.rperiod = next;
    this.presetSelector.marketControl.setValue(next, { emitEvent: false });
  }

  applyPreset(foundPreset: FootPrintRequestParams) {
    if (!this.params || !foundPreset) {
      return;
    }

    this.params.rperiod = foundPreset.rperiod ?? this.params.rperiod;
    this.params.startDate = foundPreset.startDate ?? this.params.startDate;
    this.params.endDate = foundPreset.endDate ?? this.params.endDate;
    if (foundPreset.period !== undefined) {
      this.params.period = foundPreset.period;
    }
    if (foundPreset.priceStep !== undefined) {
      this.params.priceStep = foundPreset.priceStep;
    }

    if (this.DateRange && this.params.startDate && this.params.endDate) {
      this.DateRange.setDatesRange(this.params.startDate, this.params.endDate);
    }
  }

  SelectPeriod(val: any) {}

  public GetModel(): FootPrintParameters {
    this.params.type = this.isArbitrageMode() ? 'arbitrage' : undefined;
    if (!this.isArbitrageMode()) {
      this.params.ticker1 = undefined;
      this.params.ticker2 = undefined;
    }
    return {
      ticker: this.params.ticker,
      ticker1: this.params.ticker1,
      ticker2: this.params.ticker2,
      period: this.params.period,
      rperiod: this.params.rperiod,
      priceStep: this.params.priceStep,
      startDate: this.DateRange.getStart(),
      endDate: this.DateRange.getEnd(),
      candlesOnly: this.params.candlesOnly,
      type: this.params.type,
    };
  }

  SetMinStep(ticker: string) {
    return this.commonService
      .getControlsNew({ ticker: ticker })
      .pipe(
        tap((x: TickerPresetNew) => {
          // Логика обработки minStep
        })
      )
      .subscribe();
  }

  onTickerSelected(ticker: string) {
    this.params.ticker = ticker;
    this.cdr.detectChanges();

    if (this.presetSelector) {
      this.presetSelector.loadPeriodPresets();
    }
  }

  public ngOnInit() {
    this.syncLoadMode();
  }

  public ngAfterViewInit() {
    this.presetSelector.loadPeriodPresets();
    setTimeout(() => {
      if (this.DateRange) {
        this.DateRange.setDatesRange(this.params.startDate, this.params.endDate);
        this.cdr.detectChanges();
      }
    });
  }

  private subscribeToEventEmitter() {}

  private syncLoadMode() {
    if (!this.params) {
      return;
    }

    if (this.params.type === 'arbitrage') {
      this.loadMode = 'arbitrage';
      this.applyArbitrageDefaults();
      return;
    }

    this.loadMode = this.params.candlesOnly ? 'candles' : 'clusters';
  }

  private findPresetByRange(start: Date | null, end: Date | null): string | null {
    if (!start || !end || !this.presetSelector?.Dic) {
      return null;
    }

    if (this.hasExplicitTime(start) || this.hasExplicitTime(end)) {
      return null;
    }

    const startKey = this.toDateKey(start);
    const endKey = this.toDateKey(end);

    for (const [rperiod, preset] of Object.entries(this.presetSelector.Dic)) {
      const presetStart = this.coerceDate(preset?.startDate);
      const presetEnd = this.coerceDate(preset?.endDate);
      if (!presetStart || !presetEnd) {
        continue;
      }

      if (startKey === this.toDateKey(presetStart) && endKey === this.toDateKey(presetEnd)) {
        return rperiod;
      }
    }

    return null;
  }

  private toDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private hasExplicitTime(date: Date): boolean {
    return (
      date.getHours() !== 0 ||
      date.getMinutes() !== 0 ||
      date.getSeconds() !== 0 ||
      date.getMilliseconds() !== 0
    );
  }

  private coerceDate(value: unknown): Date | null {
    if (!value) {
      return null;
    }
    if (value instanceof Date) {
      return isNaN(value.getTime()) ? null : value;
    }
    const parsed = new Date(value as any);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  private applyArbitrageDefaults() {
    this.params.type = 'arbitrage';
    this.params.candlesOnly = false;
    this.params.ticker1 = this.params.ticker1 ?? 'GAZP*200+LKOH*10';
    this.params.ticker2 = this.params.ticker2 ?? 'GMKN*3+SBER*300';
  }

  // Реализация ControlValueAccessor
  writeValue(value: any): void {
    if (value) {
      this.params = value;
      if (this.params.ticker) {
        // Опционально вызвать SetMinStep с тикером
      }
      if (this.DateRange) {
        this.DateRange.setDatesRange(
          this.params.startDate,
          this.params.endDate
        );
      }

      this.syncLoadMode();
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    // Опциональная реализация
  }

  onChange: any = () => {};
  onTouched: any = () => {};
}
