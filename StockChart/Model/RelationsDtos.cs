namespace StockChart.Model
{
    public sealed class InstrumentRelationItemDto
    {
        public int DictionaryId { get; set; }
        public string SecurityId { get; set; } = string.Empty;
        public string? Shortname { get; set; }
        public byte? Market { get; set; }
        public string? Isin { get; set; }
    }

    public sealed class InstrumentRelationsDto
    {
        public InstrumentRelationItemDto Stock { get; set; } = new();
        public List<InstrumentRelationItemDto> Bonds { get; set; } = new();
        public List<InstrumentRelationItemDto> Futures { get; set; } = new();
        public List<InstrumentRelationItemDto> Options { get; set; } = new();
    }
}
