namespace StockChart.Model;

public partial class UnderlyingMap
{
    public string AssetCode { get; set; } = null!;
    public string SpotSecId { get; set; } = null!;
    public DateTime UpdatedAt { get; set; }
}
