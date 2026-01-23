namespace StockChart.Model;

public partial class ShareholderSnapshot
{
    public int Id { get; set; }
    public int DictionaryId { get; set; }
    public DateTime ImportedAt { get; set; }
    public string? Title { get; set; }
    public DateTime? LastUpdateDate { get; set; }

    public virtual Dictionary? Dictionary { get; set; }
    public virtual ICollection<ShareholderEntry> Shareholders { get; set; } = new List<ShareholderEntry>();
}
