using System;

namespace StockChart.Model;

public sealed record VolumeDashboardRow(
    string name,
    string ticker,
    decimal volume1Day,
    decimal avg3Days,
    decimal avg7Days,
    decimal avg30Days,
    decimal avg90Days,
    decimal avg180Days,
    decimal avg365Days);

public class AliasResult
{
    public string SECURITYID { get; set; }
}

public class candleseekerResult
{
    public decimal? huge { get; set; }
    public decimal? max { get; set; }
    public decimal? avgval { get; set; }
    public string ticker { get; set; }
    public string name { get; set; }
    public decimal cls { get; set; }
}

public class ClusterProfileNewResult
{
    public DateTime period { get; set; }
    public decimal price { get; set; }
    public decimal quantity { get; set; }
    public decimal buyquantity { get; set; }
    public decimal opnprice { get; set; }
    public decimal clsprice { get; set; }
    public decimal minprice { get; set; }
    public decimal maxprice { get; set; }
    public int oi { get; set; }
    public int count { get; set; }
    public decimal maxtrade { get; set; }
}

public class ClusterProfileResult
{
    public DateTime period { get; set; }
    public decimal price { get; set; }
    public decimal quantity { get; set; }
    public decimal buyquantity { get; set; }
    public int count { get; set; }
    public decimal maxtrade { get; set; }
}

public class LastTradingDateProcResult
{
    public DateTime period { get; set; }
}

public class MarketMapPeriod4Result
{
    public int Id { get; set; }
    public decimal Opn { get; set; }
    public decimal Cls { get; set; }
    public decimal Volume { get; set; }
    public decimal BuyVolume { get; set; }
}

public class MicexVolYearResult
{
    public decimal? Volume { get; set; }
    public decimal? BuyVolume { get; set; }
    public DateTime Date { get; set; }
}

public class tickersResult
{
    public long Number { get; set; }
    public DateTime TradeDate { get; set; }
    public decimal Price { get; set; }
    public int Quantity { get; set; }
    public Byte Direction { get; set; }
    public decimal Volume { get; set; }
    public int OI { get; set; }
}

public class tickersdatesResult
{
    public DateTime period { get; set; }
}

public class TopOrdersResult
{
    public DateTime tradeDate { get; set; }
    public decimal price { get; set; }
    public int quantity { get; set; }
    public decimal volume { get; set; }
    public Byte direction { get; set; }
}

public class VolumeSearchResult
{
    public DateTime Time { get; set; }
    public decimal Price { get; set; }
    public int MaxVolume { get; set; }
    public int TotalVolume { get; set; }
    public int BarSize { get; set; }
    public int Trades { get; set; }
    public int Ask { get; set; }
    public int Bid { get; set; }
    public int Delta { get; set; }
}
