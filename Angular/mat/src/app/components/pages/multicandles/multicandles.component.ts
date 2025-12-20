import {
  Component,
  ViewChild,
  ViewContainerRef,
  OnInit,
  Renderer2,
  ComponentRef,
  HostListener,
  Injector,
  ElementRef,
  AfterViewInit,
  OnDestroy
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Title } from '@angular/platform-browser';

import { FootPrintComponent } from '../../footprint/footprint.component';
import { PresetSelectorComponent1 }
        from '../../DateRangeSelector/date-range-selector.component';
import { DateRangePickerComponent }
        from '../../Controls/DateRange/date-range-picker.component';

import { SelectListItemNumber, SmallPeriodPresetShort }
        from 'src/app/models/preserts';
import { FootPrintParameters } from 'src/app/models/Params';
import { CommonService } from 'src/app/service/common.service';

/* ────────────────────────────────────────────────────────────── */
/*      ДЕФОЛТНЫЙ НАБОР ТИКЕРОВ                                   */
/* ────────────────────────────────────────────────────────────── */
const DEFAULT_TICKERS =
  'GAZP,SBER,ROSN,LKOH,VTBR,GMKN,PLZL,T,NVTK,AFKS';

@Component({
  standalone: false,
  selector   : 'app-multicandles',
  templateUrl: './multicandles.component.html',
  styleUrls  : ['./multicandles.component.css']
})
export class MultiPageComponent implements OnInit, AfterViewInit, OnDestroy {

  /* ---------------- шаблонные ссылки ---------------- */
  @ViewChild('container', { read: ViewContainerRef, static: true })
  container!: ViewContainerRef;
  @ViewChild('topPanel',   { static: true }) topPanel!: ElementRef;
  @ViewChild('presetSel')  presetSel!: PresetSelectorComponent1;
  @ViewChild(DateRangePickerComponent)
  dateRangePicker!: DateRangePickerComponent;

  /* ---------------- binding-свойства ------------------ */
  periodList: SelectListItemNumber[] = SmallPeriodPresetShort;
  period = 15;

  startDate: Date = new Date();
  endDate  : Date = new Date();

  tickerInput   = DEFAULT_TICKERS;
  currentTicker = 'GAZP';
  priceStep     = 1;

  /* ---------------- внутреннее ----------------------- */
  components: ComponentRef<FootPrintComponent>[] = [];
  private oldOverflow = '';
  private isMultiPage = false;
  private tickerDescriptions: Record<string,string> = {};
  private initialLoading = true;

  private readonly dividers = [
    [1,1],[1,2],[1,3],[2,2],[3,2],[3,2],[3,3],[3,3],[3,3],
    [4,3],[4,3],[4,3],[4,4],[4,4],[4,4],[4,4]
  ];

  constructor(
    private renderer: Renderer2,
    private injector: Injector,
    private ar: ActivatedRoute,
    private router: Router,
    private api: CommonService,
    title: Title
  ){
    title.setTitle('Просмотр нескольких графиков в одном окне');
  }

  ngOnInit(): void {
    this.isMultiPage = this.router.url.includes('MultiCandles');

    this.ar.queryParams.subscribe(p => {
      // период из параметров
      if (p['period']) this.period = +p['period'];

      // даты из параметров или дефолт
      if (p['start']) {
        this.startDate = this.toDate(p['start'], this.startDate);
      } else {
        const now = new Date();
        this.startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
      }
      if (p['end']) {
        this.endDate = this.toDate(p['end'], this.endDate);
      } else {
        this.endDate = new Date();
      }

      // тикеры
      const ts = p['tickers'] ?? DEFAULT_TICKERS;
      this.verifyTickersAndBuild(ts);
    });
  }

  ngAfterViewInit(): void {
    this.adjustHeight();
    this.oldOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';

    // синхронизируем DateRangePicker
    this.dateRangePicker?.setDatesRange(this.startDate, this.endDate);
  }

  ngOnDestroy(): void {
    document.documentElement.style.overflow = this.oldOverflow;
  }

  @HostListener('window:resize') onResize() {
    this.adjustHeight();
  }

  applyPeriod(ev: any) {
    this.period = ev.value;
    this.broadcastParams();
    this.updateQuery();
  }

  applyDateRange(p?: FootPrintParameters) {
    if (!p) return;

    this.startDate = this.toDate(p.startDate, this.startDate);
    this.endDate   = this.toDate(p.endDate,   this.endDate);
    this.period    = p.period;
    this.priceStep = p.priceStep ?? this.priceStep;

    this.dateRangePicker?.setDatesRange(this.startDate, this.endDate);
    (this.presetSel as any)?.setCurrentPreset?.(p);

    this.broadcastParams();

    // не обновляем URL при начальной загрузке
    if (!this.initialLoading) {
      this.updateQuery();
    }
  }

