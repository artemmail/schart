// settings-dialog.component.ts
import { Component, Inject, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FootPrintParamsComponent } from 'src/app/components/Controls/FootPrintParams/footprint-params.component';
import type { FootprintController } from 'src/app/components/footprint/models/footprint-controller';
import { TickerPresetNew } from 'src/app/models/tickerpreset';
import { MaterialModule } from 'src/app/material.module';

@Component({
  standalone: true,
  selector: 'app-settings-dialog',
  imports: [MaterialModule, FootPrintParamsComponent],
  templateUrl: './settings-dialog.component.html'
})
export class SettingsDialogComponent {
  @ViewChild(FootPrintParamsComponent)
  footPrintParamsComponent: FootPrintParamsComponent;

  params: TickerPresetNew;
  presetItems: any[] = [];
  presetIndex: number;

  constructor(
    public dialogRef: MatDialogRef<SettingsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { params: TickerPresetNew, fp: FootprintController }
  ) {
    // Create a copy of the params to avoid modifying the original before applying
    this.params = { ...data.params };
    this.footPrint = data.fp;
    this.loadPresetItems();

    //this.footPrintParamsComponent.applyPreset
  }

  footPrint: FootprintController;

  loadPresetItems(): void {
    this.presetItems = this.footPrint.presetItems;
    this.presetIndex = this.footPrint.presetIndex ?? this.presetItems[0]?.Value;
  }

  async presetChange(index: number): Promise<void> {
    await this.footPrint.selectPreset(index);
  }

  applySettings() {
    const updatedParams = this.footPrintParamsComponent.GetModel();
   // updatedParams.presetIndex = this.presetIndex;
    this.dialogRef.close(updatedParams);
  }

  closeDialog() {
    this.dialogRef.close();
  }
}

