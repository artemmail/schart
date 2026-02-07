namespace StockChart.Model;

public partial class MoexSecurityType
{
    public int Id { get; set; }
    public string? Name { get; set; }
    public string? Title { get; set; }
    public DateTime UpdatedAt { get; set; }
}
