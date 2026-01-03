// settings-dialog.component.ts
import { Component, Inject, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FootPrintParamsComponent } from 'src/app/components/Controls/FootPrintParams/footpintparmas.component';
import { FootPrintComponent } from 'src/app/components/footprint/components/footprint/footprint.component';
import { TickerPresetNew } from 'src/app/models/tickerpreset';
import { ChartSettingsService } from 'src/app/service/chart-settings.service';
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
    @Inject(MAT_DIALOG_DATA) public data: { params: TickerPresetNew, fp: FootPrintComponent },
    private chartSettingsService: ChartSettingsService
  ) {
    // Create a copy of the params to avoid modifying the original before applying
    this.params = { ...data.params };
    this.footPrint = data.fp;
    this.loadPresetItems();

    //this.footPrintParamsComponent.applyPreset
  }

  footPrint: FootPrintComponent;

  loadPresetItems() {
    // Fetch preset items from the service
    this.chartSettingsService.getPresets().subscribe((items) => {
      this.presetItems = items;
      // Set initial presetIndex based on params or default
      this.presetIndex = /* this.params.presetIndex ||*/ items[0]?.Value;
    });
  }

  presetChange(a: number) {
    this.chartSettingsService.getChartSettings(a).subscribe((x) => {
      this.footPrint.FPsettings = x;
      this.footPrint.resize();

      this.chartSettingsService.saveChartSettings(a).subscribe();
    });
  }

  applySettings() {
    const updatedParams = this.footPrintParamsComponent.GetModel();
   // updatedParams.presetIndex = this.presetIndex;
    console.log('Applying Settings:', updatedParams);
    this.dialogRef.close(updatedParams);
  }

  closeDialog() {
    this.dialogRef.close();
  }
}

