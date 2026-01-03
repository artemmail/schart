export interface CandlesRangeSetParams {
  ticker?: string;
  ticker1?: string;
  ticker2?: string;
  rperiod?: string;
  startDate?: Date;
  endDate?: Date;
  startTime?: string;
  endTime?: string;
  from_stamp?: string;
  packed?: boolean;
  count?: number;
  period?: number;
  timeEnable?: boolean;
}

export interface CandlesRangeSetValue {
  Min?: number;
  Max?: number;
  Opn?: number;
  Cls?: number;
  Vol?: number;
  Qnt?: number;
  Bid?: number;
  OpIn?: number;
  Date?: number;
  Price1?: number;
  Price2?: number;
}
