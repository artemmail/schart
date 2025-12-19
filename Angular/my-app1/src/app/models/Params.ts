export interface Parameters {
    login?: string;
    ticker?: string;
    period: number;
    priceStep: number;
    startDate: any;
    endDate?: any;
    postmarket?: boolean;
    candlesOnly: boolean;
}