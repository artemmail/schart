namespace StockChart.Repository.Services
{
    public enum PortfolioOptimizationMode
    {
        MinVariance = 0,
        MaxReturn = 1,
        MaxSharpe = 2,
    }

    public static class PortfolioOptimizationModeParser
    {
        public static bool TryParse(string? value, out PortfolioOptimizationMode mode)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                mode = PortfolioOptimizationMode.MinVariance;
                return true;
            }

            var raw = value.Trim();
            if (raw.Equals("min_variance", StringComparison.OrdinalIgnoreCase) ||
                raw.Equals("minvariance", StringComparison.OrdinalIgnoreCase))
            {
                mode = PortfolioOptimizationMode.MinVariance;
                return true;
            }

            if (raw.Equals("max_return", StringComparison.OrdinalIgnoreCase) ||
                raw.Equals("maxreturn", StringComparison.OrdinalIgnoreCase))
            {
                mode = PortfolioOptimizationMode.MaxReturn;
                return true;
            }

            if (raw.Equals("max_sharpe", StringComparison.OrdinalIgnoreCase) ||
                raw.Equals("maxsharpe", StringComparison.OrdinalIgnoreCase))
            {
                mode = PortfolioOptimizationMode.MaxSharpe;
                return true;
            }

            return Enum.TryParse(raw, ignoreCase: true, out mode);
        }
    }

    public sealed class PortfolioOptimizationRequestOptions
    {
        public PortfolioOptimizationMode Mode { get; set; } = PortfolioOptimizationMode.MinVariance;
        public decimal RiskFreeRate { get; set; } = 0m;
        public decimal? MinWeight { get; set; }
        public decimal? MaxWeight { get; set; }
        public IReadOnlyDictionary<int, decimal> SectorMaxWeights { get; set; } = new Dictionary<int, decimal>();
    }
}
