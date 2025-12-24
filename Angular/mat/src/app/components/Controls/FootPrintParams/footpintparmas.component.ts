import {
  Component,
  ViewChild,
  AfterViewInit,
  OnInit,
  Input,
  forwardRef,
  ChangeDetectorRef
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { DateRangePickerComponent } from '../../Controls/DateRange/date-range-picker.component';
import { TickerPresetNew } from 'src/app/models/tickerpreset';
import { SelectListItemNumber, SmallPeriodPreset } from 'src/app/models/preserts';
import { TickerAutocompleteComponent } from '../ticker-autocomplete/ticker-autocomplete.component';

import { FootPrintParameters } from 'src/app/models/Params';
import { MatEventEmitterService } from 'src/app/service/mat-event-emitter.service';
import { CommonService } from 'src/app/service/common.service';
import { tap } from 'rxjs/operators';
import { PresetSelectorComponent1 } from '../../DateRangeSelector/date-range-selector.component';

@Component({
  standalone: false,
  selector: 'footprint-params',
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

  constructor(
    private commonService: CommonService,
    public matEventEmitterService: MatEventEmitterService,
    private cdr: ChangeDetectorRef
  ) {
    this.subscribeToEventEmitter();
  }

  refresh() {}

  applyPreset(foundPreset: FootPrintParameters) {
    this.params.startDate = foundPreset.startDate;
    this.params.endDate = foundPreset.endDate;
    this.params.period = foundPreset.period;
    this.params.priceStep = foundPreset.priceStep;

    this.DateRange.setDatesRange(this.params.startDate, this.params.endDate);
  }

  SelectPeriod(val: any) {}

  public GetModel(): FootPrintParameters {
    return {
      ticker: this.params.ticker,
      period: this.params.period,
      priceStep: this.params.priceStep,
      startDate: this.DateRange.getStart(),
      endDate: this.DateRange.getEnd(),
      candlesOnly: this.params.candlesOnly,
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
    // Инициализация компонента
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
