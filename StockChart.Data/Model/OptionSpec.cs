namespace StockChart.Model;

public partial class OptionSpec
{
    public int DictionaryId { get; set; }
    public string? AssetCode { get; set; }
    public string? OptionType { get; set; }
    public decimal? Strike { get; set; }
    public DateTime? ExpirationDate { get; set; }
    public int? LotSize { get; set; }
    public DateTime UpdatedAt { get; set; }

    public virtual Dictionary? Dictionary { get; set; }
}
