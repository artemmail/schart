namespace StockProject.PortfolioOptimization
{
    using System.Collections.Generic;

    internal sealed class PortfolioOptimizationResult
    {
        public double Actual;
        public double StdDev;
        public double[] Mas;

        public PortfolioOptimizationResult(int size)
        {
            Mas = new double[size];
        }
    }

    public enum PortfolioOptimizationMode
    {
        MinVariance = 0,
        MaxReturn = 1,
        MaxSharpe = 2,
    }

    internal sealed class PortfolioOptimizationRequest
    {
        // In MinVariance mode this is target return; in MaxReturn/MaxSharpe this is risk limit (stddev).
        public double RiskParameter { get; set; }
        public PortfolioOptimizationMode Mode { get; set; } = PortfolioOptimizationMode.MinVariance;
        public double RiskFreeRate { get; set; }
        public double MinWeight { get; set; }
        public double MaxWeight { get; set; } = 1;
        public int?[] AssetSectorIds { get; set; } = [];
        public IReadOnlyDictionary<int, double> SectorMaxWeights { get; set; } = new Dictionary<int, double>();
        public int FrontierSteps { get; set; } = 24;
    }
}
