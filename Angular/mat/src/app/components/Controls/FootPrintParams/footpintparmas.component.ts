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
import {
  applyFootprintModeToParams,
  DEFAULT_ARBITRAGE_PORTFOLIO_1,
  DEFAULT_ARBITRAGE_PORTFOLIO_2,
  FootprintMode,
  resolveFootprintMode,
} from 'src/app/models/footprint-mode';

type FootprintUiMode = Exclude<FootprintMode, 'ticks'>;

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
  loadMode: FootprintUiMode = 'clusters';
  private lastNonTickPeriod = 1;

  constructor(
    private commonService: CommonService,
    public matEventEmitterService: MatEventEmitterService,
    private cdr: ChangeDetectorRef
  ) {
    this.subscribeToEventEmitter();
  }

  refresh() {}

  onLoadModeChange(mode: FootprintUiMode) {
    this.applyMode(mode);
  }

  isArbitrageMode(): boolean {
    return this.loadMode === 'arbitrage';
  }

  isClusterMode(): boolean {
    return this.loadMode === 'clusters';
  }
  isTickMode(): boolean {
    return Number(this.params?.period) === 0;
  }
  onArbitrageTickersChange() {
    if (this.isArbitrageMode() && this.params) {
      const next = applyFootprintModeToParams(this.params, 'arbitrage', {
        defaultPeriod: this.lastNonTickPeriod,
        keepArbitrageTickers: true,
        arbitrageDefaults: {
          ticker1: DEFAULT_ARBITRAGE_PORTFOLIO_1,
          ticker2: DEFAULT_ARBITRAGE_PORTFOLIO_2,
        },
      });
      Object.assign(this.params, next);
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

  SelectPeriod(val: any) {
    if (!this.params) {
      return;
    }

    const period = Number(this.params.period);
    if (!Number.isFinite(period)) {
      return;
    }

    if (period === 0) {
      this.params.type = undefined;
      this.params.candlesOnly = false;
      return;
    }

    if (period > 0) {
      this.lastNonTickPeriod = period;
      this.applyMode(this.loadMode);
    }
  }

  public GetModel(): FootPrintParameters {
    const period = Number(this.params?.period);
    const isTickPeriod = Number.isFinite(period) && period === 0;
    let normalized: TickerPresetNew;

    if (isTickPeriod) {
      normalized = {
        ...this.params,
        period: 0,
        candlesOnly: false,
        type: undefined,
        ticker1: undefined,
        ticker2: undefined,
      };
    } else {
      normalized = applyFootprintModeToParams(
        { ...this.params },
        this.loadMode,
        {
          defaultPeriod: this.lastNonTickPeriod,
          arbitrageDefaults: {
            ticker1: DEFAULT_ARBITRAGE_PORTFOLIO_1,
            ticker2: DEFAULT_ARBITRAGE_PORTFOLIO_2,
          },
        }
      );
    }

    if (normalized.period && normalized.period > 0) {
      this.lastNonTickPeriod = normalized.period;
    }

    return {
      ticker: normalized.ticker,
      ticker1: normalized.ticker1,
      ticker2: normalized.ticker2,
      period: normalized.period,
      rperiod: normalized.rperiod,
      priceStep: normalized.priceStep,
      startDate: this.DateRange.getStart(),
      endDate: this.DateRange.getEnd(),
      candlesOnly: normalized.candlesOnly,
      type: normalized.type,
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

    const resolvedMode = resolveFootprintMode(this.params);
    if (resolvedMode === 'arbitrage') {
      this.loadMode = 'arbitrage';
    } else if (resolvedMode === 'candles') {
      this.loadMode = 'candles';
    } else {
      this.loadMode = 'clusters';
    }

    const period = Number(this.params.period);
    if (Number.isFinite(period) && period > 0) {
      this.lastNonTickPeriod = period;
    }

    if (this.loadMode === 'arbitrage') {
      this.applyMode('arbitrage');
    }
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

  private applyMode(mode: FootprintUiMode) {
    this.loadMode = mode;
    if (!this.params) {
      return;
    }

    const period = Number(this.params.period);
    const isTickPeriod = Number.isFinite(period) && period === 0;
    if (Number.isFinite(period) && period > 0) {
      this.lastNonTickPeriod = period;
    }

    if (isTickPeriod && mode !== 'arbitrage') {
      this.params.type = undefined;
      this.params.candlesOnly = false;
      return;
    }

    const next = applyFootprintModeToParams(this.params, mode, {
      defaultPeriod: this.lastNonTickPeriod,
      arbitrageDefaults: {
        ticker1: DEFAULT_ARBITRAGE_PORTFOLIO_1,
        ticker2: DEFAULT_ARBITRAGE_PORTFOLIO_2,
      },
    });
    Object.assign(this.params, next);

    if (this.params.period && this.params.period > 0) {
      this.lastNonTickPeriod = this.params.period;
    }
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
