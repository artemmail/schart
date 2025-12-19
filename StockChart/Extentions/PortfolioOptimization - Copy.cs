/*
using Microsoft.Z3;
using StockChart.Model;
using System;
using System.Collections.Generic;
using System.Linq;

namespace StockProject.PortfolioOptimization
{
    class result
    {
        public double Actual;
        public double StdDev;
        public double[] Mas;
        public result(int size)
        {
            Mas = new double[size];
        }
    }

    class result1
    {
        public double Actual;
        public double StdDev;
        public double[] Mas;

        public result1(int size)
        {
            Mas = new double[size];
        }

        public result1(result source)
        {
            Actual = source.Actual;
            StdDev = source.StdDev;
            Mas = (double[])source.Mas.Clone();
        }
    }

    public static class Z3Extensions
    {
        public static RealExpr MkReal(this Context ctx, double value)
        {
            return ctx.MkReal(value.ToString(System.Globalization.CultureInfo.InvariantCulture));
        }
    }

    internal class MarkowitzPortfolio
    {
        public string[] StockNames = new string[] { };
        private double[] _means;
        private double[,] _covariance;

        public result1 BuildCovariance(List<List<Candle>> res, double risk)
        {
            BuildCovarianceDecimal(can2doub(res));
            return new result1(BuildRiskModel(risk));
        }

        private double[][] can2doub(List<List<Candle>> res)
        {
            int m = res.Count;
            var minLength = res.Min(a => a.Count);

            // Проверяем, есть ли достаточное количество данных
            if (minLength < 2)
            {
                throw new InvalidOperationException("Недостаточно данных для расчёта доходностей.");
            }

            double[][] hdata = new double[m][];
            for (int i = 0; i < m; i++)
            {
                hdata[i] = new double[minLength - 1];
                for (int j = 0; j < minLength - 1; j++)
                {
                    double pricePrev = (double)res[i][j].ClsPrice;
                    double priceCurr = (double)res[i][j + 1].ClsPrice;

                    // Проверяем, что цены положительные и не равны нулю
                    if (pricePrev <= 0 || priceCurr <= 0)
                    {
                        throw new InvalidOperationException($"Обнаружена некорректная цена в данных для тикера {StockNames[i]}.");
                    }

                    // Используем логарифмические доходности для лучшей численной стабильности
                    hdata[i][j] = Math.Log(priceCurr / pricePrev);
                }
            }

            return hdata;
        }

        private void BuildCovarianceDecimal(double[][] historicalData)
        {
            int m = StockNames.Length;
            int n = historicalData[0].Length;
            _means = new double[m];
            _covariance = new double[m, m];

            for (int invest = 0; invest < m; invest++)
            {
                double sum = 0;
                for (int t = 0; t < n; t++)
                {
                    sum += historicalData[invest][t];
                }
                _means[invest] = sum / n;
            }

            for (int invest = 0; invest < m; invest++)
            {
                for (int jnvest = 0; jnvest < m; jnvest++)
                {
                    double crossCor = 0;
                    for (int t = 0; t < n; t++)
                    {
                        crossCor += (historicalData[invest][t] - _means[invest]) * (historicalData[jnvest][t] - _means[jnvest]);
                    }
                    _covariance[invest, jnvest] = crossCor / (n - 1);

                    // Регуляризация диагональных элементов
                    if (invest == jnvest)
                    {
                        _covariance[invest, jnvest] += 1e-6;
                    }
                }
            }
        }

        private result BuildRiskModel(double Minimum)
        {
            int m = StockNames.Length;

            // Проверяем, что минимальный уровень доходности достижим
            double maxReturn = _means.Max();
            if (Minimum > maxReturn)
            {
                throw new InvalidOperationException("Минимальный уровень доходности недостижим с текущими данными.");
            }

            using (Context ctx = new Context())
            {
                Optimize opt = ctx.MkOptimize();
                RealExpr[] allocations = new RealExpr[m];

                // Создание переменных для каждой акции
                for (int invest = 0; invest < m; invest++)
                {
                    allocations[invest] = (RealExpr)ctx.MkConst(StockNames[invest], ctx.RealSort);
                    // Устанавливаем границы для каждой переменной: от 0 до 1
                    opt.Assert(ctx.MkGe(allocations[invest], ctx.MkReal(0)));
                    opt.Assert(ctx.MkLe(allocations[invest], ctx.MkReal(1)));
                }

                // Ограничение на ожидаемую доходность и общий вес инвестиций
                RealExpr expectedReturn = ctx.MkReal(0);
                RealExpr totalAllocation = ctx.MkReal(0);

                for (int invest = 0; invest < m; invest++)
                {
                    expectedReturn = (RealExpr)ctx.MkAdd(expectedReturn, ctx.MkMul(ctx.MkReal(_means[invest]), allocations[invest]));
                    totalAllocation = (RealExpr)ctx.MkAdd(totalAllocation, allocations[invest]);
                }

                // Задание минимального уровня доходности
                opt.Assert(ctx.MkGe(expectedReturn, ctx.MkReal(-1000)));
                // Условие, что сумма вложений должна быть равна 1
                opt.Assert(ctx.MkEq(totalAllocation, ctx.MkReal(1)));

                // Оптимизированный расчет дисперсии
                RealExpr variance = ctx.MkReal(0);
                for (int invest = 0; invest < m; invest++)
                {
                    variance = (RealExpr)ctx.MkAdd(variance, ctx.MkMul(ctx.MkReal(_covariance[invest, invest]), allocations[invest], allocations[invest]));

                    for (int jnvest = invest + 1; jnvest < m; jnvest++)
                    {
                        variance = (RealExpr)ctx.MkAdd(variance, ctx.MkMul(ctx.MkReal(2 * _covariance[invest, jnvest]), allocations[invest], allocations[jnvest]));
                    }
                }

                // Задаем цель минимизации дисперсии
                opt.MkMinimize(variance);

                Params p1 = ctx.MkParams();
                p1.Add("timeout", 5000); // Таймаут 5 секунд
                opt.Parameters = p1;

                try
                {
                    var x = opt.Check();
                    // Проверка решения
                    if (x == Status.SATISFIABLE)
                    {
                        Model model = opt.Model;
                        result p = new result(m);
                        for (int invest = 0; invest < m; invest++)
                        {
                            p.Mas[invest] = double.Parse(model.Evaluate(allocations[invest]).ToString(), System.Globalization.CultureInfo.InvariantCulture);
                        }
                        p.Actual = double.Parse(model.Evaluate(expectedReturn).ToString(), System.Globalization.CultureInfo.InvariantCulture);
                        p.StdDev = Math.Sqrt(double.Parse(model.Evaluate(variance).ToString(), System.Globalization.CultureInfo.InvariantCulture));
                        return p;
                    }
                    else
                    {
                        Console.WriteLine("Оптимизатор не нашёл решение. Проверьте ограничения и входные данные.");
                        return null;
                    }
                }
                catch (Exception e)
                {
                    // Логирование исключения для отладки
                    Console.WriteLine($"Ошибка при оптимизации: {e.Message}");
                    return null;
                }
            }
        }
    }
}

*/


