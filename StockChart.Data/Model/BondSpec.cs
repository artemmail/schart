namespace StockChart.Model;

public partial class BondSpec
{
    public int DictionaryId { get; set; }
    public string? Isin { get; set; }
    public string? RegNumber { get; set; }
    public DateTime? MaturityDate { get; set; }
    public decimal? FaceValue { get; set; }
    public string? Currency { get; set; }
    public string? PrimaryBoardId { get; set; }
    public DateTime UpdatedAt { get; set; }

    public virtual Dictionary? Dictionary { get; set; }
}
