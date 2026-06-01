import { Cluster, Column, ColumnEx } from 'src/app/models/Column';
import { CandlesRangeSetValue } from 'src/app/models/candles-range-set';

type ClusterDataColumn = Omit<Column, 'cl'> & { cl?: Cluster[] };

export interface ClusterDataInit {
  clusterData: ClusterDataColumn[];
  priceScale: number;
  VolumePerQuantity?: number | null;
  oiDeltaDivideBy2?: boolean;
}

export interface ClusterDataRenderStats {
  qntMax: number;
  qntAskMax: number;
  qntBidMax: number;
  volMax: number;
  volAskMax: number;
  volBidMax: number;
  maxDelta: number;
  maxDeltaV: number;
  q: number;
  bq: number;
  sq: number;
  v: number;
  bv: number;
  sv: number;
  maxPrice: number;
  minPrice: number;
  maxOI: number;
  minOI: number;
  minCumDelta: number;
  maxCumDelta: number;
  minOIDelta: number;
  maxOIDelta: number;
  minDeltaBar: number;
  maxDeltaBar: number;
  maxDens: number;
  minDens: number;
}


export class ClusterData {
  ladder: Record<number, number> = {};
  clusterData: ColumnEx[];
  lastPrice: number;
  priceScale: number;
  volumePerQuantity: number;

  maxClusterQnt: number = 0;
  maxClusterQntAsk: number = 0;
  maxClusterQntBid: number = 0;
  maxClusterVol: number = 0;
  maxClusterVolAsk: number = 0;
  maxClusterVolBid: number = 0;

  maxOI: number = 0;
  minOI: number = 0;

  maxOIDelta: number = 0;
  minOIDelta: number = 0;

  maxDelta: number = 0;
  maxDeltaV: number = 0;
  minColumnDelta: number = 0;
  minCumDelta: number = 0;
  maxAbsOIDelta: number = 0;

  maxQuantity: number = 0;
  maxQuantityAsk: number = 0;
  maxQuantityBid: number = 0;

  maxVolume: number = 0;
  maxVolumeAsk: number = 0;
  maxVolumeBid: number = 0;
  maxColumnDelta: number = 0;
  maxCumDelta: number = 0;
  minDeltaBar: number = 0;
  maxDeltaBar: number = 0;
  maxDens: number = 0;
  minDens: number = 0;
  local: ClusterDataRenderStats | null = null;
  ColumnNumberByDate: Record<string, number> = {};
  maxPrice: number;
  minPrice: number;

  rangeSetLines: CandlesRangeSetValue[] | null = null;

  totalColumn: ColumnEx | any;
  maxt1: number;
  maxt2: number;

  private oiDeltaDivideBy2 = false;
  private readonly fallbackPeriodMs = 60 * 1000;
  private readonly realtimeTailColumns = 5;
  private readonly minRealtimeTailMs = 5 * 60 * 1000;

  constructor(data: ClusterDataInit) {
    this.lastPrice = data.clusterData[data.clusterData.length - 1].c;
    this.priceScale = ClusterData.resolvePriceScale(
      data.priceScale,
      data.clusterData
    );
    this.oiDeltaDivideBy2 = data.oiDeltaDivideBy2 ?? false;

    this.volumePerQuantity =
      data.VolumePerQuantity ??
      (data.clusterData[0]?.v / (data.clusterData[0]?.q * data.clusterData[0]?.c));

    this.clusterData = data.clusterData.map((column) => this.addColumnInfo(column));

    this.calcPrices();
  }

  private static resolvePriceScale(
    priceScale: number | null | undefined,
    clusterData: ClusterDataColumn[]
  ): number {
    if (priceScale !== undefined && priceScale !== null && isFinite(priceScale) && priceScale > 0) {
      return priceScale;
    }

    const sample = clusterData?.[0];
    const fallbackPrice =
      sample?.c ?? sample?.o ?? sample?.h ?? sample?.l ?? 0;

    return ClusterData.guessScaleFromPrice(fallbackPrice);
  }

  private static guessScaleFromPrice(price: number): number {
    if (!isFinite(price) || price === 0) {
      return 1;
    }

    const abs = Math.abs(price);
    for (let n = 0; n <= 6; n++) {
      const factor = Math.pow(10, n);
      const rounded = Math.round(abs * factor);
      if (Math.abs(rounded - abs * factor) < 1e-6) {
        return 1 / factor;
      }
    }

    return Math.max(1e-6, abs * 0.001);
  }

