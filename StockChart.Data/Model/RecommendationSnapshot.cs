namespace StockChart.Model;

public partial class RecommendationSnapshot
{
    public int Id { get; set; }
    public int DictionaryId { get; set; }
    public DateTime ImportedAt { get; set; }

    public virtual Dictionary? Dictionary { get; set; }
    public virtual ICollection<RecommendationReason> Reasons { get; set; } = new List<RecommendationReason>();
}
