namespace StockChart.Model;

public partial class BondMarketSnapshot
{
    public int Id { get; set; }
    public int DictionaryId { get; set; }
    public DateTime ImportedAt { get; set; }
    public string? BoardId { get; set; }
    public string? TradingStatus { get; set; }
    public decimal? PricePctOfPar { get; set; }
    public decimal? PriceRub { get; set; }
    public decimal? YieldPct { get; set; }
    public decimal? DayChangePct { get; set; }
    public decimal? DayVolume { get; set; }
    public long? DayVolumeQty { get; set; }
    public decimal? AccruedInterest { get; set; }
    public decimal? CouponValue { get; set; }
    public DateTime? NextCouponDate { get; set; }
    public DateTime? OfferDate { get; set; }

    public virtual Dictionary? Dictionary { get; set; }
}