  setOiDeltaDivideBy2(value: boolean): void {
    const normalized = !!value;
    if (this.oiDeltaDivideBy2 === normalized) {
      return;
    }

    this.oiDeltaDivideBy2 = normalized;
    this.calcPrices();
  }

  getGlobalRenderStats(): ClusterDataRenderStats {
    return {
      qntMax: this.maxClusterQnt,
      qntAskMax: this.maxClusterQntAsk,
      qntBidMax: this.maxClusterQntBid,
      volMax: this.maxClusterVol,
      volAskMax: this.maxClusterVolAsk,
      volBidMax: this.maxClusterVolBid,
      maxDelta: this.maxDelta,
      maxDeltaV: this.maxDeltaV,
      q: this.maxQuantity,
      bq: this.maxQuantityAsk,
      sq: this.maxQuantityBid,
      v: this.maxVolume,
      bv: this.maxVolumeAsk,
      sv: this.maxVolumeBid,
      maxPrice: this.maxPrice,
      minPrice: this.minPrice,
      maxOI: this.maxOI,
      minOI: this.minOI,
      minCumDelta: this.minCumDelta,
      maxCumDelta: this.maxCumDelta,
      minOIDelta: this.minOIDelta,
      maxOIDelta: this.maxOIDelta,
      minDeltaBar: this.minDeltaBar,
      maxDeltaBar: this.maxDeltaBar,
      maxDens: this.maxDens,
      minDens: this.minDens,
    };
  }

  getRenderStats(useLocal: boolean): ClusterDataRenderStats {
    if (useLocal && this.local) {
      return this.local;
    }

    return this.getGlobalRenderStats();
  }

  private normalizeOiValues(): void {
    const divider = this.oiDeltaDivideBy2 ? 2 : 1;
    this.clusterData.forEach((column) => {
      if (column.oiRaw === undefined || column.oiRaw === null) {
        column.oiRaw = column.oi;
      }
      column.oi = column.oiRaw / divider;
    });
  }

  private getColumnTime(column: any): number | null {
    if (!(column?.x instanceof Date)) {
      return null;
    }

    const time = column.x.getTime();
    return Number.isFinite(time) ? time : null;
  }

  private getColumnNumber(column: any): number | null {
    const value = column?.Number;
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  }

  private inferPeriodMs(): number {
    if (this.clusterData.length < 2) {
      return this.fallbackPeriodMs;
    }

    const diffs: number[] = [];
    const startIndex = Math.max(1, this.clusterData.length - 20);
    for (let i = startIndex; i < this.clusterData.length; i++) {
      const current = this.getColumnTime(this.clusterData[i]);
      const previous = this.getColumnTime(this.clusterData[i - 1]);
      if (current === null || previous === null) {
        continue;
      }

      const diff = current - previous;
      if (Number.isFinite(diff) && diff > 0) {
        diffs.push(diff);
      }
    }

    if (!diffs.length) {
      return this.fallbackPeriodMs;
    }

    diffs.sort((a, b) => a - b);
    return diffs[Math.floor(diffs.length / 2)];
  }

  private getRealtimeTailMs(): number {
    return Math.max(
      this.inferPeriodMs() * this.realtimeTailColumns,
      this.minRealtimeTailMs
    );
  }

  private filterRealtimeTail<T extends { clusterData: any[] }>(data: T): T | null {
    if (!data.clusterData.length || !this.clusterData.length) {
      return data;
    }

    const lastExistingTime = this.getColumnTime(
      this.clusterData[this.clusterData.length - 1]
    );
    if (lastExistingTime === null) {
      return data;
    }

    const earliestAllowedTime = lastExistingTime - this.getRealtimeTailMs();
    const filtered = data.clusterData.filter((column) => {
      const time = this.getColumnTime(column);
      return time === null || time >= earliestAllowedTime;
    });

    if (!filtered.length) {
      return null;
    }

    if (filtered.length === data.clusterData.length) {
      return data;
    }

    return { ...data, clusterData: filtered } as T;
  }

