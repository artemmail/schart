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
  maxBidVolume = 0;
  maxAskVolume = 0;
  bidChartPath = '';
  bidChartAreaPath = '';
  askChartPath = '';
  askChartAreaPath = '';

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
    this.updateVisualization();
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
    this.maxBidVolume = 0;
    this.maxAskVolume = 0;
    this.bidChartPath = '';
    this.bidChartAreaPath = '';
    this.askChartPath = '';
    this.askChartAreaPath = '';
    this.isLoading = false;
  }

  getBidWidth(level: OrderBookLevel): number {
    return this.maxBidVolume ? (level.volume / this.maxBidVolume) * 50 : 0;
  }

  getAskWidth(level: OrderBookLevel): number {
    return this.maxAskVolume ? (level.volume / this.maxAskVolume) * 50 : 0;
  }

  trackByPrice(index: number, level: OrderBookLevel): number {
    return level.price;
  }

  private updateVisualization(): void {
    this.maxBidVolume = this.getMaxVolume(this.bids);
    this.maxAskVolume = this.getMaxVolume(this.asks);
    this.bidChartPath = this.buildLinePath(this.bids, 0, 50, this.maxBidVolume);
    this.bidChartAreaPath = this.buildAreaPath(this.bids, 0, 50, this.maxBidVolume);
    this.askChartPath = this.buildLinePath(this.asks, 50, 100, this.maxAskVolume);
    this.askChartAreaPath = this.buildAreaPath(this.asks, 50, 100, this.maxAskVolume);
  }

  private getMaxVolume(levels: OrderBookLevel[]): number {
    return levels.reduce((max, level) => Math.max(max, level.volume), 0);
  }

  private buildLinePath(
    levels: OrderBookLevel[],
    startX: number,
    endX: number,
    maxVolume: number
  ): string {
    if (!levels.length || maxVolume <= 0) {
      return '';
    }

    const height = 40;
    const width = endX - startX;
    const step = levels.length > 1 ? width / (levels.length - 1) : 0;

    return levels
      .map((level, index) => {
        const x = startX + step * index;
        const y = height - (level.volume / maxVolume) * height;
        return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(' ');
  }

  private buildAreaPath(
    levels: OrderBookLevel[],
    startX: number,
    endX: number,
    maxVolume: number
  ): string {
    if (!levels.length || maxVolume <= 0) {
      return '';
    }

    const height = 40;
    const width = endX - startX;
    const step = levels.length > 1 ? width / (levels.length - 1) : 0;

    const points = levels.map((level, index) => {
      const x = startX + step * index;
      const y = height - (level.volume / maxVolume) * height;
      return `L ${x.toFixed(2)} ${y.toFixed(2)}`;
    });

    return `M ${startX} ${height} ${points.join(' ')} L ${endX} ${height} Z`;
  }
}
