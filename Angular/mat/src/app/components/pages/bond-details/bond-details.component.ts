import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, ParamMap, RouterModule } from '@angular/router';
import { Subject, finalize, takeUntil } from 'rxjs';
import { FootPrintParameters } from 'src/app/models/Params';
import { CommonService } from 'src/app/service/common.service';
import {
  BondDetailsCoupon,
  BondDetailsInstrument,
  BondDetailsResponse,
  BondDetailsSnapshot,
  BondsService,
} from 'src/app/service/bonds.service';
import { MaterialModule } from 'src/app/material.module';
import { FootprintWidgetComponent } from 'src/app/components/footprint/components/footprint-widget/footprint-widget.component';

@Component({
  standalone: true,
  selector: 'app-bond-details',
  imports: [CommonModule, RouterModule, MaterialModule, FootprintWidgetComponent],
  templateUrl: './bond-details.component.html',
  styleUrls: ['./bond-details.component.scss'],
})
export class BondDetailsComponent implements OnInit, OnDestroy {
  secIdOrIsin = '';
  instrument: BondDetailsInstrument | null = null;
  snapshot: BondDetailsSnapshot | null = null;
  coupons: BondDetailsCoupon[] = [];
  miniParams: FootPrintParameters | null = null;
  miniLoading = false;
  loading = false;
  error = '';

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly route: ActivatedRoute,
    private readonly bondsService: BondsService,
    private readonly commonService: CommonService,
    private readonly titleService: Title
  ) {}

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (params: ParamMap) => {
          this.secIdOrIsin = params.get('secid') ?? '';
          if (!this.secIdOrIsin) {
            this.error = 'Не указан идентификатор облигации.';
            this.titleService.setTitle('Облигация информация и график');
            return;
          }
          this.setPageTitle(this.secIdOrIsin, this.secIdOrIsin);
          this.loadDetails(this.secIdOrIsin);
        },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadDetails(secIdOrIsin: string): void {
    this.loading = true;
    this.error = '';
    this.instrument = null;
    this.snapshot = null;
    this.coupons = [];
    this.miniParams = null;
    this.miniLoading = false;

    this.bondsService
      .getDetails(secIdOrIsin)
      .pipe(
        finalize(() => {
          this.loading = false;
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (response: BondDetailsResponse) => {
          this.instrument = response.instrument;
          this.snapshot = response.lastSnapshot ?? null;
          this.coupons = response.coupons ?? [];
          this.setPageTitle(
            response.instrument?.secId || secIdOrIsin,
            response.instrument?.shortName || response.instrument?.secId || secIdOrIsin
          );
          this.loadMiniChart(response.instrument?.secId || secIdOrIsin);
        },
        error: (error) => {
          this.error = this.extractError(error);
          this.instrument = null;
          this.snapshot = null;
          this.coupons = [];
          this.miniParams = null;
          this.miniLoading = false;
          this.setPageTitle(secIdOrIsin, secIdOrIsin);
        },
      });
  }

  private setPageTitle(ticker: string, titleName: string): void {
    const normalizedTicker = (ticker || '').trim().toUpperCase();
    const normalizedTitleName = (titleName || normalizedTicker || '').trim();
    if (!normalizedTicker) {
      this.titleService.setTitle(`Облигация ${normalizedTitleName} информация и график`);
      return;
    }

    this.titleService.setTitle(`${normalizedTicker} · Облигация ${normalizedTitleName} информация и график`);
  }

  private loadMiniChart(ticker: string): void {
    const normalizedTicker = (ticker || '').trim().toUpperCase();
    if (!normalizedTicker) {
      this.miniParams = null;
      this.miniLoading = false;
      return;
    }

    this.miniLoading = true;
    this.miniParams = null;

    this.commonService.getControlsNew({
      ticker: normalizedTicker,
      candlesOnly: true,
      rperiod: 'year',
      period: 1440
    }).subscribe({
      next: (data) => {
        this.miniParams = {
          ticker: normalizedTicker,
          period: 1440,
          priceStep: data.priceStep ?? data.minStep ?? 1,
          candlesOnly: true,
          startDate: data.startDate,
          endDate: data.endDate,
          rperiod: data.rperiod
        };
        this.miniLoading = false;
      },
      error: () => {
        this.miniParams = null;
        this.miniLoading = false;
      }
    });
  }

  private extractError(error: any): string {
    if (typeof error?.error === 'string' && error.error.trim()) {
      return error.error;
    }
    if (error?.status === 404) {
      return 'Облигация не найдена.';
    }
    if (typeof error?.message === 'string' && error.message.trim()) {
      return error.message;
    }
    return 'Не удалось загрузить карточку облигации.';
  }
}
