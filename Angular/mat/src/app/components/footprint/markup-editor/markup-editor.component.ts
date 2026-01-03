import { Component, Input, HostListener } from '@angular/core';
import { ProfileModel } from 'src/app/models/profileModel';
import { MarkUpManager } from '../Markup/Manager';
import { FootPrintComponent } from '../footprint.component';
import { MarkupMode } from '../Markup/ShapeType';
import { MaterialModule } from 'src/app/material.module';
import { ComboBoxComponent } from '../../Controls/ComboBox/combobox.component';
import { PalettePickerComponent } from 'src/lib/palette-picker.component';
import {
  fontsPreset,
  profilePeriodsPreset,
  widthsPreset,
} from 'src/app/models/preserts';

@Component({
  standalone: true,
  selector: 'app-markup-editor',
  imports: [MaterialModule, ComboBoxComponent, PalettePickerComponent],
  templateUrl: './markup-editor.component.html',
  styleUrls: ['./markup-editor.component.css'],
})
export class MarkupEditorComponent {
  @Input() NP: FootPrintComponent;
  markup: ProfileModel;
  widths = widthsPreset;
  fonts = fontsPreset;
  profilePeriods = profilePeriodsPreset;

  constructor() {}

  ngOnChanges() {
    if (this.NP) {
      this.markup = this.NP.viewModel;
    }
  }

  onClick(event: MarkupMode) {
    this.NP.markupManager.changeMode(event);
  }

  onDelete(event: any) {
    this.NP.markupManager.deleteCurrent();
  }

  markupchangecolor(event: any) {
    this.NP.markupManager.updateShapeFromModel();
  }

  onChange(event: any) {
    console.log('Profile period changed:', event);
  }

  @HostListener('document:keydown.delete', ['$event'])
  handleDeleteKey(event: KeyboardEvent) {
    if (this.markup.visible.toolbar) {
      this.onDelete(event);
    }
  }
}
