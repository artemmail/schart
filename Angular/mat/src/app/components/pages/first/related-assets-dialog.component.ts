import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { MaterialModule } from 'src/app/material.module';
import { CommonService, FutureSeriesItem, OptionItem } from 'src/app/service/common.service';
import { RelatedAssetItem, RelatedAssetsService } from 'src/app/service/related-assets.service';
import { contractGroups } from 'src/app/models/option-data.model';

interface AssetRow {
  ticker: string;
  canOpenChart?: boolean;
  name?: string | null;
  price?: number | null;
  expiration?: string;
  basis?: string;
  days?: number;
  impliedRate?: string;
  lot?: number;
  optionType?: string;
  strike?: number;
  volatility?: string;
  openInterest?: number;
  yield?: string;
  nextCouponDate?: string;
  priceIsPercent?: boolean;
}

@Component({
  standalone: true,
  selector: 'app-related-assets-dialog',
  imports: [CommonModule, MaterialModule, MatDialogModule],
  templateUrl: './related-assets-dialog.component.html',
  styleUrls: ['./related-assets-dialog.component.scss'],
})
export class RelatedAssetsDialogComponent implements OnInit {
  readonly selectedTicker: string;
  stock: AssetRow | null = null;
  futures: AssetRow[] = [];
  options: AssetRow[] = [];
  bonds: AssetRow[] = [];
  loading = true;
  error = '';
  expanded = { futures: true, options: true, bonds: true };

  constructor(
    @Inject(MAT_DIALOG_DATA) data: { ticker: string },
    private readonly dialogRef: MatDialogRef<RelatedAssetsDialogComponent, string>,
    private readonly common: CommonService,
    private readonly relatedAssets: RelatedAssetsService,
  ) {
    this.selectedTicker = data.ticker.trim().toUpperCase();
  }

  async ngOnInit(): Promise<void> {
    try {
      const { relations, selectedMarket } = await firstValueFrom(this.relatedAssets.getTree(this.selectedTicker));
      const root = relations.stock.securityId;
      const canOpenChart = relations.stock.canOpenChart !== false;
      const info = await firstValueFrom(this.common.getFutInfo(canOpenChart ? root : this.selectedTicker)).catch(() => null);
      const contract = contractGroups.flatMap(group => group.contracts)
        .find(item => item.code_futures.toUpperCase() === root.toUpperCase());
      this.stock = {
        ticker: root,
        canOpenChart,
        name: canOpenChart ? (info?.fullName || relations.stock.shortname) : (contract?.name || relations.stock.shortname),
        price: canOpenChart ? (info?.lastPrice ?? relations.stock.currentPrice ?? info?.another_futures.find(x => x.spotPrice)?.spotPrice) : null,
      };

      const futureInfo = new Map<string, FutureSeriesItem>((info?.another_futures ?? []).map(x => [x.securityid.toUpperCase(), x]));
      const optionInfo = new Map<string, OptionItem>((info?.options ?? []).map(x => [x.securityid.toUpperCase(), x]));
      this.futures = relations.futures.map(item => {
        const details = futureInfo.get(item.securityId.toUpperCase());
        const base: AssetRow = {
          ticker: item.securityId, name: item.shortname, price: item.currentPrice,
          expiration: item.expirationDate ? this.date(item.expirationDate) : undefined,
          lot: item.lotSize ?? undefined,
        };
        if (!details) return base;
        const enriched = this.futureRow(details);
        return { ...base, ...enriched, name: item.shortname || details.shortname,
          price: enriched.price ?? base.price, expiration: enriched.expiration ?? base.expiration,
          lot: enriched.lot ?? base.lot };
      });
      this.options = relations.options.map(item => {
        const details = optionInfo.get(item.securityId.toUpperCase());
        const base: AssetRow = {
          ticker: item.securityId, name: item.shortname, price: item.currentPrice,
          expiration: item.expirationDate ? this.date(item.expirationDate) : undefined,
          optionType: item.optionType ?? undefined, strike: item.strike ?? undefined,
          volatility: item.volatility != null ? this.percent(item.volatility > 1 ? item.volatility / 100 : item.volatility) : undefined,
          openInterest: item.openInterest ?? undefined,
        };
        if (!details) return base;
        const enriched = this.optionRow(details);
        return { ...base, ...enriched, name: item.shortname || details.shortname,
          price: enriched.price ?? base.price, expiration: enriched.expiration ?? base.expiration,
          optionType: enriched.optionType ?? base.optionType, strike: enriched.strike ?? base.strike,
          volatility: enriched.volatility ?? base.volatility,
          openInterest: enriched.openInterest ?? base.openInterest };
      });
      this.bonds = relations.bonds.map(item => this.bondRow(item));

      // The selected instrument may have no active relation row yet. Keep it visible in its branch.
      if (selectedMarket === 1 && !this.futures.some(x => this.isCurrent(x.ticker))) {
        const selected = await firstValueFrom(this.common.getFutInfo(this.selectedTicker)).catch(() => null);
        this.futures.unshift({ ticker: this.selectedTicker, name: selected?.fullName,
          price: selected?.lastPrice, expiration: selected?.expriation ? this.date(selected.expriation) : undefined,
          openInterest: selected?.oi });
      } else if (selectedMarket === 7 && !this.options.some(x => this.isCurrent(x.ticker))) {
        const selected = await firstValueFrom(this.common.getFutInfo(this.selectedTicker)).catch(() => null);
        this.options.unshift({ ticker: this.selectedTicker, name: selected?.fullName, price: selected?.lastPrice });
      } else if (selectedMarket === 2 && !this.bonds.some(x => this.isCurrent(x.ticker))) {
        this.bonds.unshift({ ticker: this.selectedTicker });
      }
    } catch {
      this.error = 'Не удалось определить базовый актив или загрузить связанные инструменты.';
    } finally {
      this.loading = false;
    }
  }

