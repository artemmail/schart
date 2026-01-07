import { CommonModule } from '@angular/common';
import { Component, Input, NgZone, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { Subscription } from 'rxjs';
import { FootPrintParameters } from 'src/app/models/Params';
import { MaterialModule } from 'src/app/material.module';
import {
  FootprintLadderData,
  SignalRService,
} from 'src/app/service/FootPrint/signalr.service';

interface OrderBookLevel {
  price: number;
  volume: number;
}

@Component({
  standalone: true,
  selector: 'footprint-order-book',
  imports: [CommonModule, MaterialModule],
  templateUrl: './order-book.component.html',
  styleUrls: ['./order-book.component.css'],
  providers: [SignalRService],
})
export class FootprintOrderBookComponent implements OnChanges, OnDestroy {
  @Input() params: FootPrintParameters | null = null;
  @Input() maxLevels = 25;

  bids: OrderBookLevel[] = [];
  asks: OrderBookLevel[] = [];
  isLoading = true;

  private ladderSubscription?: Subscription;
  private subscriptionKey: string | null = null;
  private activeParamsKey: string | null = null;

  constructor(private signalRService: SignalRService, private zone: NgZone) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['params']) {
      void this.configureSubscription();
    }
  }

  ngOnDestroy(): void {
    void this.teardown();
  }

  private async configureSubscription(): Promise<void> {
    const params = this.params;
    const nextKey = params?.ticker ?? null;

    if (!params?.ticker || !this.shouldSubscribe(params)) {
      this.clearData();
      await this.teardown();
      return;
    }

    if (nextKey === this.activeParamsKey && this.subscriptionKey) {
      return;
    }

    await this.teardown();
    this.isLoading = true;
    this.activeParamsKey = nextKey;

    const subscriptionKey = await this.signalRService.Subscribe(
      {
        ticker: params.ticker,
        period: params.period,
        step: params.priceStep,
      },
      false
    );

    if (!subscriptionKey) {
      this.isLoading = false;
      return;
    }

    this.subscriptionKey = subscriptionKey;
    this.ladderSubscription = this.signalRService.receiveLadder$.subscribe(
      (ladder) => {
        this.zone.run(() => this.applyLadder(ladder));
      }
    );
  }

  private async teardown(): Promise<void> {
    this.ladderSubscription?.unsubscribe();
    this.ladderSubscription = undefined;

    if (this.subscriptionKey) {
      await this.signalRService.unsubscr(this.subscriptionKey);
    }

    this.subscriptionKey = null;
    this.activeParamsKey = null;
  }

  private applyLadder(ladder: FootprintLadderData): void {
    if (!ladder || Object.keys(ladder).length <= 2) {
      return;
    }

    const bids: OrderBookLevel[] = [];
    const asks: OrderBookLevel[] = [];

    Object.entries(ladder).forEach(([priceKey, volume]) => {
      const price = Number(priceKey);
      if (!Number.isFinite(price) || !Number.isFinite(volume)) {
        return;
      }

      if (volume > 0) {
        bids.push({ price, volume });
      } else if (volume < 0) {
        asks.push({ price, volume: Math.abs(volume) });
      }
    });

    bids.sort((a, b) => b.price - a.price);
    asks.sort((a, b) => a.price - b.price);

    this.bids = bids.slice(0, this.maxLevels);
    this.asks = asks.slice(0, this.maxLevels);
    this.isLoading = false;
  }

  private shouldSubscribe(params: FootPrintParameters): boolean {
    if (params.type === 'arbitrage') {
      return false;
    }

    const normalize = (date: Date) => {
      const copy = new Date(date);
      copy.setHours(0, 0, 0, 0);
      return copy.getTime();
    };

    const now = new Date();
    const endDate = params.endDate ? new Date(params.endDate) : null;
    const isEndDateInPast = !!endDate && normalize(endDate) < normalize(now);
    return !isEndDateInPast;
  }

  private clearData(): void {
    this.bids = [];
    this.asks = [];
    this.isLoading = false;
  }
}
