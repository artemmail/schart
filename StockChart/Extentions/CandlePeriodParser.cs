using System;
using System.Globalization;
using System.Text.RegularExpressions;

namespace StockChart.Extentions
{
    public static class CandlePeriodParser
    {
        private static readonly Regex TimeframeRegex = new Regex(
            @"^(?:(?<prefix>[a-zA-Z]+)(?<num>\d+)?|(?<num2>\d+)(?<suffix>[a-zA-Z]+))$",
            RegexOptions.Compiled | RegexOptions.CultureInvariant);

        // Engine conventions:
        // - minutes/hours/days/weeks are expressed in minutes (1, 60, 1440, 10080, ...)
        // - "month" is hardcoded as 30000
        // - quarter/halfyear are 90000/180000
        public static bool TryParse(string? timeframeOrNumber, out double period)
        {
            period = default;
            if (string.IsNullOrWhiteSpace(timeframeOrNumber))
            {
                return false;
            }

            var s = timeframeOrNumber.Trim();

            if (double.TryParse(s, NumberStyles.Float, CultureInfo.InvariantCulture, out period))
            {
                return true;
            }

            if (double.TryParse(s, NumberStyles.Float, CultureInfo.CurrentCulture, out period))
            {
                return true;
            }

            s = s.Replace(" ", "", StringComparison.Ordinal).Replace("_", "", StringComparison.Ordinal);
            if (s.Length == 0)
            {
                return false;
            }

            // TradingView-style: D/W/M (no number)
            if (string.Equals(s, "D", StringComparison.OrdinalIgnoreCase))
            {
                period = 1440;
                return true;
            }
            if (string.Equals(s, "W", StringComparison.OrdinalIgnoreCase))
            {
                period = 1440 * 7;
                return true;
            }
            if (string.Equals(s, "M", StringComparison.OrdinalIgnoreCase))
            {
                period = 30000;
                return true;
            }

            var m = TimeframeRegex.Match(s);
            if (!m.Success)
            {
                return false;
            }

            var rawUnit = m.Groups["prefix"].Success ? m.Groups["prefix"].Value : m.Groups["suffix"].Value;
            var unit = rawUnit.ToLowerInvariant();
            var numStr = m.Groups["num"].Success ? m.Groups["num"].Value : m.Groups["num2"].Value;

            var count = 1;
            if (!string.IsNullOrEmpty(numStr) && !int.TryParse(numStr, NumberStyles.None, CultureInfo.InvariantCulture, out count))
            {
                return false;
            }
            if (count <= 0)
            {
                return false;
            }

            // Minutes/hours/days/weeks: MetaTrader-style (M1/H1/D1/W1) and also 1m/1h...
            // Note: "m" is minutes, "mn"/"mo"/"month" are months.
            // TradingView-style with number: 1M / 3M / 6M (months, not minutes)
            if (m.Groups["suffix"].Success && string.Equals(rawUnit, "M", StringComparison.Ordinal))
            {
                period = count switch
                {
                    1 => 30000,
                    3 => 90000,
                    6 => 180000,
                    _ => count * 30000.0
                };
                return true;
            }

            switch (unit)
            {
                case "m":
                case "min":
                case "mins":
                case "minute":
                case "minutes":
                    period = count;
                    return true;

                case "h":
                case "hr":
                case "hrs":
                case "hour":
                case "hours":
                    period = count * 60.0;
                    return true;

                case "d":
                case "day":
                case "days":
                    period = count * 1440.0;
                    return true;

                case "w":
                case "week":
                case "weeks":
                    period = count * 1440.0 * 7.0;
                    return true;

                // Months (engine uses 30000 as "1 month")
                // Common trading notations: MN1 (MetaTrader), 1M (TradingView), plus "mo"/"month".
                case "mn":
                case "mo":
                case "mon":
                case "month":
                case "months":
                    period = count switch
                    {
                        1 => 30000,
                        3 => 90000,
                        6 => 180000,
                        _ => count * 30000.0
                    };
                    return true;

                // Seconds (supported by UI as fractions of a minute)
                case "s":
                case "sec":
                case "secs":
                case "second":
                case "seconds":
                    period = count / 60.0;
                    return true;

                // Quarters / halfyears (engine uses 90000/180000)
                case "q":
                case "quarter":
                case "quarters":
                    period = count * 90000.0;
                    return true;

                case "hy":
                case "halfyear":
                case "halfyears":
                    period = count * 180000.0;
                    return true;

                default:
                    return false;
            }
        }
    }
}
