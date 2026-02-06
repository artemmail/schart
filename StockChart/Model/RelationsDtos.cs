namespace StockChart.Model
{
    public sealed class InstrumentRelationItemDto
    {
        public int DictionaryId { get; set; }
        public string SecurityId { get; set; } = string.Empty;
        public string? Shortname { get; set; }
        public byte? Market { get; set; }
        public string? Isin { get; set; }
        public string? RegNumber { get; set; }
        public DateTime? MaturityDate { get; set; }
        public decimal? FaceValue { get; set; }
        public string? Currency { get; set; }
        public bool? IsCouponed { get; set; }
        public DateTime? NextCouponDate { get; set; }
        public string? PrimaryBoardId { get; set; }
        public decimal? CurrentYield { get; set; }
        public decimal? CurrentPrice { get; set; }
    }

    public sealed class InstrumentRelationsDto
    {
        public InstrumentRelationItemDto Stock { get; set; } = new();
        public List<InstrumentRelationItemDto> Bonds { get; set; } = new();
        public List<InstrumentRelationItemDto> Futures { get; set; } = new();
        public List<InstrumentRelationItemDto> Options { get; set; } = new();
    }
}
