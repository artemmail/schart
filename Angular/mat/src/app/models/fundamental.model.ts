export interface DataItem {
    name: string;
    year: string;
    value: string;
  }
  
  // Новый тип данных для фильтрованных данных без поля name
  export interface FilteredDataItem {
    year: string;
    value: number;
  }
  
  export interface Recommendation {
    ReasonsUp: string[];
    ReasonsDown: string[];
  }
  
  export interface Dividend {
    BuyBefore: string;
    RecordDate: string;
    Dividend: number;
    Yield: string;
  }
  
  export interface StockData {
    Ticker: string;
    Title: string;
    Description: string;
    Dividends: Dividend[];
  }
  
  export interface Shareholder {
    Name: string;
    SharePercentage: number;
  }
  
  export interface ShareholdersStructure {
    Title: string;
    LastUpdateDate: string;
    Shareholders: Shareholder[];
  }
  export interface FilteredDataResult {
    filteredData: FilteredDataItem[];
    displayName: string;
  }

  export interface OpenPosition {
    Id: number;
    Date: Date;
    JuridicalLong: number;
    JuridicalShort: number;
    PhysicalLong: number;
    PhysicalShort: number;
    JuridicalLongDelta: number;
    JuridicalShortDelta: number;
    PhysicalLongDelta: number;
    PhysicalShortDelta: number;
    JuridicalLongCount: number;
    JuridicalShortCount: number;
    PhysicalLongCount: number;
    PhysicalShortCount: number;
    ContractName: string;
  }
  
  export interface Contract {
    name: string;
  }
  