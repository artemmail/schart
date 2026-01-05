import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  SimpleChanges,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { FootPrintRequestParamsNew } from 'src/app/models/FootPrintPar';
import { TickerPresetNew } from 'src/app/models/tickerpreset';
import { ChartSettingsService } from 'src/app/service/chart-settings.service';
import { CommonService } from 'src/app/service/common.service';
import { NavService } from 'src/app/service/nav.service';
import { MatSidenav } from '@angular/material/sidenav';
import { MatEventEmitterService } from 'src/app/service/mat-event-emitter.service';
import { DialogService } from 'src/app/service/DialogService.service';

import { Title } from '@angular/platform-browser';
import { FootPrintComponent } from 'src/app/components/footprint/components/footprint/footprint.component';
import { FootprintWidgetComponent } from 'src/app/components/footprint/components/footprint-widget/footprint-widget.component';
import { SelectListItemText } from 'src/app/models/preserts';
import { SettingsService } from 'src/app/service/settings.service';
import { SettingsDialogComponent } from '../settings-dialog/settings-dialog.component';
import { Subject, takeUntil } from 'rxjs';
import { MaterialModule } from 'src/app/material.module';


@Component({
  standalone: true,
  selector: 'app-first1',
  imports: [CommonModule, MaterialModule, FootprintWidgetComponent],
  templateUrl: './first.component.html',
  styleUrls: ['./first.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class FirstComponent1 implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild(FootprintWidgetComponent) footPrint: FootprintWidgetComponent;




  params: TickerPresetNew;
  isExpanded = true;
  isInited = false;
  navData: any;
  footprintPostInit = (component: FootPrintComponent) => {
    component.applyDefaultPostInit();
  };

  private viewInitialized = false;

  constructor(
    private settingsService: SettingsService,

    private cdr: ChangeDetectorRef,
    private commonService: CommonService,
    public navService: NavService,
    private chartSettingsService: ChartSettingsService,
    public matEventEmitterService: MatEventEmitterService,
    public dialog: MatDialog,
    private route: ActivatedRoute,
    private router: Router,
    private dialogService: DialogService,
    private titleService: Title
  ) {
     titleService.setTitle("Кластерный график");

  }


  items: SelectListItemText[] = [];

  selectedValue: string;
  isCandlestick: boolean =  false;

  ngOnInit(): void {



    this.route.queryParams.subscribe((params) => {
      const isPairTradingRoute = this.router.url.includes(
        '/CandlestickChart/PairTrading'
      );
      const modeParam = params['mode'] ?? params['type'];
      const normalizedMode =
        modeParam ?? (isPairTradingRoute ? 'arbitrage' : undefined);
      const requestParams: FootPrintRequestParamsNew = {
        ...params,
        period: params['period'] ? Number(params['period']) : undefined,
        candlesOnly:
          params['candlesOnly'] === true || params['candlesOnly'] === 'true',
        type: normalizedMode,
        ticker1: params['ticker1'],
        ticker2: params['ticker2'],
      };

      this.commonService
        .getControlsNew(requestParams)
        .subscribe((data: TickerPresetNew) => {
          this.isCandlestick =
            this.route.snapshot.url
              .join('/')
              .includes('CandlestickChart') || requestParams.candlesOnly === true;

          this.params = {
            ...this.params,
            ...data,
            candlesOnly: requestParams.candlesOnly ?? data.candlesOnly,
            type: requestParams.type ?? data.type,
            ticker1: requestParams.ticker1 ?? data.ticker1,
            ticker2: requestParams.ticker2 ?? data.ticker2,
          };

          const chartType = this.isCandlestick ? "свечной" : "кластерный";
          this.titleService.setTitle(`${this.params.ticker} ${chartType} график`);
          this.isInited = true;


          this.tryLoadFootprint();

          try {
            this.cdr.detectChanges();
          } catch (s) {
        //    this.navService.appDrawer = this.appDrawer;
          }
      //    this.navService.appDrawer = this.appDrawer;
        //  this.matEventEmitterService.matDrawerAfterViewInit(this.navData);
        });
    });

    this.matEventEmitterService.dataChange(this.navData);
    this.matEventEmitterService.onDataChange.subscribe((res) => {
      this.navData = res;
    });
    this.matEventEmitterService.matDrawerInit(this.navData);

    this.matEventEmitterService.onSideNavOpen.subscribe(() => {
      this.toggleSidenav();
    });
    this.matEventEmitterService.onSideNavClosed.subscribe(() => {
      this.toggleSidenav();
    });

    this.settingsService.settingsClick$
    .pipe(takeUntil(this.unsubscribe$))
    .subscribe(() => {
      this.openSettings();
    });
  }

  ngOnDestroy(): void {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }

  private unsubscribe$ = new Subject<void>();

  private settingsDialogRef: MatDialogRef<SettingsDialogComponent>;

  openSettings() {
    if (this.settingsDialogRef) {
      // If dialog is already open, don't open another
      return;
    }

    this.settingsDialogRef = this.dialog.open(SettingsDialogComponent, {
      width: 'auto',
      height: 'auto',
      panelClass: 'custom-dialog-container',
      data: { params: { ...this.params }, fp: this.footPrint.renderer }
    });
   

    this.settingsDialogRef.afterClosed().subscribe((result: TickerPresetNew) => {
      this.settingsDialogRef = null;
      if (result) {
        console.log('Received Updated Params:', result);
        this.params = result;
        this.load();
      }
    });

  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.params && !changes.params.firstChange) {
      this.footPrint.serverRequest(this.params);
    }
  }

  load() {
    if (!this.footPrint || !this.params) {
      return;
    }

    this.footPrint.serverRequest(this.params);
  }

  ngAfterViewInit(): void {
    this.viewInitialized = true;
    this.tryLoadFootprint();
  }





  presetChange(a: number) {
    this.chartSettingsService.getChartSettings(a).subscribe((x) => {

      if (this.isCandlestick)
        x.CandlesOnly = true;

      this.footPrint.FPsettings = x;

      if (true) {
        this.footPrint.resize();
      } else {
        this.footPrint.reload();
      }

      this.chartSettingsService.saveChartSettings(a).subscribe();
    });
  }

  p(a: any) {
    alert(JSON.stringify(a));
    this.chartSettingsService.getChartSettings(a).subscribe((x) => {

      if (this.isCandlestick)
        x.CandlesOnly = true;

      this.footPrint.FPsettings = x;
      this.footPrint.resize();
    });
  }

  toggleSidenav() {
    this.isExpanded = !this.isExpanded;
    this.cdr.detectChanges();
    window.dispatchEvent(new Event('resize'));
    setTimeout(() => {
      this.footPrint.resize();
    }, 350);
  }


  private tryLoadFootprint() {
    if (!this.viewInitialized || !this.isInited) {
      return;
    }

    this.load();
  }

 
  onCloseMarkUp() {
    this.footPrint.markupManager.changeMode('Edit');
  }

  async uploadImage()
  {    
    await this.dialogService.saveImage(this.footPrint.canvas);    
  }

  getCsv()
  {
    this.footPrint.getCsv();
  }



}

