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
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';
import { TickerPresetNew } from 'src/app/models/tickerpreset';
import { ChartSettingsService } from 'src/app/service/chart-settings.service';
import { CommonService } from 'src/app/service/common.service';
import { NavService } from 'src/app/service/nav.service';
import { MatSidenav } from '@angular/material/sidenav';
import { MatEventEmitterService } from 'src/app/service/mat-event-emitter.service';
import { DialogService } from 'src/app/service/DialogService.service';

import { Title } from '@angular/platform-browser';
import { FootPrintComponent } from 'src/app/components/footprint/footprint.component';
import { SelectListItemText } from 'src/app/models/preserts';
import { SettingsService } from 'src/app/service/settings.service';
import { SettingsDialogComponent } from '../settings-dialog/settings-dialog.component';
import { Subject, takeUntil } from 'rxjs';


@Component({
  selector: 'app-first1',
  templateUrl: './first.component.html',
  styleUrls: ['./first.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class FirstComponent1 implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild(FootPrintComponent) footPrint: FootPrintComponent;

  


  params: TickerPresetNew;
  isExpanded = true;
  isInited = false;
  navData: any;

  constructor(
    private settingsService: SettingsService,

    private cdr: ChangeDetectorRef,
    private commonService: CommonService,
    public navService: NavService,
    private chartSettingsService: ChartSettingsService,
    public matEventEmitterService: MatEventEmitterService,
    public dialog: MatDialog,
    private route: ActivatedRoute,
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
      this.commonService
        .getControlsNew(params)
        .subscribe((data: TickerPresetNew) => {
         
          this.params = { ...this.params, ...data };
          this.isCandlestick = this.route.snapshot.url.join('/').includes('CandlestickChart');
          const chartType = this.isCandlestick ? "свечной" : "кластерный";    
          this.titleService.setTitle(`${this.params.ticker} ${chartType} график`);
          this.isInited = true;


       //   this.params.period='custom';
          this.isInited = true;
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
      data: { params: { ...this.params }, fp: this.footPrint }
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
      this.footPrint.ServerRequest(this.params);
    }
  }
  
  load() {
    this.footPrint.ServerRequest(this.params);
  }
  
  ngAfterViewInit(): void {}





  presetChange(a: number) {
    this.chartSettingsService.getChartSettings(a).subscribe((x) => {
      
      if (this.isCandlestick)
        x.CandlesOnly = true;

      this.footPrint.FPsettings = x;

      if (true) {
        this.footPrint.resize();
      } else {
        this.footPrint.ReLoad();
      }
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

 
  onCloseMarkUp() {
    this.footPrint.markupManager.changeMode('Edit');
  }

  async uploadImage()
  {    
    await this.dialogService.saveImage(this.footPrint.canvas);    
  }

  GetCSV()
  {
    this.footPrint.GetCSV();
  }
  


}
