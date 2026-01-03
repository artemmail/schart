import { Component, EventEmitter, forwardRef, Input, Output, OnInit } from '@angular/core';
import { ControlValueAccessor, FormControl, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Observable } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { SelectListItemText } from 'src/app/models/preserts';

import { TickerService } from 'src/app/service/FootPrint/AutoComplete/AutoComplete';
import { MaterialModule } from 'src/app/material.module';

@Component({
  standalone: true,
  selector: 'app-ticker-autocomplete',
  imports: [MaterialModule],
  templateUrl: './ticker-autocomplete.component.html',
  styleUrls: ['./ticker-autocomplete.component.css'],
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => TickerAutocompleteComponent),
    multi: true
  }]
})
export class TickerAutocompleteComponent implements OnInit, ControlValueAccessor {
  @Input() ngModel: string;
  @Output() ngModelChange = new EventEmitter<string>();
  @Output() tickerChange = new EventEmitter<string>();

  myControl = new FormControl('');
  filteredOptions$: Observable<SelectListItemText[]>;

  private onChange: (value: any) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(private tickerService: TickerService) { }

  ngOnInit(): void {
    this.initializeControl();
    this.setupFilteredOptions();
  }

  private initializeControl(): void {
    if (this.ngModel) {
      this.myControl.setValue(this.ngModel);
    }

    this.myControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(value => {
      if (typeof value === 'string') {
        // Ввод с клавиатуры, обновляем модель, но не вызываем tickerChange
        this.updateModel(value);
      }
    });
  }

  private setupFilteredOptions(): void {
    this.filteredOptions$ = this.myControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(value => this.tickerService.findByMask(this.getSearchValue(value)))
    );
  }

  private getSearchValue(value: string | SelectListItemText): string {
    if (typeof value === 'string') {
      return value;
    } else if (value && typeof value === 'object') {
      return value.Value;
    } else {
      return '';
    }
  }

  onOptionSelected(event: { option: { value: SelectListItemText } }): void {
    const selectedOption = event.option.value;
    this.myControl.setValue(selectedOption.Value);
    this.updateModel(selectedOption.Value);
    this.tickerChange.emit(selectedOption.Value);
  }

  private updateModel(value: string): void {
    this.ngModel = value;
    this.onChange(value);
    this.ngModelChange.emit(value);
  }

  displayFn(value: string | SelectListItemText): string {
    if (typeof value === 'string') {
      return value;
    } else if (value && typeof value === 'object') {
      return value.Value;
    } else {
      return '';
    }
  }

  // Реализация ControlValueAccessor
  writeValue(value: any): void {
    this.myControl.setValue(value);
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    isDisabled ? this.myControl.disable() : this.myControl.enable();
  }
}
