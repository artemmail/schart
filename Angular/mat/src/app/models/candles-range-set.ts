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
  Date: Date;
  Price1: number;
  Price2: number;
  Price1normalized: number;
  Price2normalized: number;
  columnIndex: number;
}