  choose(ticker: string): void {
    this.dialogRef.close(ticker);
  }

  isCurrent(ticker: string): boolean {
    return ticker.toUpperCase() === this.selectedTicker;
  }

  private futureRow(item: FutureSeriesItem): AssetRow {
    const basis = item.contango === 'backwardation' ? 'Бэквордация' :
      item.contango === 'contango' ? 'Контанго' : item.contango === 'flat' ? 'Нейтрально' : '';
    return {
      ticker: item.securityid, name: item.shortname, price: item.futuresPrice,
      expiration: item.expirationDate ? this.date(item.expirationDate) : undefined,
      basis: basis ? `${basis}${item.spreadPct != null ? ` ${this.percent(item.spreadPct)}` : ''}` : undefined,
      days: item.daysToExpiration, impliedRate: item.impliedRate != null ? this.percent(item.impliedRate) : undefined,
      lot: item.lotSize,
    };
  }

  private optionRow(item: OptionItem): AssetRow {
    return {
      ticker: item.securityid, name: item.shortname, price: item.last ?? item.theorPrice,
      optionType: item.optionType, strike: item.strike,
      expiration: item.expirationDate ? this.date(item.expirationDate) : undefined,
      volatility: item.volat != null ? this.percent(item.volat > 1 ? item.volat / 100 : item.volat) : undefined,
      openInterest: item.openPosition,
    };
  }

  private bondRow(item: RelatedAssetItem): AssetRow {
    return {
      ticker: item.securityId, name: item.shortname, price: item.currentPrice,
      yield: item.currentYield != null ? `${this.number(item.currentYield)}%` : undefined,
      expiration: item.maturityDate ? this.date(item.maturityDate) : undefined,
      nextCouponDate: item.nextCouponDate ? this.date(item.nextCouponDate) : undefined,
    };
  }

  private date(value: string | Date): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('ru-RU');
  }

  private number(value: number): string {
    return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 4 }).format(value);
  }

  private percent(value: number): string {
    return `${this.number(value * 100)}%`;
  }
}
