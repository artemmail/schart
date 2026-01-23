namespace StockChart.Model;

public partial class FinancialStatementDictionary
{
    public int Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
}
