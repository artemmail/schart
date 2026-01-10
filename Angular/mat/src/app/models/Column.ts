export interface Cluster {
  p: number;
  q: number;
  bq: number;
  ct: number;
  mx: number;
}

export interface Tick {
  Number: number;
  TradeDate: Date;
  Price: number;
  Quantity: number;
  Direction: number;
  Volume: number;
  OI: number;
}

export interface Column {
  Number: number;
  x: Date;
  o: number;
  c: number;
  l: number;
  h: number;
  q: number;
  bq: number;
  v: number;
  bv: number;
  oi: number;
  cl: Array<Cluster>;
}

export interface ColumnEx extends Column {
  sq: number;
  sv: number;
  deltaTotal: number;
  qntMax: number;
  qntAskMax: number;
  qntBidMax: number;
  volMax: number;
  volAskMax: number;
  volBidMax: number;
  maxDelta: number;
  maxDeltaV: number;
  minCumDelta: number;
  minOIDelta: number;
  maxCumDelta: number;
  maxOIDelta: number;
  cumDelta: number;
  oiDelta: number;
  oiRaw?: number;
}
