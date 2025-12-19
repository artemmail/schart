import { Component, Input, Output, EventEmitter } from '@angular/core';
import { SelectListItemNumber, SelectListItemText } from 'src/app/models/preserts';



@Component({
  selector: 'app-combobox',
  template: `
    <mat-form-field style="width: 100%;">
      <mat-label>{{label}}</mat-label>
      <mat-select [(value)]="internalValue" (selectionChange)="onSelectionChange($event)">
        <mat-option *ngFor="let item of items" [value]="item.Value">
          {{ item.Text }}
        </mat-option>
      </mat-select>
    </mat-form-field>
  `,
  styleUrl: "./combobox.component.css"
})
export class ComboBoxComponent {
  @Input() label: string;
  @Input() items: SelectListItemText[] | SelectListItemNumber[];

  private _value: string | number;
  @Input()
  get value(): string | number {
    return this._value;
  }
  set value(val: string | number) {
    this._value = val;
    this.internalValue = val;
    this.valueChange.emit(this._value);
  }

  @Output() valueChange = new EventEmitter<string | number>();
  @Output() selectionChange = new EventEmitter<any>();

  internalValue: string | number;

  onSelectionChange(event: any) {
    this.value = event.value;
    this.selectionChange.emit(event);
  }
}
