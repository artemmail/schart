namespace StockChart.Model;

public partial class OptionMarketSnapshot
{
    public int Id { get; set; }
    public int DictionaryId { get; set; }
    public DateTime ImportedAt { get; set; }
    public string? BoardId { get; set; }
    public string? OptionType { get; set; }
    public decimal? Strike { get; set; }
    public decimal? TheorPrice { get; set; }
    public decimal? Volat { get; set; }
    public decimal? Last { get; set; }
    public decimal? Bid { get; set; }
    public decimal? Offer { get; set; }
    public long? VolToday { get; set; }
    public long? OpenPosition { get; set; }
    public decimal? UnderlyingPrice { get; set; }

    public virtual Dictionary? Dictionary { get; set; }
}
