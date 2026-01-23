namespace StockChart.Model;

public partial class FinancialStatementSnapshot
{
    public int Id { get; set; }
    public int DictionaryId { get; set; }
    public string Standard { get; set; } = string.Empty;
    public string Period { get; set; } = string.Empty;
    public string? Mode { get; set; }
    public DateTime ImportedAt { get; set; }

    public virtual Dictionary? Dictionary { get; set; }
    public virtual ICollection<FinancialStatementEntry> Entries { get; set; } = new List<FinancialStatementEntry>();
}
