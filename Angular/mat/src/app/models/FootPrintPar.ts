export interface FootPrintRequestParams {
  ticker?: string;
  ticker1?: string;
  ticker2?: string;
  priceStep?: number;
  startDate?: Date;
  endDate?: Date;
  postmarket?: boolean;
  rperiod?: string;
  period?: number;
}

export interface FootPrintRequestParamsNew {
  ticker?: string;
  ticker1?: string;
  ticker2?: string;
  priceStep?: number;
  startDate?: Date;
  endDate?: Date;
  rperiod?: string;
  period?: number;
  type?: string;
  candlesOnly?: boolean;
}
