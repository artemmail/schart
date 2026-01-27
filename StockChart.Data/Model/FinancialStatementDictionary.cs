namespace StockChart.Model;

public partial class FinancialStatementDictionary
{
    public int Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public bool IsClickable { get; set; } = true;
    public string ValueType { get; set; } = "number";
    public string? SortGroup { get; set; }
    public bool IsActive { get; set; } = true;
    public string? Tooltip { get; set; }
    public string? Unit { get; set; }

    public virtual ICollection<FinancialStatementEntry> Entries { get; set; } = new List<FinancialStatementEntry>();
}
