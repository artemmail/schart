// projects/color-picker/src/lib/color-picker.module.ts
import { NgModule } from '@angular/core';
import { ColorPickerComponent } from './color-picker.component';
import { CommonModule } from '@angular/common';

@NgModule({
  declarations: [ColorPickerComponent],
  imports: [CommonModule],
  exports: [ColorPickerComponent]
})
export class ColorPickerModule { }
