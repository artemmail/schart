namespace StockChart.Model;

public partial class BondSpec
{
    public int DictionaryId { get; set; }
    public string? Isin { get; set; }
    public string? RegNumber { get; set; }
    public DateTime? PlacementDate { get; set; }
    public DateTime? MaturityDate { get; set; }
    public DateTime? OfferDate { get; set; }
    public DateTime? NextCouponDate { get; set; }
    public decimal? FaceValue { get; set; }
    public decimal? CouponValue { get; set; }
    public int? CouponPeriodDays { get; set; }
    public decimal? CouponRate { get; set; }
    public string? CouponType { get; set; }
    public decimal? AccruedInterest { get; set; }
    public string? Currency { get; set; }
    public string? PrimaryBoardId { get; set; }
    public long? IssueSize { get; set; }
    public long? IssueSizePlaced { get; set; }
    public int? ListingLevel { get; set; }
    public bool? QualifiedOnly { get; set; }
    public DateTime UpdatedAt { get; set; }

    public virtual Dictionary? Dictionary { get; set; }
}
