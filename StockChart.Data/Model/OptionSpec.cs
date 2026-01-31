namespace StockChart.Model;

public partial class OptionSpec
{
    public int DictionaryId { get; set; }
    public string? AssetCode { get; set; }
    public string? OptionType { get; set; }
    public string? BoardId { get; set; }
    public decimal? Strike { get; set; }
    public decimal? TheorPrice { get; set; }
    public decimal? Volat { get; set; }
    public decimal? Last { get; set; }
    public decimal? Bid { get; set; }
    public decimal? Offer { get; set; }
    public long? VolToday { get; set; }
    public long? OpenPosition { get; set; }
    public decimal? UnderlyingPrice { get; set; }
    public DateTime? ExpirationDate { get; set; }
    public int? LotSize { get; set; }
    public DateTime UpdatedAt { get; set; }

    public virtual Dictionary? Dictionary { get; set; }
}
