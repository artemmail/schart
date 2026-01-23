namespace StockChart.Model;

public enum RecommendationDirection : byte
{
    Up = 1,
    Down = 2
}

public partial class RecommendationReason
{
    public int Id { get; set; }
    public int SnapshotId { get; set; }
    public RecommendationDirection Direction { get; set; }
    public string Text { get; set; } = string.Empty;
    public int SortOrder { get; set; }

    public virtual RecommendationSnapshot? Snapshot { get; set; }
}
