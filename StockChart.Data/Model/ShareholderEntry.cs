namespace StockChart.Model;

public partial class ShareholderEntry
{
    public int Id { get; set; }
    public int SnapshotId { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal SharePercentage { get; set; }
    public int SortOrder { get; set; }

    public virtual ShareholderSnapshot? Snapshot { get; set; }
}