  private findColumnByTime(time: number): ColumnEx | null {
    const byIndex = this.ColumnNumberByDate[new Date(time).toISOString()];
    if (byIndex !== undefined) {
      return this.clusterData[byIndex] ?? null;
    }

    return (
      this.clusterData.find((column) => this.getColumnTime(column) === time) ??
      null
    );
  }

  private canUseNumberMerge(
    data: ClusterData,
    firstIncomingNumber: number,
    lastExistingNumber: number
  ): boolean {
    if (firstIncomingNumber >= lastExistingNumber) {
      return true;
    }

    const firstIncomingTime = this.getColumnTime(data.clusterData[0]);
    if (firstIncomingTime === null) {
      return false;
    }

    const existingAtIncomingTime = this.findColumnByTime(firstIncomingTime);
    return (
      existingAtIncomingTime !== null &&
      this.getColumnNumber(existingAtIncomingTime) === firstIncomingNumber
    );
  }

  private normalizeTimestampMergeNumber(
    newColumn: any,
    existingColumn: ColumnEx | undefined
  ): ColumnEx {
    const existingNumber = this.getColumnNumber(existingColumn);
    if (existingNumber !== null) {
      return { ...newColumn, Number: existingNumber } as ColumnEx;
    }

    const lastExisting = this.clusterData[this.clusterData.length - 1];
    const lastExistingNumber = this.getColumnNumber(lastExisting);
    const incomingNumber = this.getColumnNumber(newColumn);
    const newTime = this.getColumnTime(newColumn);
    const lastTime = this.getColumnTime(lastExisting);

    if (
      lastExistingNumber !== null &&
      newTime !== null &&
      lastTime !== null &&
      newTime > lastTime &&
      (incomingNumber === null || incomingNumber <= lastExistingNumber)
    ) {
      return { ...newColumn, Number: lastExistingNumber + 1 } as ColumnEx;
    }

    return newColumn as ColumnEx;
  }

  isWrongMerge(data: ClusterData): boolean {
    if (!data.clusterData.length || !this.clusterData.length) {
      return false;
    }

    const incomingLastTime = this.getColumnTime(
      data.clusterData[data.clusterData.length - 1]
    );
    const lastExistingTime = this.getColumnTime(
      this.clusterData[this.clusterData.length - 1]
    );

    return (
      incomingLastTime !== null &&
      lastExistingTime !== null &&
      incomingLastTime < lastExistingTime - this.getRealtimeTailMs()
    );
  }

  public handleCluster(answ: any): boolean {
    try {
      answ.forEach((value: any) => {
        value.x = new Date(value.x);
      });

      const data = { clusterData: answ } as ClusterData;
      return this.mergeData(data);
    } catch {
      return false;
    }
  }

  public handleTicks(answ: any): boolean {
    const data = {
      clusterData: answ.map((value: any) => ({
        Number: value.number,
        x: new Date(value.tradeDate),
        o: value.price,
        c: value.price,
        l: value.price,
        h: value.price,
        q: value.quantity,
        bq: value.quantity * value.direction,
        v: value.volume,
        bv: value.volume * value.direction,
        oi: value.oi,
      })),
    } as ClusterData;

    return this.mergeData(data, true);
  }

  public handleLadder(ladder: Record<string, number>) {
    if (Object.keys(ladder).length > 2) {
      const res: Record<number, number> = {};

      for (const key in ladder) {
        let newKey = Math.round(+key / this.priceScale) * this.priceScale;
        if (newKey === 0) newKey = +key;
        res[newKey] = (res[newKey] || 0) + ladder[key];
      }

      this.ladder = res;
    }
  }

  

  hasRangeSetLines(): boolean {
    return !!this.rangeSetLines?.length;
  }



  private toPercent(value: number, base: number): number {
    if (!isFinite(base) || base === 0) {
      return 0;
    }

    return ((value - base) / base) * 100;
  }

  private collectDensity(
    column: ColumnEx,
    target: number[]
  ): void {
    column.cl?.forEach((clItem) => {
      if (!Number.isFinite(clItem.ct) || clItem.ct === 0) {
        return;
      }

      const density = Math.abs(clItem.q / clItem.ct);
      if (Number.isFinite(density)) {
        target.push(density);
      }
    });
  }

