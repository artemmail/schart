import { Cluster, Column, ColumnEx } from 'src/app/models/Column';

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
  local: any;
  ColumnNumberByDate: Record<string, number> = {};
  maxPrice: number;
  minPrice: number;

  totalColumn: ColumnEx | any;
  maxt1: number;
  maxt2: number;

  constructor(data: any) {
    this.lastPrice = data.clusterData[data.clusterData.length - 1].c;
    this.priceScale = data.priceScale;

    this.volumePerQuantity =
      data.VolumePerQuantity ??
      (data.clusterData[0]?.v / (data.clusterData[0]?.q * data.clusterData[0]?.c)) ??
      1;

    this.clusterData = data.clusterData;

    this.calcPrices();
  }

  isWrongMerge(data: ClusterData): boolean {
    return (
      this.clusterData[this.clusterData.length - 1].x < data.clusterData[0].x
    );
  }

  public handleCluster(answ: any): boolean {
    try {
      answ.forEach((value: any) => {
        value.x = new Date(value.x);
      });

      const data = { clusterData: answ } as ClusterData;
      if (this.isWrongMerge(data)) {
        // Handle wrong merge if necessary
        return false;
      } else {
        return this.mergeData(data);
      }
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

    return this.mergeData(data);
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

  mergeData(data: ClusterData): boolean {
    if (data.clusterData.length > 0) {
        // Sort data.clusterData before using it
        data.clusterData.sort((a, b) => a.x.getTime() - b.x.getTime());
        this.lastPrice = data.clusterData[data.clusterData.length - 1].c;
    }

    if (
        data.clusterData.length > 0 &&
        this.clusterData.length > 0 &&
        this.clusterData[this.clusterData.length - 1].hasOwnProperty('Number')
    ) {
        // Ensure data.clusterData is sorted by Number
        data.clusterData.sort((a, b) => a.Number - b.Number);

        while (
            this.clusterData.length &&
            this.clusterData[this.clusterData.length - 1].Number >=
                data.clusterData[0].Number
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
                existingDataMap.set(time, newCandle);
            } else {
                if (existingCandle.q < newCandle.q) {
                    existingDataMap.set(time, newCandle);
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

  addColumnInfo(col: Column): ColumnEx {
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
    const cs = columns[start];
    this.local = {
      qntMax: cs.qntMax,
      qntAskMax: cs.qntAskMax,
      qntBidMax: cs.qntBidMax,
      volMax: cs.volMax,
      volAskMax: cs.volAskMax,
      volBidMax: cs.volBidMax,
      maxDelta: cs.maxDelta,
      maxDeltaV: cs.maxDeltaV,
      q: cs.q,
      bq: cs.bq,
      sq: cs.sq,
      v: cs.v,
      bv: cs.bv,
      sv: cs.v - cs.bv,
      maxPrice: cs.h,
      minPrice: columns[end].l,
      maxOI: cs.oi,
      minOI: columns[end].oi,
      minCumDelta: cs.cumDelta,
      maxCumDelta: columns[end].cumDelta,
      minOIDelta: cs.oiDelta,
      maxOIDelta: columns[end].oiDelta,
      minDeltaBar: 2 * cs.bq - cs.q,
      maxDeltaBar: 2 * cs.bq - cs.q,
      maxDens: 0,
    };

    for (let i = start; i <= end; i++) {
      const col = columns[i];
      this.local.qntMax = Math.max(col.qntMax!, this.local.qntMax);
      this.local.qntAskMax = Math.max(col.qntAskMax!, this.local.qntAskMax);
      this.local.qntBidMax = Math.max(col.qntBidMax!, this.local.qntBidMax);
      this.local.volMax = Math.max(col.volMax!, this.local.volMax);
      this.local.volAskMax = Math.max(col.volAskMax!, this.local.volAskMax);
      this.local.volBidMax = Math.max(col.volBidMax!, this.local.volBidMax);
      this.local.maxDelta = Math.max(col.maxDelta!, this.local.maxDelta);
      this.local.maxDeltaV = Math.max(col.maxDeltaV!, this.local.maxDeltaV);
      this.local.q = Math.max(col.q, this.local.q);
      this.local.bq = Math.max(col.bq, this.local.bq);
      this.local.sq = Math.max(col.sq!, this.local.sq);
      this.local.v = Math.max(col.v, this.local.v);
      this.local.bv = Math.max(col.bv, this.local.bv);
      this.local.sv = Math.max(col.sv!, this.local.sv);
      this.local.minPrice = Math.min(this.local.minPrice, col.l);
      this.local.maxPrice = Math.max(this.local.maxPrice, col.h);
      this.local.minCumDelta = Math.min(this.local.minCumDelta, col.cumDelta!);
      this.local.maxCumDelta = Math.max(this.local.maxCumDelta, col.cumDelta!);
      this.local.minOIDelta = Math.min(this.local.minOIDelta, col.oiDelta!);
      this.local.maxOIDelta = Math.max(this.local.maxOIDelta, col.oiDelta!);
      this.local.minDeltaBar = Math.min(
        this.local.minDeltaBar,
        2 * col.bq - col.q
      );
      this.local.maxDeltaBar = Math.max(
        this.local.maxDeltaBar,
        2 * col.bq - col.q
      );
      this.local.minOI = Math.min(this.local.minOI, col.oi);
      this.local.maxOI = Math.max(this.local.maxOI, col.oi);

      col.cl?.forEach((clItem) => {
        this.local.maxDens = Math.max(
          this.local.maxDens,
          Math.abs(clItem.q / clItem.ct)
        );
      });
    }
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
    this.ColumnNumberByDate = {};

    for (let i = 0; i < data.length; i++) {
      data[i] = this.addColumnInfo(data[i]);
      if (i === 0) {
        data[i].cumDelta = data[i].deltaTotal ?? 0;
        data[i].oiDelta = 0;
      } else {
        data[i].cumDelta =
          (data[i].deltaTotal ?? 0) + (data[i - 1].cumDelta ?? 0);
        data[i].oiDelta = (data[i].oi - data[i - 1].oi) / 2;
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
    const sortedAvg: number[] = [];
    data.forEach((col) => {
      col.cl?.forEach((clItem) => {
        sortedMax.push(Math.abs(clItem.mx));
        sortedAvg.push(Math.abs(clItem.q / clItem.ct));
      });
    });

    sortedMax.sort((a, b) => b - a);
    sortedAvg.sort((a, b) => b - a);

    this.maxt1 = sortedMax[0];
    this.maxt2 = sortedMax[Math.min(10, sortedMax.length - 1)];

    const r = Math.min(sortedAvg.length, 8);
    const rr =
      sortedAvg.slice(0, r).reduce((sum, val) => sum + val, 0) / r;
    const rr2 =
      sortedAvg
        .slice(sortedAvg.length - r - 1, sortedAvg.length - 1)
        .reduce((sum, val) => sum + val, 0) / r;

    this.maxDens = rr;
    this.minDens = rr2;
  }
}
