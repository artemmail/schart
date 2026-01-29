namespace StockChart.Model;

public partial class FutureSpec
{
    public int DictionaryId { get; set; }
    public string? AssetCode { get; set; }
    public DateTime? ExpirationDate { get; set; }
    public int? LotSize { get; set; }
    public decimal? MinStep { get; set; }
    public decimal? StepPrice { get; set; }
    public DateTime UpdatedAt { get; set; }

    public virtual Dictionary? Dictionary { get; set; }
}
