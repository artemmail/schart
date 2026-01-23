namespace StockChart.Model;

public partial class DividendsMoexUpdateLog
{
    public int Id { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string? Failed { get; set; }
    public string? Succ { get; set; }
}
