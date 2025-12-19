using System;

namespace StockChart.Model;

public class MissingIntervalWithTrades
{
    public DateTime MissingStart { get; set; }
    public DateTime MissingEnd { get; set; }
    public long? BeforeGapTradeNumber { get; set; }
    public DateTime? BeforeGapTradeDate { get; set; }
    public long? AfterGapTradeNumber { get; set; }
    public DateTime? AfterGapTradeDate { get; set; }
}