  private getDensityBounds(values: number[]): { maxDens: number; minDens: number } {
    if (!values.length) {
      return { maxDens: 0, minDens: 0 };
    }

    const sorted = [...values].sort((a, b) => b - a);
    const r = Math.min(sorted.length, 8);
    if (r <= 0) {
      return { maxDens: 0, minDens: 0 };
    }

    const top =
      sorted.slice(0, r).reduce((sum, val) => sum + val, 0) / r;
    const bottom =
      sorted
        .slice(sorted.length - r, sorted.length)
        .reduce((sum, val) => sum + val, 0) / r;

    return { maxDens: top, minDens: bottom };
  }

  private findNearestColumnIndex(date: Date): number | null {
    const iso = date.toISOString();
    const exactIndex = this.ColumnNumberByDate[iso];
    if (exactIndex !== undefined) {
      return exactIndex;
    }

    let nearestIndex: number | null = null;
    let minimalDiff = Number.MAX_SAFE_INTEGER;

    this.clusterData.forEach((column, index) => {
      const diff = Math.abs(column.x.getTime() - date.getTime());
      if (diff < minimalDiff) {
        minimalDiff = diff;
        nearestIndex = index;
      }
    });

    return nearestIndex;
  }

  mergeData(data: ClusterData, preferTimestampMerge = false): boolean {
    const realtimeData = this.filterRealtimeTail(data);
    if (!realtimeData) {
        return true;
    }
    data = realtimeData as ClusterData;

    if (data.clusterData.length > 0) {
        // Sort data.clusterData before using it
        data.clusterData.sort((a, b) => a.x.getTime() - b.x.getTime());
        this.lastPrice = data.clusterData[data.clusterData.length - 1].c;
    }

    const lastExistingNumber = this.clusterData.length
        ? this.getColumnNumber(this.clusterData[this.clusterData.length - 1])
        : null;
    const firstIncomingNumber = data.clusterData.length
        ? this.getColumnNumber(data.clusterData[0])
        : null;

    // Use Number-based merge only when both sides contain valid Number values.
    // Realtime SignalR cluster updates can arrive without Number and must fallback
    // to timestamp merge to avoid unbounded growth and UI freeze.
    if (
        data.clusterData.length > 0 &&
        this.clusterData.length > 0 &&
        !preferTimestampMerge &&
        lastExistingNumber !== null &&
        firstIncomingNumber !== null &&
        this.canUseNumberMerge(data, firstIncomingNumber, lastExistingNumber)
    ) {
        // Ensure data.clusterData is sorted by Number
        data.clusterData.sort((a, b) => ((this.getColumnNumber(a) ?? 0) - (this.getColumnNumber(b) ?? 0)));

        while (
            this.clusterData.length &&
            (this.getColumnNumber(this.clusterData[this.clusterData.length - 1]) ?? Number.NEGATIVE_INFINITY) >=
                firstIncomingNumber
        ) {
            this.clusterData.pop();
        }
        this.clusterData = this.clusterData.concat(data.clusterData);
        this.clusterData.sort((a, b) => a.x.getTime() - b.x.getTime());
        this.lastPrice = this.clusterData[this.clusterData.length - 1].c;
        this.calcPrices();
        return true;
    }

    const existingDataMap = new Map<number, ColumnEx>();
    this.clusterData.forEach((item) => {
        if (item.x instanceof Date) {
            existingDataMap.set(item.x.getTime(), item);
        }
    });

    data.clusterData.forEach((newCandle) => {
        if (newCandle.x instanceof Date) {
            const time = newCandle.x.getTime();
            const existingCandle = existingDataMap.get(time);

            if (!existingCandle) {
                existingDataMap.set(
                    time,
                    this.normalizeTimestampMergeNumber(newCandle, undefined)
                );
            } else {
                if (existingCandle.q < newCandle.q) {
                    existingDataMap.set(
                        time,
                        this.normalizeTimestampMergeNumber(newCandle, existingCandle)
                    );
                } else {
                    existingCandle.c = newCandle.c;
                }
            }
        }
    });

    this.clusterData = Array.from(existingDataMap.values());
    this.clusterData.sort((a, b) => a.x.getTime() - b.x.getTime());
    this.lastPrice = this.clusterData[this.clusterData.length - 1].c;
    this.calcPrices();
    return true;
}

