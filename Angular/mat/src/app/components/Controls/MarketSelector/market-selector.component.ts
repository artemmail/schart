import { Component, EventEmitter, forwardRef, OnInit, Output } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { SelectListItemNumber } from 'src/app/models/preserts';
import { CommonService } from 'src/app/service/common.service';


@Component({
  selector: 'app-market-selector',
  templateUrl: './market-selector.component.html',
  styleUrls: ['./market-selector.component.css'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MarketSelectorComponent),
      multi: true,
    },
  ],
})
export class MarketSelectorComponent implements ControlValueAccessor, OnInit {
  markets: SelectListItemNumber[] = [];
  selectedMarketValue: number | null = null;

  @Output() selectionChange = new EventEmitter<string | null>();

  constructor(private dataService: CommonService) {}

  ngOnInit(): void {
    this.dataService.Markets().subscribe((data) => {
      this.markets = data;

      if (this.selectedMarketValue === null && this.markets.length > 0) {
        // Инициализируйте selectedMarketValue первым значением из списка или другим логическим значением
        this.selectedMarketValue = this.markets[0].Value;
      }

   //   this.onChange(this.selectedMarketValue); // Notify Angular that the value has changed
    //  this.selectionChange.emit(this.selectedMarketValue);
    });
  }

  onChange: any = () => {};
  onTouched: any = () => {};

  writeValue(value: any): void {
    if (value !== undefined) {
      this.selectedMarketValue = value;
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    // Implement if you need to handle disabling of the component
  }

  onSelectionChange(event: any) {    
    this.selectedMarketValue = event.value;
    this.onChange(event.value);
    this.selectionChange.emit(event.value);
  }
}
