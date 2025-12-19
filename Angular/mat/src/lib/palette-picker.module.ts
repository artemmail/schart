import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PalettePickerComponent } from './palette-picker.component';

@NgModule({
  declarations: [PalettePickerComponent],
  imports: [CommonModule],
  exports: [PalettePickerComponent],
})
export class PalettePickerModule {}