/*using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.Z3;
using StockChart.Model;


namespace StockProject.PortfolioOptimization;

public class result
{
    public double Actual;  // calculated risk
    public double StdDev;  // calculated return percentage
    public double[] Mas;   // weights in the portfolio

    public result(int size)
    {
        Mas = new double[size];
    }
}

public static class Z3Extensions
{
    public static RealExpr MkReal(this Context ctx, double value)
    {
        return ctx.MkReal(value.ToString(System.Globalization.CultureInfo.InvariantCulture));
    }
}



public class MarkowitzPortfolio
{
    public result BuildCovariance(List<List<Candle>> res, double targetReturn)
    {
        int n = res.Count;
        double[] expectedReturns = new double[n];
        double[,] covarianceMatrix = new double[n, n];

        // Step 1: Compute expected returns and covariance matrix
        List<double>[] assetReturns = new List<double>[n];

        for (int i = 0; i < n; i++)
        {
            List<Candle> candles = res[i];
            assetReturns[i] = new List<double>();

            for (int t = 1; t < candles.Count; t++)
            {
                double prevClose = (double)candles[t - 1].ClsPrice;
                double currClose = (double)candles[t].ClsPrice;
                double return_t = (currClose - prevClose) / prevClose;
                assetReturns[i].Add(return_t);
            }

            // Compute mean return for asset i
            expectedReturns[i] = assetReturns[i].Average();
        }

        // Compute covariance matrix
        for (int i = 0; i < n; i++)
        {
            for (int j = i; j < n; j++)
            {
                double cov = Covariance(assetReturns[i], assetReturns[j]);
                covarianceMatrix[i, j] = cov;
                covarianceMatrix[j, i] = cov;
            }
        }

        // Step 2: Formulate optimization problem in Z3
        using (Context ctx = new Context())
        {
            // Create optimizer
            Optimize optimize = ctx.MkOptimize();

            // Define variables w_i
            RealExpr[] w = new RealExpr[n];
            for (int i = 0; i < n; i++)
            {
                w[i] = (RealExpr)ctx.MkConst($"w{i}", ctx.RealSort);
            }

            // Constraint: Sum of weights == 1
            ArithExpr sumW = (ArithExpr)ctx.MkAdd(w);
            optimize.Add(ctx.MkEq(sumW, ctx.MkReal(1)));

            // Constraints: w_i >= 0
            for (int i = 0; i < n; i++)
            {
                optimize.Add(ctx.MkGe(w[i], ctx.MkReal(0)));
            }

            // Constraint: Expected portfolio return >= targetReturn
            ArithExpr[] weightedReturns = w.Zip(expectedReturns, (wi, ri) =>
                (ArithExpr)ctx.MkMul(ctx.MkReal(ri), wi)).ToArray();
            ArithExpr portfolioReturn = (ArithExpr)ctx.MkAdd(weightedReturns);
            optimize.Add(ctx.MkGe(portfolioReturn, ctx.MkReal(targetReturn)));

            // Objective: Minimize portfolio variance
            List<ArithExpr> varianceTerms = new List<ArithExpr>();
            for (int i = 0; i < n; i++)
            {
                for (int j = 0; j < n; j++)
                {
                    ArithExpr term = (ArithExpr)ctx.MkMul(
                        ctx.MkReal(covarianceMatrix[i, j]), w[i], w[j]);
                    varianceTerms.Add(term);
                }
            }
            ArithExpr portfolioVariance = (ArithExpr)ctx.MkAdd(varianceTerms.ToArray());

            optimize.MkMinimize(portfolioVariance);

            // Solve optimization problem
            if (optimize.Check() == Status.SATISFIABLE)
            {
                Model model = optimize.Model;
                double[] weights = new double[n];
                for (int i = 0; i < n; i++)
                {
                    Expr wiExpr = model.Evaluate(w[i]);
                    weights[i] = ParseDouble(wiExpr.ToString());
                }

                // Compute actual risk and expected return
                double actualVariance = 0;
                for (int i = 0; i < n; i++)
                {
                    for (int j = 0; j < n; j++)
                    {
                        actualVariance += weights[i] * weights[j] * covarianceMatrix[i, j];
                    }
                }
                double actualRisk = Math.Sqrt(actualVariance);

                double expectedPortfolioReturn = 0;
                for (int i = 0; i < n; i++)
                {
                    expectedPortfolioReturn += weights[i] * expectedReturns[i];
                }

                result resu = new result(n)
                {
                    Mas = weights,
                    Actual = actualRisk,
                    StdDev = expectedPortfolioReturn
                };
                return resu;
            }
            else
            {
                throw new Exception("No solution found for the given target return.");
            }
        }
    }

    // Helper method to compute covariance between two lists of returns
    private double Covariance(List<double> returns1, List<double> returns2)
    {
        int n = Math.Min(returns1.Count, returns2.Count);
        double mean1 = returns1.Take(n).Average();
        double mean2 = returns2.Take(n).Average();

        double cov = 0;
        for (int i = 0; i < n; i++)
        {
            cov += (returns1[i] - mean1) * (returns2[i] - mean2);
        }
        cov /= (n - 1);
        return cov;
    }

    // Helper method to parse rational numbers from Z3 output
    private double ParseDouble(string str)
    {
        if (str.Contains("/"))
        {
            string[] parts = str.Split('/');
            double numerator = Convert.ToDouble(parts[0]);
            double denominator = Convert.ToDouble(parts[1]);
            return numerator / denominator;
        }
        else
        {
            return Convert.ToDouble(str);
        }
    }
}*/