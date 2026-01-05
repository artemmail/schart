import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  OnInit,
  ViewChild,
  ViewEncapsulation,
  AfterViewChecked,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';
import { TickerPresetNew } from 'src/app/models/tickerpreset';
import { FootPrintRequestParamsNew } from 'src/app/models/FootPrintPar';
import { ChartSettingsService } from 'src/app/service/chart-settings.service';
import { CommonService } from 'src/app/service/common.service';
import { NavService } from 'src/app/service/nav.service';
import { MatSidenav } from '@angular/material/sidenav';
import { FootPrintComponent } from '../../footprint/components/footprint/footprint.component';
import { FootprintWidgetComponent } from '../../footprint/components/footprint-widget/footprint-widget.component';
import { FootPrintParamsComponent } from '../../Controls/FootPrintParams/footpintparmas.component';
import { NonModalDialogComponent } from '../../FootPrintParts/NonModal/non-modal-dialog.component';
import { DialogService } from 'src/app/service/DialogService.service';
import { MarkupEditorComponent } from '../../footprint/components/markup-editor/markup-editor.component';
import { FootPrintSettingsDialogComponent } from '../../footprint/components/footprint-settings-dialog/footprint-settings-dialog.component';
import { TopOrdersComponentFP } from '../../FootPrintParts/top-orders/top-orders.component';
import { VolumeSearchTableComponent } from '../../FootPrintParts/volume-search-table/volume-search-table.component';
import { MaterialModule } from 'src/app/material.module';

import { Title } from '@angular/platform-browser';

@Component({
  standalone: true,
  selector: 'app-first',
  imports: [
    CommonModule,
    MaterialModule,
    FootprintWidgetComponent,
    FootPrintParamsComponent,
    NonModalDialogComponent,
    MarkupEditorComponent,
    FootPrintSettingsDialogComponent,
    TopOrdersComponentFP,
    VolumeSearchTableComponent,
  ],
  templateUrl: './first.component.html',
  styleUrls: ['./first.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class FirstComponent implements OnInit, AfterViewInit, AfterViewChecked {
  @ViewChild(FootprintWidgetComponent) footPrint: FootprintWidgetComponent;
  @ViewChild(FootPrintParamsComponent)
  footPrintParamsComponent: FootPrintParamsComponent;

  @ViewChild('markupDialog', { static: false })
  markupDialog: NonModalDialogComponent;
  @ViewChild('settingsDialog', { static: false })
  settingsDialog: NonModalDialogComponent;
  @ViewChild('topOrdersDialog', { static: false })
  topOrdersDialog: NonModalDialogComponent;
  @ViewChild('volumeSearchDialog', { static: false })
  volumeSearchDialog: NonModalDialogComponent;

  // Reference to MatSidenav
  @ViewChild(MatSidenav, { static: false }) appDrawer: MatSidenav;

  params: TickerPresetNew;
  isInited = false;
  isCandlestick: boolean = false;
  footprintPostInit = (component: FootPrintComponent) => {
    component.applyDefaultPostInit();
  };

  // Флаги для отображения диалогов
  showMarkupDialog: boolean = false;
  showSettingsDialog: boolean = false;
  showTopOrdersDialog: boolean = false;
  showVolumeSearchDialog: boolean = false;

  constructor(
    private commonService: CommonService,
    public navService: NavService,
    private chartSettingsService: ChartSettingsService,
    public dialog: MatDialog,
    private route: ActivatedRoute,
    private dialogService: DialogService,
    private cdr: ChangeDetectorRef,
    private titleService: Title
  ) {
    titleService.setTitle('Кластерный график');
  }

  private sidenavInitialized = false;

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      // Обработка параметров маршрута, если необходимо
      const requestParams: FootPrintRequestParamsNew = {
        ...params,
        period: params['period'] ? Number(params['period']) : undefined,
        candlesOnly:
          params['candlesOnly'] === true || params['candlesOnly'] === 'true',
        type: params['mode'] ?? params['type'],
        ticker1: params['ticker1'],
        ticker2: params['ticker2'],
      };
      this.commonService
        .getControlsNew(requestParams)
        .subscribe((data: TickerPresetNew) => {
          this.params = {
            ...this.params,
            ...data,
            candlesOnly: requestParams.candlesOnly ?? data.candlesOnly,
            type: requestParams.type ?? data.type,
            ticker1: requestParams.ticker1 ?? data.ticker1,
            ticker2: requestParams.ticker2 ?? data.ticker2,
          };
          this.isCandlestick = this.route.snapshot.url
            .join('/')
            .includes('CandlestickChart');
          this.isInited = true;

          if (this.footPrintParamsComponent) {
            this.footPrintParamsComponent.applyPreset(this.params);
            this.load();
          }
        });
    });
  }

  ngAfterViewChecked(): void {
    if (this.isInited && this.appDrawer && !this.sidenavInitialized) {
      this.navService.setSidenav(this.appDrawer);
      this.sidenavInitialized = true;
    }
  }

  ngAfterViewInit(): void {
    // Передаем MatSidenav в NavService после инициализации представления
    this.navService.setSidenav(this.appDrawer);
  }

  public load() {
    const a: any = this.footPrintParamsComponent.GetModel();
    this.footPrint.serverRequest(a);

    // Сбрасываем флаги диалогов, чтобы они обновились при следующем открытии
    this.resetDialogFlags();
  }

  private resetDialogFlags() {
    this.showMarkupDialog = false;
    this.showSettingsDialog = false;
    this.showTopOrdersDialog = false;
    this.showVolumeSearchDialog = false;
  }

  openNonModalSettings() {
    // Обновляем данные перед открытием диалога
    this.showSettingsDialog = false;
    setTimeout(() => {
      this.showSettingsDialog = true;
      setTimeout(() => {
        if (this.settingsDialog) {
          this.settingsDialog.openDialog();
        }
      });
    });
  }

  openNonModalVolumeSearch() {
    this.showVolumeSearchDialog = false;
    setTimeout(() => {
      this.showVolumeSearchDialog = true;
      setTimeout(() => {
        if (this.volumeSearchDialog) {
          this.volumeSearchDialog.openDialog();
        }
      });
    });
  }

  async openNonModalMarkUp() {
    this.showMarkupDialog = false;
    setTimeout(() => {
      this.showMarkupDialog = true;
      setTimeout(() => {
        if (this.markupDialog) {
          this.markupDialog.openDialog();
        }
      });
    });
  }

  openNonModalTopOrders() {
    this.showTopOrdersDialog = false;
    setTimeout(() => {
      this.showTopOrdersDialog = true;
      setTimeout(() => {
        if (this.topOrdersDialog) {
          this.topOrdersDialog.openDialog();
        }
      });
    });
  }

  onCloseMarkUp() {
    this.footPrint.markupManager.changeMode('Edit');
    this.showMarkupDialog = false; // Скрываем диалог при закрытии
  }

  presetChange(a: number) {
    this.footPrint.setPresetIndex(a);
    this.chartSettingsService.getChartSettings(a).subscribe((x) => {
      if (this.isCandlestick) x.CandlesOnly = true;

      this.footPrint.FPsettings = x;
      this.footPrint.resize();

      this.chartSettingsService.saveChartSettings(a).subscribe();
    });
  }

  toggleSidenav() {
    this.navService.toggleNav();
  }

  async uploadImage() {
    await this.dialogService.saveImage(this.footPrint.canvas);
  }

  getCsv() {
    this.footPrint.getCsv();
  }
}



