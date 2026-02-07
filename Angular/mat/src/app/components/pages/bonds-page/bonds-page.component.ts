import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, ParamMap, Router, RouterModule } from '@angular/router';
import { PageEvent } from '@angular/material/paginator';
import { Subject, finalize, takeUntil } from 'rxjs';
import { EChartsOption } from 'echarts';
import {
  BondListItem,
  BondListQuery,
  BondMapMode,
  BondMapPoint,
  BondSortDir,
  BondTab,
  BondsService,
  BondFacetItem,
} from 'src/app/service/bonds.service';
import { MaterialModule } from 'src/app/material.module';

interface BondsState {
  tab: BondTab;
  yieldMin: number | null;
  yieldMax: number | null;
  durationMin: number | null;
  durationMax: number | null;
  yearsToMaturityMin: number | null;
  yearsToMaturityMax: number | null;
  qualifiedOnly: boolean;
  moexType: string[];
  couponFreq: number[];
  orderBy: string;
  dir: BondSortDir;
  page: number;
  pageSize: number;
  mapMode: BondMapMode;
}

@Component({
  standalone: true,
  selector: 'app-bonds-page',
  imports: [CommonModule, FormsModule, RouterModule, MaterialModule],
  templateUrl: './bonds-page.component.html',
  styleUrls: ['./bonds-page.component.scss'],
})
export class BondsPageComponent implements OnInit, OnDestroy {
  readonly tabs: { key: BondTab; label: string }[] = [
    { key: 'ofz', label: 'ОФЗ' },
    { key: 'corp', label: 'Корпоративные' },
    { key: 'cur', label: 'Валютные' },
    { key: 'subfed', label: 'Субфедеральные' },
    { key: 'other', label: 'Другие' },
  ];

  readonly mapModes: { key: BondMapMode; label: string }[] = [
    { key: 'yield_by_duration', label: 'Доходность по сроку дюрации' },
    { key: 'coupon_yield_by_duration', label: 'Купонная доходность по сроку дюрации' },
    { key: 'ytm', label: 'Доходность к погашению' },
    { key: 'coupon_yield_to_maturity', label: 'Купонная доходность к погашению' },
  ];

  readonly couponFreqOptions = [
    { value: 12, label: '1/мес' },
    { value: 4, label: '1/квартал' },
    { value: 2, label: '1/полгода' },
    { value: 1, label: '1/год' },
  ];

