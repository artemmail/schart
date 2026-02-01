using System.Globalization;
using System.Text.RegularExpressions;
using Quartz;

namespace StockChart.UpdateService;

public static class ScheduleParsing
{
    private static readonly Regex IntervalRegex = new(
        "^\\s*(?<value>\\d+(?:[\\.,]\\d+)?)\\s*(?<unit>ms|s|sec|secs|m|min|mins|h|hr|hrs|d|day|days)\\s*$",
        RegexOptions.Compiled | RegexOptions.IgnoreCase);

    public static bool IsCronExpression(string? value)
    {
        return !string.IsNullOrWhiteSpace(value) && CronExpression.IsValidExpression(value);
    }

    public static bool TryParseInterval(string? value, out TimeSpan interval)
    {
        interval = default;
        if (string.IsNullOrWhiteSpace(value))
        {
            return false;
        }

        var trimmed = value.Trim();

        if (TimeSpan.TryParse(trimmed, CultureInfo.InvariantCulture, out interval))
        {
            return interval > TimeSpan.Zero;
        }

        if (double.TryParse(trimmed, NumberStyles.Float, CultureInfo.InvariantCulture, out var seconds))
        {
            interval = TimeSpan.FromSeconds(seconds);
            return interval > TimeSpan.Zero;
        }

        var match = IntervalRegex.Match(trimmed);
        if (!match.Success)
        {
            return false;
        }

        if (!double.TryParse(match.Groups["value"].Value.Replace(',', '.'), NumberStyles.Float, CultureInfo.InvariantCulture, out var number))
        {
            return false;
        }

        var unit = match.Groups["unit"].Value.ToLowerInvariant();
        interval = unit switch
        {
            "ms" => TimeSpan.FromMilliseconds(number),
            "s" or "sec" or "secs" => TimeSpan.FromSeconds(number),
            "m" or "min" or "mins" => TimeSpan.FromMinutes(number),
            "h" or "hr" or "hrs" => TimeSpan.FromHours(number),
            "d" or "day" or "days" => TimeSpan.FromDays(number),
            _ => TimeSpan.Zero
        };

        return interval > TimeSpan.Zero;
    }

    public static bool TryParseSchedule(string? value, out ScheduleDefinition schedule)
    {
        schedule = default;
        if (string.IsNullOrWhiteSpace(value))
        {
            return false;
        }

        if (IsCronExpression(value))
        {
            schedule = new ScheduleDefinition(true, value.Trim(), TimeSpan.Zero);
            return true;
        }

        if (TryParseInterval(value, out var interval))
        {
            schedule = new ScheduleDefinition(false, string.Empty, interval);
            return true;
        }

        return false;
    }
}

public readonly record struct ScheduleDefinition(bool IsCron, string Cron, TimeSpan Interval);
