import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PalettePickerComponent } from './palette-picker.component';

@NgModule({
  imports: [CommonModule, PalettePickerComponent],
  exports: [PalettePickerComponent],
})
export class PalettePickerModule {}