  state: BondsState = this.defaultState();
  rows: BondListItem[] = [];
  total = 0;
  mapPoints: BondMapPoint[] = [];
  moexTypeFacets: BondFacetItem[] = [];
  couponFreqFacets: BondFacetItem[] = [];
  loading = false;
  error = '';
  selectedDictionaryId: number | null = null;
  mapOptions: EChartsOption = {};

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly bondsService: BondsService,
    private readonly route: ActivatedRoute,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap
      .pipe(takeUntil(this.destroy$))
      .subscribe((query) => {
        this.state = this.readState(query);
        this.load();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get selectedTabIndex(): number {
    const index = this.tabs.findIndex((x) => x.key === this.state.tab);
    return index >= 0 ? index : 0;
  }

  onTabChanged(index: number): void {
    const nextTab = this.tabs[index]?.key ?? 'corp';
    const nextState: BondsState = { ...this.state, tab: nextTab, page: 1 };
    this.navigateWithState(nextState);
  }

  applyFilters(): void {
    const nextState: BondsState = { ...this.state, page: 1 };
    this.navigateWithState(nextState);
  }

  resetFilters(): void {
    const next = this.defaultState(this.state.tab);
    this.navigateWithState(next);
  }

  onSort(column: string): void {
    let dir: BondSortDir = 'desc';
    if (this.state.orderBy === column) {
      dir = this.state.dir === 'asc' ? 'desc' : 'asc';
    }
    const next: BondsState = { ...this.state, orderBy: column, dir, page: 1 };
    this.navigateWithState(next);
  }

  onPage(event: PageEvent): void {
    const next: BondsState = {
      ...this.state,
      page: event.pageIndex + 1,
      pageSize: event.pageSize,
    };
    this.navigateWithState(next);
  }

  onMapModeChanged(): void {
    const next: BondsState = { ...this.state, page: 1 };
    this.navigateWithState(next);
  }

  onMapPointClick(event: any): void {
    const value = event?.value;
    if (!Array.isArray(value)) {
      return;
    }
    const dictionaryId = Number(value[2]);
    if (!Number.isFinite(dictionaryId) || dictionaryId <= 0) {
      return;
    }
    this.selectedDictionaryId = dictionaryId;
  }

  openDetails(row: BondListItem): void {
    if (!row?.secId) {
      return;
    }
    this.router.navigate(['/bonds', row.secId]);
  }

  trackRow(_index: number, row: BondListItem): number {
    return row.dictionaryId;
  }

  get rowStartIndex(): number {
    return (this.state.page - 1) * this.state.pageSize;
  }

  isSelected(row: BondListItem): boolean {
    return this.selectedDictionaryId != null && row.dictionaryId === this.selectedDictionaryId;
  }

  sortIcon(column: string): string {
    if (this.state.orderBy !== column) {
      return 'swap_vert';
    }
    return this.state.dir === 'asc' ? 'arrow_upward' : 'arrow_downward';
  }

  private load(): void {
    this.loading = true;
    this.error = '';

    const query: BondListQuery = {
      tab: this.state.tab,
      yieldMin: this.state.yieldMin,
      yieldMax: this.state.yieldMax,
      durationMin: this.state.durationMin,
      durationMax: this.state.durationMax,
      yearsToMaturityMin: this.state.yearsToMaturityMin,
      yearsToMaturityMax: this.state.yearsToMaturityMax,
      qualifiedOnly: this.state.qualifiedOnly ? true : null,
      moexType: this.state.moexType,
      couponFreq: this.state.couponFreq,
      orderBy: this.state.orderBy,
      dir: this.state.dir,
      page: this.state.page,
      pageSize: this.state.pageSize,
      mapMode: this.state.mapMode,
    };

    this.bondsService
      .getList(query)
      .pipe(
        finalize(() => {
          this.loading = false;
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (response) => {
          this.total = response.total;
          this.rows = response.items ?? [];
          this.mapPoints = response.mapPoints ?? [];
          this.moexTypeFacets = response.facets?.moexTypes ?? [];
          this.couponFreqFacets = response.facets?.couponFrequencies ?? [];
          this.mapOptions = this.buildMapOptions(this.mapPoints);
          if (this.selectedDictionaryId != null) {
            const exists = this.rows.some((x) => x.dictionaryId === this.selectedDictionaryId);
            if (!exists) {
              this.selectedDictionaryId = null;
            }
          }
        },
        error: (error) => {
          this.rows = [];
          this.mapPoints = [];
          this.mapOptions = this.buildMapOptions([]);
          this.total = 0;
          this.error = this.extractError(error);
        },
      });
  }

  private buildMapOptions(points: BondMapPoint[]): EChartsOption {
    const data = points
      .filter((x) => Number.isFinite(Number(x.x)) && Number.isFinite(Number(x.y)))
      .map((x) => ({
        value: [Number(x.x), Number(x.y), x.dictionaryId, x.secId, x.shortName ?? '', x.pricePctOfPar ?? null, x.maturityDate ?? null],
      }));

    return {
      animation: false,
      grid: {
        left: 56,
        right: 56,
        top: 20,
        bottom: 60,
      },
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          const value = params?.value ?? [];
          const name = value[4] || value[3] || '—';
          const secId = value[3] || '—';
          const y = Number(value[1]);
          const x = Number(value[0]);
          const price = value[5];
          const maturity = value[6];
          return [
            `<b>${name}</b> (${secId})`,
            `Доходность: ${Number.isFinite(y) ? y.toFixed(2) : '—'}%`,
            `Дюрация/срок: ${Number.isFinite(x) ? x.toFixed(2) : '—'} лет`,
            `Цена %: ${price != null && Number.isFinite(Number(price)) ? Number(price).toFixed(2) : '—'}`,
            `Погашение: ${maturity ? String(maturity).slice(0, 10) : '—'}`,
          ].join('<br/>');
        },
      },
      toolbox: {
        right: 8,
        feature: {
          dataZoom: {
            yAxisIndex: 'none',
          },
          restore: {},
        },
      },
      xAxis: {
        type: 'value',
        name: 'Дюрация/срок, лет',
        nameLocation: 'middle',
        nameGap: 28,
      },
      yAxis: {
        type: 'value',
        name: 'Доходность, %',
        nameLocation: 'middle',
        nameGap: 42,
      },
      dataZoom: [
        {
          type: 'inside',
          xAxisIndex: 0,
          yAxisIndex: 0,
        },
        {
          type: 'slider',
          xAxisIndex: 0,
          bottom: 14,
        },
        {
          type: 'slider',
          yAxisIndex: 0,
          right: 12,
        },
      ],
      series: [
        {
          type: 'scatter',
          symbolSize: 10,
          itemStyle: {
            color: '#1f78b4',
            opacity: 0.85,
          },
          emphasis: {
            itemStyle: {
              color: '#d95f02',
            },
          },
          data,
        },
      ],
    };
  }

  private navigateWithState(state: BondsState): void {
    const queryParams: Record<string, any> = {
      tab: state.tab,
      orderBy: state.orderBy,
      dir: state.dir,
      page: state.page,
      pageSize: state.pageSize,
      mapMode: state.mapMode,
    };

    this.setQueryParam(queryParams, 'yieldMin', state.yieldMin);
    this.setQueryParam(queryParams, 'yieldMax', state.yieldMax);
    this.setQueryParam(queryParams, 'durationMin', state.durationMin);
    this.setQueryParam(queryParams, 'durationMax', state.durationMax);
    this.setQueryParam(queryParams, 'yearsToMaturityMin', state.yearsToMaturityMin);
    this.setQueryParam(queryParams, 'yearsToMaturityMax', state.yearsToMaturityMax);
    if (state.qualifiedOnly) {
      queryParams['qualifiedOnly'] = '1';
    }
    if (state.moexType.length > 0) {
      queryParams['moexType'] = state.moexType;
    }
    if (state.couponFreq.length > 0) {
      queryParams['couponFreq'] = state.couponFreq.map((x) => String(x));
    }

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
    });
  }

  private setQueryParam(target: Record<string, any>, key: string, value: number | null): void {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return;
    }
    target[key] = value;
  }

  private readState(query: ParamMap): BondsState {
    const tabValue = (query.get('tab') ?? 'corp').toLowerCase();
    const tab: BondTab = this.tabs.some((x) => x.key === tabValue as BondTab)
      ? (tabValue as BondTab)
      : 'corp';

    return {
      tab,
      yieldMin: this.parseNum(query.get('yieldMin')),
      yieldMax: this.parseNum(query.get('yieldMax')),
      durationMin: this.parseNum(query.get('durationMin')),
      durationMax: this.parseNum(query.get('durationMax')),
      yearsToMaturityMin: this.parseNum(query.get('yearsToMaturityMin')),
      yearsToMaturityMax: this.parseNum(query.get('yearsToMaturityMax')),
      qualifiedOnly: query.get('qualifiedOnly') === '1' || query.get('qualifiedOnly') === 'true',
      moexType: this.parseStringList(query, 'moexType'),
      couponFreq: this.parseNumberList(query, 'couponFreq'),
      orderBy: query.get('orderBy') ?? 'yieldPct',
      dir: query.get('dir') === 'asc' ? 'asc' : 'desc',
      page: this.parseInt(query.get('page'), 1),
      pageSize: this.parseInt(query.get('pageSize'), 50),
      mapMode: this.parseMapMode(query.get('mapMode')),
    };
  }

  private parseMapMode(value: string | null): BondMapMode {
    const mode = (value ?? '').toLowerCase();
    return this.mapModes.some((x) => x.key === mode)
      ? (mode as BondMapMode)
      : 'yield_by_duration';
  }

  private parseNum(value: string | null): number | null {
    if (value == null || value.trim() === '') {
      return null;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private parseInt(value: string | null, fallback: number): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return fallback;
    }
    return Math.floor(parsed);
  }

  private parseStringList(query: ParamMap, key: string): string[] {
    const allValues = query.getAll(key);
    const list = allValues.length > 0 ? allValues : (query.get(key) ? [query.get(key)!] : []);
    return list
      .flatMap((x) => x.split(','))
      .map((x) => x.trim())
      .filter((x) => !!x);
  }

  private parseNumberList(query: ParamMap, key: string): number[] {
    const values = this.parseStringList(query, key);
    return values
      .map((x) => Number(x))
      .filter((x) => Number.isFinite(x) && x > 0)
      .map((x) => Math.floor(x));
  }

  private defaultState(tab: BondTab = 'corp'): BondsState {
    return {
      tab,
      yieldMin: null,
      yieldMax: null,
      durationMin: null,
      durationMax: null,
      yearsToMaturityMin: null,
      yearsToMaturityMax: null,
      qualifiedOnly: false,
      moexType: [],
      couponFreq: [],
      orderBy: 'yieldPct',
      dir: 'desc',
      page: 1,
      pageSize: 50,
      mapMode: 'yield_by_duration',
    };
  }

  private extractError(error: any): string {
    if (typeof error?.error === 'string' && error.error.trim()) {
      return error.error;
    }
    if (typeof error?.message === 'string' && error.message.trim()) {
      return error.message;
    }
    return 'Не удалось загрузить данные по облигациям.';
  }
}
