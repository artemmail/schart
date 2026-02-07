import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, ParamMap, RouterModule } from '@angular/router';
import { Subject, finalize, takeUntil } from 'rxjs';
import {
  BondDetailsCoupon,
  BondDetailsInstrument,
  BondDetailsResponse,
  BondDetailsSnapshot,
  BondsService,
} from 'src/app/service/bonds.service';
import { MaterialModule } from 'src/app/material.module';

@Component({
  standalone: true,
  selector: 'app-bond-details',
  imports: [CommonModule, RouterModule, MaterialModule],
  templateUrl: './bond-details.component.html',
  styleUrls: ['./bond-details.component.scss'],
})
export class BondDetailsComponent implements OnInit, OnDestroy {
  secIdOrIsin = '';
  instrument: BondDetailsInstrument | null = null;
  snapshot: BondDetailsSnapshot | null = null;
  coupons: BondDetailsCoupon[] = [];
  loading = false;
  error = '';

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly route: ActivatedRoute,
    private readonly bondsService: BondsService
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
            return;
          }
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
        },
        error: (error) => {
          this.error = this.extractError(error);
          this.instrument = null;
          this.snapshot = null;
          this.coupons = [];
        },
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