  getTotalColumn(data: Column[]): ColumnEx | undefined {
    if (!this.ableCluster()) return undefined;

    const result: Record<number, Cluster> = {};
    data.forEach((col) => {
      col.cl?.forEach((cluster) => {
        const p = cluster.p;
        if (!result[p]) {
          result[p] = { ...cluster };
        } else {
          result[p].q += cluster.q;
          result[p].bq += cluster.bq;
          result[p].ct += cluster.ct;
          if (Math.abs(cluster.mx) > Math.abs(result[p].mx)) {
            result[p].mx = cluster.mx;
          }
        }
      });
    });

    const sortedKeys = Object.keys(result)
      .map(Number)
      .sort((a, b) => a - b);

    const totalColumn: Column = {
      cl: sortedKeys.map((key) => result[key]),
      Number: 0,
      x: new Date(),
      o: 0,
      c: 0,
      l: 0,
      h: 0,
      q: 0,
      bq: 0,
      v: 0,
      bv: 0,
      oi: 0,
    };

    return this.addColumnInfo(totalColumn);
  }

  addColumnInfo(col: ClusterDataColumn): ColumnEx {
    const column: ColumnEx = { ...col } as ColumnEx;

    column.sq = column.q - column.bq;
    column.sv = column.v - column.bv;
    column.deltaTotal = 2 * column.bq - column.q;

    if (column.cl) {
      column.qntMax = 0;
      column.qntAskMax = 0;
      column.qntBidMax = 0;
      column.volMax = 0;
      column.volAskMax = 0;
      column.volBidMax = 0;
      column.maxDelta = 0;
      column.maxDeltaV = 0;

      column.cl.forEach((clItem) => {
        const mul = this.volumePerQuantity * clItem.p;
        column.qntMax = Math.max(clItem.q, column.qntMax!);
        column.qntAskMax = Math.max(clItem.bq, column.qntAskMax!);
        column.qntBidMax = Math.max(
          clItem.q - clItem.bq,
          column.qntBidMax!
        );
        column.volMax = Math.max(clItem.q * mul, column.volMax!);
        column.volAskMax = Math.max(clItem.bq * mul, column.volAskMax!);
        column.volBidMax = Math.max(
          (clItem.q - clItem.bq) * mul,
          column.volBidMax!
        );
        column.maxDelta = Math.max(
          Math.abs(2 * clItem.bq - clItem.q),
          column.maxDelta!
        );
        column.maxDeltaV = Math.max(
          mul * Math.abs(2 * clItem.bq - clItem.q),
          column.maxDeltaV!
        );
      });
    }

    return column;
  }

