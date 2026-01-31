using System;

namespace StockChart.Extentions
{
    public sealed record Black76Greeks(decimal Delta, decimal Gamma, decimal Vega, decimal Theta, decimal Rho);

    public static class Black76
    {
        private const double SqrtTwoPi = 2.5066282746310002;

        public static Black76Greeks? TryCalculate(
            bool isCall,
            decimal forwardPrice,
            decimal strike,
            decimal volatilityPercent,
            decimal riskFreeRate,
            double timeToExpirationYears,
            double dayCount = 365d)
        {
            if (timeToExpirationYears <= 0d || forwardPrice <= 0m || strike <= 0m || volatilityPercent <= 0m)
            {
                return null;
            }

            var f = (double)forwardPrice;
            var k = (double)strike;
            var sigma = (double)volatilityPercent / 100d;
            var r = (double)riskFreeRate;

            if (sigma <= 0d || f <= 0d || k <= 0d)
            {
                return null;
            }

            var sqrtT = Math.Sqrt(timeToExpirationYears);
            var df = Math.Exp(-r * timeToExpirationYears);
            var d1 = (Math.Log(f / k) + 0.5d * sigma * sigma * timeToExpirationYears) / (sigma * sqrtT);
            var d2 = d1 - sigma * sqrtT;

            var nd1 = NormalPdf(d1);
            var nd2 = NormalCdf(d2);
            var nd1Cdf = NormalCdf(d1);

            var price = isCall
                ? df * (f * nd1Cdf - k * nd2)
                : df * (k * NormalCdf(-d2) - f * NormalCdf(-d1));

            var delta = isCall ? df * nd1Cdf : -df * NormalCdf(-d1);
            var gamma = df * nd1 / (f * sigma * sqrtT);
            var vega = df * f * nd1 * sqrtT;

            var theta = 0d;
            if (dayCount > 0d)
            {
                var dt = 1d / dayCount;
                var tMinus = Math.Max(timeToExpirationYears - dt, 0d);
                var priceMinus = Price(isCall, f, k, sigma, r, tMinus);
                theta = (priceMinus - price) / dt;
            }

            const double rhoBump = 0.0001d;
            var priceRho = Price(isCall, f, k, sigma, r + rhoBump, timeToExpirationYears);
            var rho = (priceRho - price) / rhoBump;

            return new Black76Greeks(
                Delta: (decimal)delta,
                Gamma: (decimal)gamma,
                Vega: (decimal)vega,
                Theta: (decimal)theta,
                Rho: (decimal)rho);
        }

        public static decimal? TryImplyForwardPrice(
            bool isCall,
            decimal optionPrice,
            decimal strike,
            decimal volatilityPercent,
            decimal riskFreeRate,
            double timeToExpirationYears)
        {
            if (optionPrice <= 0m || strike <= 0m || volatilityPercent <= 0m || timeToExpirationYears <= 0d)
            {
                return null;
            }

            var price = (double)optionPrice;
            var k = (double)strike;
            var sigma = (double)volatilityPercent / 100d;
            var r = (double)riskFreeRate;

            var low = Math.Max(1e-6d, k * 0.001d);
            var high = k * 5d;

            var priceLow = Price(isCall, low, k, sigma, r, timeToExpirationYears);
            var priceHigh = Price(isCall, high, k, sigma, r, timeToExpirationYears);

            if (isCall)
            {
                var guard = 0;
                while (priceHigh < price && guard < 50)
                {
                    high *= 2d;
                    priceHigh = Price(isCall, high, k, sigma, r, timeToExpirationYears);
                    guard++;
                }

                if (priceLow > price || priceHigh < price)
                {
                    return null;
                }
            }
            else
            {
                var guard = 0;
                while (priceHigh > price && guard < 50)
                {
                    high *= 2d;
                    priceHigh = Price(isCall, high, k, sigma, r, timeToExpirationYears);
                    guard++;
                }

                if (priceLow < price || priceHigh > price)
                {
                    return null;
                }
            }

            for (var i = 0; i < 60; i++)
            {
                var mid = 0.5d * (low + high);
                var midPrice = Price(isCall, mid, k, sigma, r, timeToExpirationYears);

                if (Math.Abs(midPrice - price) < 1e-8d)
                {
                    return (decimal)mid;
                }

                if (isCall)
                {
                    if (midPrice > price)
                    {
                        high = mid;
                    }
                    else
                    {
                        low = mid;
                    }
                }
                else
                {
                    if (midPrice > price)
                    {
                        low = mid;
                    }
                    else
                    {
                        high = mid;
                    }
                }
            }

            return (decimal)(0.5d * (low + high));
        }

        private static double Price(bool isCall, double f, double k, double sigma, double r, double t)
        {
            if (t <= 0d || sigma <= 0d || f <= 0d || k <= 0d)
            {
                var df0 = Math.Exp(-r * Math.Max(t, 0d));
                var intrinsic = isCall ? Math.Max(f - k, 0d) : Math.Max(k - f, 0d);
                return df0 * intrinsic;
            }

            var sqrtT = Math.Sqrt(t);
            var df = Math.Exp(-r * t);
            var d1 = (Math.Log(f / k) + 0.5d * sigma * sigma * t) / (sigma * sqrtT);
            var d2 = d1 - sigma * sqrtT;

            return isCall
                ? df * (f * NormalCdf(d1) - k * NormalCdf(d2))
                : df * (k * NormalCdf(-d2) - f * NormalCdf(-d1));
        }

        private static double NormalPdf(double x)
        {
            return Math.Exp(-0.5d * x * x) / SqrtTwoPi;
        }

        private static double NormalCdf(double x)
        {
            var absX = Math.Abs(x);
            var t = 1d / (1d + 0.2316419d * absX);
            var d = 0.3989423d * Math.Exp(-0.5d * absX * absX);
            var prob = d * t * (0.3193815d + t * (-0.3565638d + t * (1.781478d + t * (-1.821256d + t * 1.330274d))));
            return x >= 0d ? 1d - prob : prob;
        }
    }
}
