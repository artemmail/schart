namespace StockProject.PortfolioOptimization
{
    using Accord.Math.Optimization;
    using StockChart.Model;
    using System;
    using System.Collections.Generic;
    using System.Linq;

    internal class MarkowitzPortfolioAccord
    {
        public string[] StockNames = [];
        private double[] _means = [];
        private double[,] _covariance = new double[0, 0];

        public PortfolioOptimizationResult? BuildCovariance(List<List<Candle>> candlesByTicker, double risk)
        {
            return BuildCovariance(candlesByTicker, new PortfolioOptimizationRequest
            {
                Mode = PortfolioOptimizationMode.MinVariance,
                RiskParameter = risk,
            });
        }

        public PortfolioOptimizationResult? BuildCovariance(List<List<Candle>> candlesByTicker, PortfolioOptimizationRequest request)
        {
            BuildCovarianceDouble(CandlesToReturns(candlesByTicker));
            return BuildRiskModel(request);
        }

        private static double[][] CandlesToReturns(List<List<Candle>> candlesByTicker)
        {
            if (candlesByTicker == null || candlesByTicker.Count == 0)
                return [];

            int min = candlesByTicker.Min(x => x.Count);
            if (min < 2)
                return [];

            var returns = new double[candlesByTicker.Count][];
            for (int i = 0; i < candlesByTicker.Count; i++)
            {
                returns[i] = new double[min - 1];
                for (int j = 0; j < min - 1; j++)
                    returns[i][j] = (double)(candlesByTicker[i][j + 1].ClsPrice / candlesByTicker[i][j].ClsPrice - 1);
            }

            return returns;
        }

        private void BuildCovarianceDouble(double[][] historicalData)
        {
            int m = StockNames.Length;
            if (m == 0 || historicalData.Length == 0 || historicalData[0].Length == 0)
            {
                _means = [];
                _covariance = new double[0, 0];
                return;
            }

            int n = historicalData[0].Length;
            _means = new double[m];
            _covariance = new double[m, m];

            for (int invest = 0; invest < m; invest++)
            {
                double sum = 0;
                for (int t = 0; t < n; t++)
                    sum += historicalData[invest][t];
                _means[invest] = sum / n;
            }

            for (int invest = 0; invest < m; invest++)
            {
                for (int jnvest = 0; jnvest < m; jnvest++)
                {
                    double crossCor = 0;
                    for (int t = n; 0 <= --t;)
                        crossCor += historicalData[invest][t] * historicalData[jnvest][t];
                    _covariance[invest, jnvest] = crossCor / n - _means[invest] * _means[jnvest];
                }
            }
        }

        public PortfolioOptimizationResult? BuildRiskModel(PortfolioOptimizationRequest request)
        {
            int m = StockNames.Length;
            if (m == 0 || _means.Length != m || _covariance.GetLength(0) != m || _covariance.GetLength(1) != m)
                return null;
            if (request == null)
                return null;
            if (!HasValidWeightBounds(m, request.MinWeight, request.MaxWeight))
                return null;

            return request.Mode switch
            {
                PortfolioOptimizationMode.MinVariance => SolveMinVariance(request.RiskParameter, request),
                PortfolioOptimizationMode.MaxReturn => SolveMaxReturn(request.RiskParameter, request),
                PortfolioOptimizationMode.MaxSharpe => SolveMaxSharpe(request.RiskParameter, request),
                _ => null,
            };
        }

        private PortfolioOptimizationResult? SolveMinVariance(double targetReturn, PortfolioOptimizationRequest request)
        {
            var weights = SolveWithRegularization(targetReturn, request);
            if (weights == null || weights.Length != StockNames.Length)
                return null;

            NormalizeWeights(weights);
            var solved = new PortfolioOptimizationResult(weights.Length);
            for (int i = 0; i < weights.Length; i++)
                solved.Mas[i] = weights[i];
            solved.Actual = Dot(weights, _means);
            solved.StdDev = Math.Sqrt(Math.Max(0, Quadratic(weights, _covariance)));
            return solved;
        }

        private PortfolioOptimizationResult? SolveMaxReturn(double stdDevLimit, PortfolioOptimizationRequest request)
        {
            if (stdDevLimit <= 0)
                return null;

            const double tolerance = 1e-9;
            double low = _means.Min();
            double high = _means.Max();

            var best = SolveMinVariance(low, request);
            if (best == null || best.StdDev > stdDevLimit + tolerance)
                return null;

            for (int i = 0; i < Math.Max(12, request.FrontierSteps + 8); i++)
            {
                double mid = (low + high) / 2.0;
                var candidate = SolveMinVariance(mid, request);
                if (candidate != null && candidate.StdDev <= stdDevLimit + tolerance)
                {
                    best = candidate;
                    low = mid;
                }
                else
                {
                    high = mid;
                }
            }

            return best;
        }

        private PortfolioOptimizationResult? SolveMaxSharpe(double stdDevLimit, PortfolioOptimizationRequest request)
        {
            if (stdDevLimit <= 0)
                return null;

            double minTarget = _means.Min();
            double maxTarget = _means.Max();
            if (maxTarget <= minTarget)
                return SolveMinVariance(minTarget, request);

            int steps = Math.Max(12, request.FrontierSteps);
            PortfolioOptimizationResult? best = null;
            double bestSharpe = double.NegativeInfinity;
            const double epsilon = 1e-12;

            for (int i = 0; i <= steps; i++)
            {
                double target = minTarget + (maxTarget - minTarget) * i / steps;
                var candidate = SolveMinVariance(target, request);
                if (candidate == null || candidate.StdDev <= epsilon || candidate.StdDev > stdDevLimit + epsilon)
                    continue;

                double sharpe = (candidate.Actual - request.RiskFreeRate) / candidate.StdDev;
                if (sharpe > bestSharpe)
                {
                    bestSharpe = sharpe;
                    best = candidate;
                }
            }

            return best ?? SolveMaxReturn(stdDevLimit, request);
        }

        private double[]? SolveWithRegularization(double targetReturn, PortfolioOptimizationRequest request)
        {
            double[] diagonalJitters = [0d, 1e-12, 1e-10, 1e-8, 1e-6];
            foreach (var jitter in diagonalJitters)
            {
                if (TrySolve(targetReturn, request, jitter, out var weights))
                    return weights;
            }

            return null;
        }

        private bool TrySolve(double targetReturn, PortfolioOptimizationRequest request, double diagonalJitter, out double[] weights)
        {
            weights = [];

            try
            {
                int m = StockNames.Length;
                var quadratic = BuildSymmetricQuadratic(_covariance, diagonalJitter);
                var linear = new double[m];
                var names = Enumerable.Range(0, m).Select(i => $"w{i}").ToArray();

                var function = new QuadraticObjectiveFunction(quadratic, linear, names);
                var constraints = new List<LinearConstraint>(2 + 2 * m + (request.SectorMaxWeights?.Count ?? 0));

                constraints.Add(new LinearConstraint(Enumerable.Repeat(1d, m).ToArray())
                {
                    ShouldBe = ConstraintType.EqualTo,
                    Value = 1,
                });

                constraints.Add(new LinearConstraint((double[])_means.Clone())
                {
                    ShouldBe = ConstraintType.GreaterThanOrEqualTo,
                    Value = targetReturn,
                });

                for (int i = 0; i < m; i++)
                {
                    var bound = new double[m];
                    bound[i] = 1;

                    constraints.Add(new LinearConstraint((double[])bound.Clone())
                    {
                        ShouldBe = ConstraintType.GreaterThanOrEqualTo,
                        Value = request.MinWeight,
                    });

                    constraints.Add(new LinearConstraint((double[])bound.Clone())
                    {
                        ShouldBe = ConstraintType.LesserThanOrEqualTo,
                        Value = request.MaxWeight,
                    });
                }

                AppendSectorConstraints(constraints, request, m);

                var solver = new GoldfarbIdnani(function, constraints)
                {
                    MaxIterations = 0,
                };

                if (!solver.Minimize() || solver.Status != GoldfarbIdnaniStatus.Success)
                    return false;

                if (solver.Solution == null || solver.Solution.Length != m)
                    return false;

                weights = (double[])solver.Solution.Clone();
                return true;
            }
            catch
            {
                return false;
            }
        }

        private static bool HasValidWeightBounds(int assetCount, double minWeight, double maxWeight)
        {
            const double eps = 1e-12;
            if (assetCount <= 0)
                return false;
            if (minWeight < -eps || maxWeight > 1 + eps || minWeight > maxWeight + eps)
                return false;
            if (minWeight * assetCount > 1 + eps)
                return false;
            if (maxWeight * assetCount < 1 - eps)
                return false;
            return true;
        }

        private static double[,] BuildSymmetricQuadratic(double[,] source, double diagonalJitter)
        {
            int n = source.GetLength(0);
            var result = new double[n, n];
            for (int i = 0; i < n; i++)
            {
                for (int j = 0; j < n; j++)
                    result[i, j] = (source[i, j] + source[j, i]) * 0.5;

                result[i, i] += diagonalJitter;
            }

            return result;
        }

        private static void NormalizeWeights(double[] weights)
        {
            double sum = 0;
            for (int i = 0; i < weights.Length; i++)
            {
                if (weights[i] < 0 && weights[i] > -1e-9)
                    weights[i] = 0;
                if (weights[i] > 1 && weights[i] < 1 + 1e-9)
                    weights[i] = 1;
                sum += weights[i];
            }

            if (sum <= 0)
                return;

            for (int i = 0; i < weights.Length; i++)
                weights[i] /= sum;
        }

        private static int?[] GetAssetSectors(PortfolioOptimizationRequest request, int count)
        {
            if (request.AssetSectorIds == null || request.AssetSectorIds.Length != count)
                return new int?[count];
            return request.AssetSectorIds;
        }

        private static void AppendSectorConstraints(List<LinearConstraint> constraints, PortfolioOptimizationRequest request, int assetCount)
        {
            if (request.SectorMaxWeights == null || request.SectorMaxWeights.Count == 0)
                return;

            var sectors = GetAssetSectors(request, assetCount);
            foreach (var kv in request.SectorMaxWeights)
            {
                if (kv.Value < 0 || kv.Value > 1)
                    continue;

                var row = new double[assetCount];
                bool hasAny = false;
                for (int i = 0; i < assetCount; i++)
                {
                    if (sectors[i].HasValue && sectors[i].Value == kv.Key)
                    {
                        row[i] = 1;
                        hasAny = true;
                    }
                }

                if (!hasAny)
                    continue;

                constraints.Add(new LinearConstraint(row)
                {
                    ShouldBe = ConstraintType.LesserThanOrEqualTo,
                    Value = kv.Value,
                });
            }
        }

        private static double Dot(double[] x, double[] y)
        {
            double sum = 0;
            for (int i = 0; i < x.Length; i++)
                sum += x[i] * y[i];
            return sum;
        }

        private static double Quadratic(double[] x, double[,] a)
        {
            double sum = 0;
            int n = x.Length;
            for (int i = 0; i < n; i++)
                for (int j = 0; j < n; j++)
                    sum += x[i] * a[i, j] * x[j];
            return sum;
        }
    }
}