  maxFromPeriod(start: number, end: number) {
    const columns = this.clusterData;
    if (!columns.length) {
      this.local = this.getGlobalRenderStats();
      return;
    }

    let from = Number.isFinite(start) ? Math.floor(start) : 0;
    let to = Number.isFinite(end) ? Math.floor(end) : columns.length - 1;

    from = Math.max(0, Math.min(columns.length - 1, from));
    to = Math.max(0, Math.min(columns.length - 1, to));

    if (from > to) {
      const tmp = from;
      from = to;
      to = tmp;
    }

    const first = columns[from];
    const firstDeltaBar = 2 * first.bq - first.q;
    const densityValues: number[] = [];

    const local: ClusterDataRenderStats = {
      qntMax: first.qntMax ?? 0,
      qntAskMax: first.qntAskMax ?? 0,
      qntBidMax: first.qntBidMax ?? 0,
      volMax: first.volMax ?? 0,
      volAskMax: first.volAskMax ?? 0,
      volBidMax: first.volBidMax ?? 0,
      maxDelta: first.maxDelta ?? 0,
      maxDeltaV: first.maxDeltaV ?? 0,
      q: first.q,
      bq: first.bq,
      sq: first.sq ?? first.q - first.bq,
      v: first.v,
      bv: first.bv,
      sv: first.sv ?? first.v - first.bv,
      maxPrice: first.h,
      minPrice: first.l,
      maxOI: first.oi,
      minOI: first.oi,
      minCumDelta: first.cumDelta ?? 0,
      maxCumDelta: first.cumDelta ?? 0,
      minOIDelta: first.oiDelta ?? 0,
      maxOIDelta: first.oiDelta ?? 0,
      minDeltaBar: firstDeltaBar,
      maxDeltaBar: firstDeltaBar,
      maxDens: 0,
      minDens: 0,
    };

    for (let i = from; i <= to; i++) {
      const col = columns[i];
      local.qntMax = Math.max(col.qntMax ?? 0, local.qntMax);
      local.qntAskMax = Math.max(col.qntAskMax ?? 0, local.qntAskMax);
      local.qntBidMax = Math.max(col.qntBidMax ?? 0, local.qntBidMax);
      local.volMax = Math.max(col.volMax ?? 0, local.volMax);
      local.volAskMax = Math.max(col.volAskMax ?? 0, local.volAskMax);
      local.volBidMax = Math.max(col.volBidMax ?? 0, local.volBidMax);
      local.maxDelta = Math.max(col.maxDelta ?? 0, local.maxDelta);
      local.maxDeltaV = Math.max(col.maxDeltaV ?? 0, local.maxDeltaV);
      local.q = Math.max(col.q, local.q);
      local.bq = Math.max(col.bq, local.bq);
      local.sq = Math.max(col.sq ?? col.q - col.bq, local.sq);
      local.v = Math.max(col.v, local.v);
      local.bv = Math.max(col.bv, local.bv);
      local.sv = Math.max(col.sv ?? col.v - col.bv, local.sv);
      local.minPrice = Math.min(local.minPrice, col.l);
      local.maxPrice = Math.max(local.maxPrice, col.h);
      local.minCumDelta = Math.min(local.minCumDelta, col.cumDelta ?? 0);
      local.maxCumDelta = Math.max(local.maxCumDelta, col.cumDelta ?? 0);
      local.minOIDelta = Math.min(local.minOIDelta, col.oiDelta ?? 0);
      local.maxOIDelta = Math.max(local.maxOIDelta, col.oiDelta ?? 0);

      const deltaBar = 2 * col.bq - col.q;
      local.minDeltaBar = Math.min(local.minDeltaBar, deltaBar);
      local.maxDeltaBar = Math.max(local.maxDeltaBar, deltaBar);
      local.minOI = Math.min(local.minOI, col.oi);
      local.maxOI = Math.max(local.maxOI, col.oi);

      this.collectDensity(col, densityValues);
    }

    const densBounds = this.getDensityBounds(densityValues);
    local.maxDens = densBounds.maxDens;
    local.minDens = densBounds.minDens;
    this.local = local;
  }

  clusterLength(): number {
    return this.clusterData.length;
  }

  ableOI(): boolean {
    return this.clusterData[0].oi !== 0;
  }

  ableCluster(): boolean {
    return !!this.clusterData[0].cl;
  }

