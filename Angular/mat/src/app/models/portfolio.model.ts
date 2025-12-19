
export interface Portfolio {
    ticker: string;
    name: string;
    price?: number;
    quantity?: number;
    currprice?: number;
    buycost?: number;
    nowcost?: number;
    profit?: number;
}

export interface PortfolioComparesResult {
    res1: string;
    res2: string;
}

export interface PortfolioChartItem {
    ticker: string;
    percent: number;
}

export interface PortfolioSolution {
    success: boolean;
    actual: number;
    stddev: number;
    chart: PortfolioChartItem[];
}