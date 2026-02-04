namespace StockChart.Model;

public partial class BondCoupon
{
    public int Id { get; set; }
    public int DictionaryId { get; set; }
    public int? Number { get; set; }
    public DateTime? CouponDate { get; set; }
    public decimal? CouponValue { get; set; }
    public decimal? CouponYieldPct { get; set; }
    public decimal? PercentOfPar { get; set; }
    public decimal? PercentOfMarket { get; set; }

    public virtual Dictionary? Dictionary { get; set; }
}