  calcPrices() {
    const data = this.clusterData;
    if (!data.length) {
      return;
    }
    this.ColumnNumberByDate = {};
    this.normalizeOiValues();

    for (let i = 0; i < data.length; i++) {
      data[i] = this.addColumnInfo(data[i]);
      if (i === 0) {
        data[i].cumDelta = data[i].deltaTotal ?? 0;
        data[i].oiDelta = 0;
      } else {
        data[i].cumDelta =
          (data[i].deltaTotal ?? 0) + (data[i - 1].cumDelta ?? 0);
        data[i].oiDelta = data[i].oi - data[i - 1].oi;
      }
    }

    const first = data[0];

    this.maxClusterQnt = first.qntMax ?? 0;
    this.maxClusterQntAsk = first.qntAskMax ?? 0;
    this.maxClusterQntBid = first.qntBidMax ?? 0;

    this.maxClusterVol = first.volMax ?? 0;
    this.maxClusterVolAsk = first.volAskMax ?? 0;
    this.maxClusterVolBid = first.volBidMax ?? 0;

    this.maxOI = first.oi;
    this.minOI = first.oi;

    this.minPrice = first.l;
    this.maxPrice = first.h;

    this.maxOIDelta = first.oiDelta ?? 0;
    this.minOIDelta = first.oiDelta ?? 0;

    this.maxDelta = first.maxDelta ?? 0;
    this.maxDeltaV = first.maxDeltaV ?? 0;
    this.minColumnDelta = this.maxColumnDelta = first.deltaTotal ?? 0;
    this.minCumDelta = this.maxCumDelta = first.cumDelta ?? 0;
    this.maxAbsOIDelta = Math.abs(first.oiDelta ?? 0);
    const firstDeltaBar = 2 * first.bq - first.q;
    this.minDeltaBar = firstDeltaBar;
    this.maxDeltaBar = firstDeltaBar;

    this.maxQuantity = first.q;
    this.maxQuantityAsk = first.bq;
    this.maxQuantityBid = first.sq ?? 0;

    this.maxVolume = first.v;
    this.maxVolumeAsk = first.bv;
    this.maxVolumeBid = first.sv ?? 0;

    for (let i = 0; i < data.length; i++) {
      const col = data[i];

      this.maxDelta = Math.max(this.maxDelta, col.maxDelta ?? 0);
      this.maxDeltaV = Math.max(this.maxDeltaV, col.maxDeltaV ?? 0);

      this.maxColumnDelta = Math.max(
        this.maxColumnDelta,
        col.deltaTotal ?? 0
      );
      this.maxCumDelta = Math.max(this.maxCumDelta, col.cumDelta ?? 0);
      this.minColumnDelta = Math.min(
        this.minColumnDelta,
        col.deltaTotal ?? 0
      );
      this.minCumDelta = Math.min(this.minCumDelta, col.cumDelta ?? 0);
      this.maxAbsOIDelta = Math.max(
        this.maxAbsOIDelta,
        Math.abs(col.oiDelta ?? 0)
      );

      this.maxOIDelta = Math.max(col.oiDelta ?? 0, this.maxOIDelta);
      this.minOIDelta = Math.min(col.oiDelta ?? 0, this.minOIDelta);

      this.minDeltaBar = Math.min(
        this.minDeltaBar,
        2 * col.bq - col.q
      );
      this.maxDeltaBar = Math.max(
        this.maxDeltaBar,
        2 * col.bq - col.q
      );

      this.maxOI = Math.max(col.oi, this.maxOI);
      this.minOI = Math.min(col.oi, this.minOI);

      this.maxPrice = Math.max(col.h, this.maxPrice);
      this.minPrice = Math.min(col.l, this.minPrice);

      this.maxQuantity = Math.max(col.q, this.maxQuantity);
      this.maxQuantityAsk = Math.max(col.bq, this.maxQuantityAsk);
      this.maxQuantityBid = Math.max(col.sq ?? 0, this.maxQuantityBid);

      this.maxVolume = Math.max(col.v, this.maxVolume);
      this.maxVolumeAsk = Math.max(col.bv, this.maxVolumeAsk);
      this.maxVolumeBid = Math.max(col.sv ?? 0, this.maxVolumeBid);

      this.maxClusterQnt = Math.max(
        this.maxClusterQnt,
        col.qntMax ?? 0
      );
      this.maxClusterQntAsk = Math.max(
        this.maxClusterQntAsk,
        col.qntAskMax ?? 0
      );
      this.maxClusterQntBid = Math.max(
        this.maxClusterQntBid,
        col.qntBidMax ?? 0
      );

      this.maxClusterVol = Math.max(
        this.maxClusterVol,
        col.volMax ?? 0
      );
      this.maxClusterVolAsk = Math.max(
        this.maxClusterVolAsk,
        col.volAskMax ?? 0
      );
      this.maxClusterVolBid = Math.max(
        this.maxClusterVolBid,
        col.volBidMax ?? 0
      );

      this.ColumnNumberByDate[col.x.toISOString()] = i;
    }

    if (!this.ableCluster()) return;

    this.totalColumn = this.getTotalColumn(data);

    const sortedMax: number[] = [];
    const densityValues: number[] = [];
    data.forEach((col) => {
      col.cl?.forEach((clItem) => {
        sortedMax.push(Math.abs(clItem.mx));
        if (Number.isFinite(clItem.ct) && clItem.ct !== 0) {
          const density = Math.abs(clItem.q / clItem.ct);
          if (Number.isFinite(density)) {
            densityValues.push(density);
          }
        }
      });
    });

    sortedMax.sort((a, b) => b - a);

    this.maxt1 = sortedMax[0];
    this.maxt2 = sortedMax[Math.min(10, sortedMax.length - 1)];
    if (!Number.isFinite(this.maxt1)) {
      this.maxt1 = 0;
    }
    if (!Number.isFinite(this.maxt2)) {
      this.maxt2 = 0;
    }

    const densBounds = this.getDensityBounds(densityValues);
    this.maxDens = densBounds.maxDens;
    this.minDens = densBounds.minDens;
    this.local = this.getGlobalRenderStats();
  }
}
