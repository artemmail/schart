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
import { ActivatedRoute, Router } from '@angular/router';
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
import { FootprintOrderBookComponent } from '../../FootPrintParts/order-book/order-book.component';
import { FootprintVirtualPortfolioComponent } from '../../FootPrintParts/virtual-portfolio/virtual-portfolio.component';
import { MaterialModule } from 'src/app/material.module';
import { PortfolioService } from 'src/app/service/portfolio.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  PortfolioCompareDialogComponent,
  PortfolioCompareDialogResult,
} from '../../FootPrintParts/portfolio-compare/portfolio-compare-dialog.component';
import {
  PortfolioManipulationDialogComponent,
  PortfolioManipulationDialogResult,
} from '../../FootPrintParts/portfolio-manipulation-dialog/portfolio-manipulation-dialog.component';

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
    FootprintOrderBookComponent,
    FootprintVirtualPortfolioComponent,
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
  @ViewChild('orderBookDialog', { static: false })
  orderBookDialog: NonModalDialogComponent;
  @ViewChild('virtualPortfolioDialog', { static: false })
  virtualPortfolioDialog: NonModalDialogComponent;
  @ViewChild(FootprintVirtualPortfolioComponent)
  virtualPortfolioComponent?: FootprintVirtualPortfolioComponent;

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
  showOrderBookDialog: boolean = false;
  showVirtualPortfolioDialog: boolean = false;

  constructor(
    private commonService: CommonService,
    public navService: NavService,
    private chartSettingsService: ChartSettingsService,
    public dialog: MatDialog,
    private route: ActivatedRoute,
    private router: Router,
    private dialogService: DialogService,
    private cdr: ChangeDetectorRef,
    private titleService: Title,
    private portfolioService: PortfolioService,
    private snackBar: MatSnackBar
  ) {
    titleService.setTitle('Кластерный график');
  }

  private sidenavInitialized = false;

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      // Обработка параметров маршрута, если необходимо
      const isPairTradingRoute = this.router.url.includes(
        '/CandlestickChart/PairTrading'
      );
      const modeParam = params['mode'] ?? params['type'];
      const normalizedMode =
        modeParam ?? (isPairTradingRoute ? 'arbitrage' : undefined);
      const modeValue =
        typeof normalizedMode === 'string'
          ? normalizedMode.toLowerCase()
          : undefined;
      const candlesOnlyFromMode =
        modeValue === 'candles'
          ? true
          : modeValue === 'clusters'
          ? false
          : undefined;
      const typeFromMode =
        modeValue === 'arbitrage' ? 'arbitrage' : undefined;
      const requestParams: FootPrintRequestParamsNew = {
        ...params,
        period: params['period'] ? Number(params['period']) : undefined,
        candlesOnly:
          (candlesOnlyFromMode ??
            (params['candlesOnly'] === true ||
              params['candlesOnly'] === 'true')),
        type: typeFromMode ?? normalizedMode,
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
    this.requestFootprint();

    // Сбрасываем флаги диалогов, чтобы они обновились при следующем открытии
    this.resetDialogFlags();
  }

  private requestFootprint(): void {
    const model: any = this.footPrintParamsComponent.GetModel();
    this.footPrint.serverRequest(model);
  }

  onVirtualPortfolioTickerSelected(ticker: string): void {
    if (!ticker) {
      return;
    }

    this.footPrintParamsComponent?.onTickerSelected(ticker);
    this.requestFootprint();
  }

  openModalPortfolioCompare(): void {
    this.dialog
      .open<PortfolioCompareDialogComponent, unknown, PortfolioCompareDialogResult>(
        PortfolioCompareDialogComponent,
        { width: '620px', autoFocus: false }
      )
      .afterClosed()
      .subscribe((result) => {
        if (!result) {
          return;
        }

        if (result.portfolio1 === result.portfolio2) {
          this.snackBar.open('Нужно выбрать 2 разных портфеля', 'OK', {
            duration: 2500,
          });
          return;
        }

        this.portfolioService
          .portfolioCompares(result.portfolio1, result.portfolio2)
          .subscribe((data) => {
            const ticker1 = data?.res1 ?? '';
            const ticker2 = data?.res2 ?? '';
            if (!ticker1 || !ticker2) {
              this.snackBar.open('Один из портфелей пуст', 'OK', {
                duration: 2500,
              });
              return;
            }

            this.footPrintParamsComponent?.onLoadModeChange('arbitrage');
            this.params.type = 'arbitrage';
            this.params.candlesOnly = false;
            this.params.ticker1 = ticker1;
            this.params.ticker2 = ticker2;

            this.requestFootprint();
          });
      });
  }

  private resetDialogFlags() {
    this.showMarkupDialog = false;
    this.showSettingsDialog = false;
    this.showTopOrdersDialog = false;
    this.showVolumeSearchDialog = false;
    this.showOrderBookDialog = false;
    this.showVirtualPortfolioDialog = false;
  }

  openNonModalSettings() {
    // Обновляем данные перед открытием диалога
    const wasOpen = this.showSettingsDialog;
    this.showSettingsDialog = false;
    setTimeout(() => {
      this.showSettingsDialog = true;
      setTimeout(() => {
        if (this.settingsDialog) {
          this.settingsDialog.openDialog(undefined, undefined, wasOpen);
        }
      });
    });
  }

  openNonModalVolumeSearch() {
    const wasOpen = this.showVolumeSearchDialog;
    this.showVolumeSearchDialog = false;
    setTimeout(() => {
      this.showVolumeSearchDialog = true;
      setTimeout(() => {
        if (this.volumeSearchDialog) {
          this.volumeSearchDialog.openDialog(undefined, undefined, wasOpen);
        }
      });
    });
  }

  async openNonModalMarkUp() {
    const wasOpen = this.showMarkupDialog;
    this.showMarkupDialog = false;
    setTimeout(() => {
      this.showMarkupDialog = true;
      setTimeout(() => {
        if (this.markupDialog) {
          this.markupDialog.openDialog(undefined, undefined, wasOpen);
        }
      });
    });
  }

  openNonModalTopOrders() {
    const wasOpen = this.showTopOrdersDialog;
    this.showTopOrdersDialog = false;
    setTimeout(() => {
      this.showTopOrdersDialog = true;
      setTimeout(() => {
        if (this.topOrdersDialog) {
          this.topOrdersDialog.openDialog(undefined, undefined, wasOpen);
        }
      });
    });
  }

  openNonModalOrderBook() {
    const wasOpen = this.showOrderBookDialog;
    this.showOrderBookDialog = false;
    setTimeout(() => {
      this.showOrderBookDialog = true;
      setTimeout(() => {
        if (this.orderBookDialog) {
          this.orderBookDialog.openDialog(undefined, undefined, wasOpen);
        }
      });
    });
  }

  openNonModalVirtualPortfolio() {
    const wasOpen = this.showVirtualPortfolioDialog;
    this.showVirtualPortfolioDialog = false;
    setTimeout(() => {
      this.showVirtualPortfolioDialog = true;
      setTimeout(() => {
        if (this.virtualPortfolioDialog) {
          this.virtualPortfolioDialog.openDialog(undefined, undefined, wasOpen);
        }
      });
    });
  }

  private openVirtualPortfolioTrade(action: 'buy' | 'sell'): void {
    const openTradeDialog = () => {
      if (this.virtualPortfolioComponent) {
        this.virtualPortfolioComponent.openTradeDialog(action);
      }
    };

    if (this.showVirtualPortfolioDialog) {
      setTimeout(openTradeDialog);
      return;
    }

    const wasOpen = this.showVirtualPortfolioDialog;
    this.showVirtualPortfolioDialog = false;
    setTimeout(() => {
      this.showVirtualPortfolioDialog = true;
      setTimeout(() => {
        if (this.virtualPortfolioDialog) {
          this.virtualPortfolioDialog.openDialog(undefined, undefined, wasOpen);
        }
        openTradeDialog();
      });
    });
  }

  openVirtualPortfolioBuy(): void {
    this.openVirtualPortfolioTrade('buy');
  }

  openVirtualPortfolioSell(): void {
    this.openVirtualPortfolioTrade('sell');
  }

  openPortfolioManipulationDialog(): void {
    this.dialog
      .open<
        PortfolioManipulationDialogComponent,
        unknown,
        PortfolioManipulationDialogResult
      >(PortfolioManipulationDialogComponent, {
        width: '420px',
        autoFocus: false,
      })
      .afterClosed()
      .subscribe((result) => {
        if (!result) {
          return;
        }

        this.virtualPortfolioComponent?.reloadPortfolio();
      });
  }

  onCloseMarkUp() {
    this.footPrint.markupManager.changeMode('Edit');
    this.showMarkupDialog = false; // Скрываем диалог при закрытии
  }

  onCloseOrderBook() {
    this.showOrderBookDialog = false;
  }

  onCloseVirtualPortfolio() {
    this.showVirtualPortfolioDialog = false;
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

  openCurrentChartUrl(): void {
    const model =
      this.footPrintParamsComponent?.GetModel?.() ??
      (this.params as any | undefined);

    if (!model) {
      return;
    }

    const toIsoString = (value: unknown): string | undefined => {
      if (!value) {
        return undefined;
      }
      if (value instanceof Date) {
        return value.toISOString();
      }
      return new Date(value as any).toISOString();
    };

    const mode =
      model.type ?? (model.candlesOnly ? 'candles' : 'clusters');

    const queryParams: Record<string, unknown> = {
      period: model.period,
      priceStep: model.priceStep,
      rperiod: model.rperiod,
      startDate: toIsoString(model.startDate),
      endDate: toIsoString(model.endDate),
      mode,
    };

    if (mode === 'arbitrage') {
      queryParams.ticker1 = model.ticker1;
      queryParams.ticker2 = model.ticker2;
    } else {
      queryParams.ticker = model.ticker;
    }

    const urlTree = this.router.createUrlTree(['/FootPrint'], {
      queryParams,
    });
    const url = this.router.serializeUrl(urlTree);
    window.open(url, '_blank');
  }
}



