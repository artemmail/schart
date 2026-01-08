import { CommonModule } from '@angular/common';
import { Component, HostListener, Input, NgZone, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
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

interface OrderBookRow {
  bidPrice: number | null;
  bidVolume: number | null;
  askVolume: number | null;
  askPrice: number | null;
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
  rows: OrderBookRow[] = [];
  tableMaxHeightPx: number | null = null;

  private ladderSubscription?: Subscription;
  private subscriptionKey: string | null = null;
  private activeParamsKey: string | null = null;

  constructor(private signalRService: SignalRService, private zone: NgZone) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['params']) {
      void this.configureSubscription();
    }
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.updateTableMaxHeight();
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
    this.rows = [];
    this.tableMaxHeightPx = null;
    this.maxBidVolume = 0;
    this.maxAskVolume = 0;
    this.bidChartPath = '';
    this.bidChartAreaPath = '';
    this.askChartPath = '';
    this.askChartAreaPath = '';
    this.isLoading = false;
  }

  getBidWidth(volume: number | null): number {
    return volume && this.maxBidVolume ? (volume / this.maxBidVolume) * 100 : 0;
  }

  getAskWidth(volume: number | null): number {
    return volume && this.maxAskVolume ? (volume / this.maxAskVolume) * 100 : 0;
  }

  trackByRow(index: number, row: OrderBookRow): string {
    return `${row.bidPrice ?? 'x'}-${row.askPrice ?? 'x'}-${index}`;
  }

  private updateVisualization(): void {
    this.maxBidVolume = this.getMaxVolume(this.bids);
    this.maxAskVolume = this.getMaxVolume(this.asks);
    this.bidChartPath = this.buildStepLinePath(this.bids, 0, 50, this.maxBidVolume, false, false);
    this.bidChartAreaPath = this.buildStepAreaPath(this.bids, 0, 50, this.maxBidVolume);
    this.askChartPath = this.buildStepLinePath(this.asks, 50, 100, this.maxAskVolume, false, false);
    this.askChartAreaPath = this.buildStepAreaPath(this.asks, 50, 100, this.maxAskVolume);
    this.rows = this.buildRows();
    this.updateTableMaxHeight();
  }

  private updateTableMaxHeight(): void {
    const rowCount = this.rows.length;
    if (!rowCount) {
      this.tableMaxHeightPx = null;
      return;
    }

    const rowHeightPx = 24;
    const rowGapPx = 3;
    const contentHeightPx = rowCount * rowHeightPx + (rowCount - 1) * rowGapPx;
    const viewportLimitPx =
      typeof window === 'undefined' ? 500 : Math.floor(window.innerHeight * 0.6);

    this.tableMaxHeightPx = Math.min(contentHeightPx, viewportLimitPx);
  }

  private getMaxVolume(levels: OrderBookLevel[]): number {
    return levels.reduce((max, level) => Math.max(max, level.volume), 0);
  }

  private buildStepLinePath(
    levels: OrderBookLevel[],
    startX: number,
    endX: number,
    maxVolume: number,
    includeStartBaseline = true,
    includeEndBaseline = true
  ): string {
    if (!levels.length || maxVolume <= 0) {
      return '';
    }

    const height = 40;
    const width = endX - startX;
    const binWidth = width / levels.length;
    const format = (value: number) => value.toFixed(2);
    const yValues = levels.map((level) => height - (level.volume / maxVolume) * height);

    let path = '';
    if (includeStartBaseline) {
      path = `M ${format(startX)} ${format(height)} V ${format(yValues[0])}`;
    } else {
      path = `M ${format(startX)} ${format(yValues[0])}`;
    }

    for (let index = 0; index < levels.length; index += 1) {
      const xRight = startX + binWidth * (index + 1);
      path += ` H ${format(xRight)}`;
      if (index < levels.length - 1) {
        path += ` V ${format(yValues[index + 1])}`;
      } else if (includeEndBaseline) {
        path += ` V ${format(height)}`;
      }
    }

    return path;
  }

  private buildStepAreaPath(
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
    const binWidth = width / levels.length;
    const format = (value: number) => value.toFixed(2);
    const yValues = levels.map((level) => height - (level.volume / maxVolume) * height);

    let path = `M ${format(startX)} ${format(height)} V ${format(yValues[0])}`;
    for (let index = 0; index < levels.length; index += 1) {
      const xRight = startX + binWidth * (index + 1);
      path += ` H ${format(xRight)}`;
      if (index < levels.length - 1) {
        path += ` V ${format(yValues[index + 1])}`;
      }
    }

    return `${path} V ${format(height)} Z`;
  }

  private buildRows(): OrderBookRow[] {
    const count = Math.max(this.bids.length, this.asks.length);
    return Array.from({ length: count }, (_, index) => {
      const bid = this.bids[index];
      const ask = this.asks[index];
      return {
        bidPrice: bid?.price ?? null,
        bidVolume: bid?.volume ?? null,
        askVolume: ask?.volume ?? null,
        askPrice: ask?.price ?? null,
      };
    });
  }
}
