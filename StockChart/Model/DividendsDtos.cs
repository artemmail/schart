namespace StockChart.Model
{
    public class DividendDto
    {
        public string BuyBefore { get; set; } = string.Empty;
        public string RecordDate { get; set; } = string.Empty;
        public decimal Dividend { get; set; }
        public string Yield { get; set; } = string.Empty;
    }

    public class DividendsResponse
    {
        public string Ticker { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public List<DividendDto> Dividends { get; set; } = new();
    }
}