  onDateChange(ev: { start: Date|string, end: Date|string }) {
    this.startDate = this.toDate(ev.start, this.startDate);
    this.endDate   = this.toDate(ev.end,   this.endDate);

    this.broadcastParams();
    this.updateQuery();
  }

  private verifyTickersAndBuild(str: string) {
    this.api.ModifyTickers(str).subscribe(res => {
      const list = res.map(x => x.Value);
      this.currentTicker = list[0] ?? 'GAZP';
      this.tickerInput   = list.join(',');
      this.tickerDescriptions = res.reduce(
        (a, it) => ({ ...a, [it.Value]: it.Text }),
        {} as Record<string,string>
      );

      this.buildCharts(this.tickerInput);

      queueMicrotask(() => {
        this.presetSel?.loadPeriodPresets();
        this.applyFirstPresetIfAny();
      });
    });
  }

  private buildCharts(str: string) {
    this.components.forEach(c => c.destroy());
    this.container.clear();
    const host = this.container.element.nativeElement as HTMLElement;
    while (host.firstChild) host.removeChild(host.firstChild);
    this.components = [];

    const arr = str.split(',').map(t => t.trim()).filter(Boolean);
    arr.forEach(t => {
      const ref = this.addFootprintComponent(
        this.tickerDescriptions[t] || t,
        true,
        2326,
        {
          ticker     : t,
          period     : this.period,
          priceStep  : this.priceStep,
          candlesOnly: true,
          startDate  : this.startDate,
          endDate    : this.endDate
        }
      );
      this.components.push(ref);
    });

    this.adjustGrid(arr.length);
    this.adjustHeight();
  }

  updateTickers() {
    this.verifyTickersAndBuild(this.tickerInput);
  }

  private adjustHeight() {
    const top  = this.topPanel.nativeElement.getBoundingClientRect();
    const host = this.container.element.nativeElement as HTMLElement;
    this.renderer.setStyle(host, 'height', `${window.innerHeight - top.bottom}px`);
  }

  private adjustGrid(n: number) {
    const host = this.container.element.nativeElement as HTMLElement;
    const [c, r] = this.dividers[Math.min(n, this.dividers.length) - 1];
    host.style.setProperty('--columns', c.toString());
    host.style.setProperty('--rows',    r.toString());
  }

  private addFootprintComponent(
    caption: string, minimode: boolean, preset: number, params: any
  ) {
    const wrap = this.renderer.createElement('div');
    this.renderer.addClass(wrap, 'footprint-item');
    this.renderer.appendChild(this.container.element.nativeElement, wrap);

    const ref = this.container.createComponent(FootPrintComponent, { injector: this.injector });
    this.renderer.appendChild(wrap, ref.location.nativeElement);

    ref.instance.caption     = caption;
    ref.instance.minimode    = minimode;
    ref.instance.deltamode   = !this.isMultiPage;
    ref.instance.presetIndex = preset;
    ref.instance.params      = params;

    return ref;
  }

  private applyFirstPresetIfAny() {
    let tries = 0;
    const loop = () => {
      const first = (this.presetSel as any)?.presets?.[0] as FootPrintParameters|undefined;
      if (first?.startDate) {
        this.initialLoading = true;
        this.applyDateRange(first);
        this.initialLoading = false;
      } else if (tries++ < 20) {
        setTimeout(loop, 100);
      }
    };
    loop();
  }

  private updateQuery() {
    const qp: any = {
      tickers: this.tickerInput,
      period: this.period
    };
    if (this.startDate) qp.start = this.startDate.toISOString();
    if (this.endDate)   qp.end   = this.endDate.toISOString();

    this.router.navigate([], {
      relativeTo           : this.ar,
      replaceUrl           : true,
      queryParams          : qp,
      queryParamsHandling  : 'merge'
    });
  }

  private toDate(v: any, fallback: Date): Date {
    if (v instanceof Date) return v;
    const d = new Date(v);
    return isNaN(+d) ? fallback : d;
  }

  private broadcastParams() {
    this.components.forEach(c => {
      c.instance.params = {
        ...c.instance.params,
        startDate : this.startDate,
        endDate   : this.endDate,
        period    : this.period,
        priceStep : this.priceStep
      };
      c.instance.ServerRequest(c.instance.params);
    });
  }
}
