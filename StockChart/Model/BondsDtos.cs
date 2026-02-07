namespace StockChart.Model;

public sealed class BondsListRequestDto
{
    public string Tab { get; set; } = "all";
    public decimal? YieldMin { get; set; }
    public decimal? YieldMax { get; set; }
    public decimal? DurationMin { get; set; }
    public decimal? DurationMax { get; set; }
    public decimal? YearsToMaturityMin { get; set; }
    public decimal? YearsToMaturityMax { get; set; }
    public bool? QualifiedOnly { get; set; }
    public List<string>? MoexType { get; set; }
    public List<int>? CouponFreq { get; set; }
    public string OrderBy { get; set; } = "yieldPct";
    public string Dir { get; set; } = "desc";
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 50;
    public string MapMode { get; set; } = "yield_by_duration";
}

public sealed class BondMoexTypeOptionDto
{
    public string Key { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
}

public sealed class BondListResponseDto
{
    public int Total { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public List<BondListItemDto> Items { get; set; } = new();
    public List<BondMapPointDto> MapPoints { get; set; } = new();
    public BondFacetsDto Facets { get; set; } = new();
}

public sealed class BondListItemDto
{
    public int DictionaryId { get; set; }
    public string SecId { get; set; } = string.Empty;
    public string? ShortName { get; set; }
    public string? Isin { get; set; }
    public string? RegNumber { get; set; }
    public string? BondClass { get; set; }
    public string? MoexType { get; set; }
    public string? MoexTypeTitle { get; set; }
    public string? MoexGroup { get; set; }
    public string? Currency { get; set; }
    public bool? IsForeignCurrency { get; set; }
    public bool? QualifiedOnly { get; set; }
    public DateTime? MaturityDate { get; set; }
    public DateTime? OfferDate { get; set; }
    public DateTime? NextCouponDate { get; set; }
    public decimal? YearsToMaturity { get; set; }
    public decimal? DurationYears { get; set; }
    public decimal? YieldPct { get; set; }
    public decimal? CouponAnnualYieldPct { get; set; }
    public decimal? PricePctOfPar { get; set; }
    public decimal? PriceRub { get; set; }
    public decimal? AccruedInterest { get; set; }
    public decimal? CouponValue { get; set; }
    public int? CouponPeriodDays { get; set; }
    public int? CouponFrequencyPerYear { get; set; }
    public decimal? DayVolume { get; set; }
    public long? DayVolumeQty { get; set; }
    public string? BoardId { get; set; }
}

public sealed class BondMapPointDto
{
    public int DictionaryId { get; set; }
    public string SecId { get; set; } = string.Empty;
    public string? ShortName { get; set; }
    public decimal? X { get; set; }
    public decimal? Y { get; set; }
    public decimal? PricePctOfPar { get; set; }
    public DateTime? MaturityDate { get; set; }
}

public sealed class BondFacetsDto
{
    public List<BondFacetItemDto> MoexTypes { get; set; } = new();
    public List<BondFacetItemDto> CouponFrequencies { get; set; } = new();
}

public sealed class BondFacetItemDto
{
    public string Key { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public int Count { get; set; }
}

public sealed class BondDetailsResponseDto
{
    public BondDetailsInstrumentDto Instrument { get; set; } = new();
    public BondDetailsSnapshotDto? LastSnapshot { get; set; }
    public List<BondDetailsCouponDto> Coupons { get; set; } = new();
}

public sealed class BondDetailsInstrumentDto
{
    public int DictionaryId { get; set; }
    public string SecId { get; set; } = string.Empty;
    public string? ShortName { get; set; }
    public string? Isin { get; set; }
    public string? RegNumber { get; set; }
    public string? BondClass { get; set; }
    public string? MoexType { get; set; }
    public string? MoexTypeTitle { get; set; }
    public string? MoexGroup { get; set; }
    public string? Currency { get; set; }
    public bool? IsForeignCurrency { get; set; }
    public bool? QualifiedOnly { get; set; }
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
    public string? PrimaryBoardId { get; set; }
    public long? IssueSize { get; set; }
    public long? IssueSizePlaced { get; set; }
    public int? ListingLevel { get; set; }
    public int? EmitentId { get; set; }
    public string? EmitentTitle { get; set; }
    public string? EmitentInn { get; set; }
    public string? IssuerStockSecId { get; set; }
    public string? IssuerStockShortName { get; set; }
}

public sealed class BondDetailsSnapshotDto
{
    public DateTime ImportedAt { get; set; }
    public string? BoardId { get; set; }
    public string? TradingStatus { get; set; }
    public string? PriceUnit { get; set; }
    public string? CurrencyId { get; set; }
    public decimal? PricePctOfPar { get; set; }
    public decimal? PriceRub { get; set; }
    public decimal? YieldPct { get; set; }
    public decimal? DayChangePct { get; set; }
    public decimal? DayVolume { get; set; }
    public long? DayVolumeQty { get; set; }
    public decimal? AccruedInterest { get; set; }
    public decimal? CouponValue { get; set; }
    public DateTime? NextCouponDate { get; set; }
    public DateTime? OfferDate { get; set; }
}

public sealed class BondDetailsCouponDto
{
    public int? Number { get; set; }
    public DateTime? CouponDate { get; set; }
    public decimal? CouponValue { get; set; }
    public decimal? CouponYieldPct { get; set; }
    public decimal? PercentOfPar { get; set; }
    public decimal? PercentOfMarket { get; set; }
}
