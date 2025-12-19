export interface FootPrintRequestParams {
    ticker?: string;
    priceStep?: number;
    startDate?: Date;
    endDate?: Date;
    postmarket?: boolean;
    rperiod?: string;
    period?: number;
  }

  export interface FootPrintRequestParamsNew {
    ticker?: string;
    priceStep?: number;
    startDate?: Date;
    endDate?: Date;
    rperiod?: string;
    period?: number;
    type?: string;
    candlesOnly?: boolean;
  }