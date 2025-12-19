// foot-print-request-model.ts

import { DateField } from './../interceptors/date-field.decorator'
export interface FootPrintRequestModel {
  rperiod: string;
  startDate: Date;
  endDate: Date;
  period: number;
  priceStep: number;
}

export class TickerPreset {
  public type: string;
  public ticker: string;
  public periods: any;
  public rperiods: any;
  public period: number;
  public rperiod: string;
  public startDate: Date;
  public endDate: Date;
  public timeEnable: boolean;
  public startTime: string;
  public endTime: string;
  public minStep: number;
  public priceStep: number | null;
  public presetList: FootPrintRequestModel[];
}


export class TickerPresetNew {
  ticker: string;
  period: number;
  rperiod: string;
  @DateField()
  startDate: Date;
  @DateField()
  endDate: Date;
  minStep: number;
  priceStep: number;
  candlesOnly: boolean;
}