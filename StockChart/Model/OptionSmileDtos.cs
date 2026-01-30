using System;
using System.Collections.Generic;

namespace StockChart.Model
{
    public sealed class OptionSmilePoint
    {
        public string SecurityId { get; set; } = string.Empty;
        public string? OptionType { get; set; }
        public string? BoardId { get; set; }
        public decimal? Strike { get; set; }
        public decimal? ImpliedVolatility { get; set; }
        public decimal? TheorPrice { get; set; }
        public decimal? Last { get; set; }
        public decimal? Bid { get; set; }
        public decimal? Offer { get; set; }
        public long? VolToday { get; set; }
        public long? OpenPosition { get; set; }
    }

    public sealed class OptionSmileResponse
    {
        public string AssetCode { get; set; } = string.Empty;
        public DateTime ExpirationDate { get; set; }
        public DateTime? AsOf { get; set; }
        public List<OptionSmilePoint> Points { get; set; } = new();
    }
}
