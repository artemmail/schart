namespace StockChart.Model;

public partial class FinancialStatementEntry
{
    public int Id { get; set; }
    public int DictionaryId { get; set; }
    public string Standard { get; set; } = string.Empty;
    public string Period { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Year { get; set; } = string.Empty;
    public string? ValueRaw { get; set; }
    public decimal? ValueNum { get; set; }
    public int SortOrder { get; set; }
    public DateTime ImportedAt { get; set; }

    public virtual Dictionary? Dictionary { get; set; }
}
