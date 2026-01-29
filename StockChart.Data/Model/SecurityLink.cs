namespace StockChart.Model;

public partial class SecurityLink
{
    public int FromDictionaryId { get; set; }
    public int ToDictionaryId { get; set; }
    public byte LinkType { get; set; }
    public string Source { get; set; } = null!;
    public DateTime UpdatedAt { get; set; }

    public virtual Dictionary? FromDictionary { get; set; }
    public virtual Dictionary? ToDictionary { get; set; }
}
