export interface Barometer {
    ticker: string;
    tickerName: string;
    rec1: number;
    rec2: number;
    rec3:  number;
    opn: number;
  }

  export interface TopOrdersResult {
    tradeDate: Date;
    price: number;
    quantity: number;
    volume: number;
    Direction: number;
  }
  
  export interface candleseekerResult {
    huge?: number;
    max?: number;
    avgval?: number;
    ticker: string;
    name: string;
    news: string;
    cls: number;
  }
  
  export interface ReportLeader {
    ticker: string;
    name: string;
    opn: number;
    cls: number;
    percent: number;
    volume: number;
    bid: number;
    color: string;
  }
  
  export interface MicexVolYearResult {
    Volume?: number;
    BuyVolume?: number;
    Date: Date;
  }
  
