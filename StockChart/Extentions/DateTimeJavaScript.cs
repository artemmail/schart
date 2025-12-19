
using System.Globalization;
public static class DateTimeJavaScript
{
    public static CultureInfo _DateTimeCulture = CultureInfo.CreateSpecificCulture("ru-RU");
    public static CultureInfo CultureInfo = CultureInfo.InvariantCulture;
    public static decimal MoneyRounder(this decimal num)
    {
        decimal x = (decimal)Math.Pow(10, Math.Round(Math.Log10((double)num)));
        return (2 * x - num < num - x) ? 2 * x : (num - 0.5m * x < x - num) ? x * 0.5m : x;
    }
    public static DateTime StartOfWeek(this DateTime dt, DayOfWeek startOfWeek)
    {
        int diff = dt.DayOfWeek - startOfWeek;
        if (diff < 0)
        {
            diff += 7;
        }
        return dt.AddDays(-1 * diff).Date;
    }

    public static DateTime Group(this DateTime d, int g)
    {
        if (g == 0)
            return d;
        if (g == 1)
            return d.StartOfWeek(DayOfWeek.Monday);
        if (g == 2)
            return new DateTime(d.Year, d.Month, 1);
        if (g == 3)
            return new DateTime(d.Year, d.Month - (d.Month - 1) % 3, 1);
        if (g == 4)
            return new DateTime(d.Year, d.Month - (d.Month - 1) % 6, 1);
        // if (g == 4)
        return new DateTime(d.Year, 1, 1);
    }


    public static readonly long DatetimeMinTimeTicks =
           (new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc)).Ticks;
    public static DateTime Floor(this DateTime date, TimeSpan span)
    {
        long ticks = (date.Ticks / span.Ticks);
        return new DateTime(ticks * span.Ticks);
    }

    public static DateTime Floor(this DateTime date, double minutes)
    {
        if (minutes < 30000)
            return date.Floor(TimeSpan.FromMinutes(minutes));

        else
        {
            var div = (int)minutes / 30000;

            var ms = 12 * (date.Year - 1900) + date.Month - 1;

            ms = ms - ms % div;

            return new DateTime(1900 + ms / 12, ms % 12 + 1, 1);
        }

    }


    public static long ToJavaScriptMilliseconds(this DateTime dt)
    {
        return (dt.Ticks - DatetimeMinTimeTicks) / 10000;
    }
    public static long ToJavaScriptSeconds(this DateTime dt)
    {
        return (dt.ToUniversalTime().Ticks - DatetimeMinTimeTicks) / 10000000;
    }
    public static long ToJavaScriptMinutes(this DateTime dt)
    {
        return (dt.ToUniversalTime().Ticks - DatetimeMinTimeTicks) / 10000000;
    }
    public static DateTime parseDateTime(this string sDateTime)
    {
        return DateTime.Parse(sDateTime, _DateTimeCulture.DateTimeFormat);
    }
    public static DateTime DateTimeFromMinutes(this long minutes)
    {
        return new DateTime(minutes * 10000000 + DatetimeMinTimeTicks).ToLocalTime();
    }
    public static string toDateTime(this DateTime dateTime)
    {
        return dateTime.ToString("dd.MM.yyyy");//_DateTimeCulture.DateTimeFormat);
    }

    public static string toWebString(this DateTime dateTime)
    {
        return dateTime.ToString("yyyy-MM-dd");//_DateTimeCulture.DateTimeFormat);
    }

    public static string ToStringInvariant(this DateTime dateTime)
    {
        return dateTime.ToString(CultureInfo);// "yyyy.MM.dd");
    }
    public static double parseDouble(this string str)
    {
        return double.Parse(str, CultureInfo);
    }
    public static string ToStringInvariant(this double value)
    {
        return value.ToString(CultureInfo);
    }
    public static string ToStringInvariant(this decimal value)
    {
        return value.ToString(CultureInfo);
    }
    public static string toSqlDateTime(this string dateTime)
    {
        return parseDateTime(dateTime).ToString("yyyy.MM.dd");
    }
    public static IEnumerable<int> AllIndexesOf(this string str, string value)
    {
        if (String.IsNullOrEmpty(value))
            throw new ArgumentException("the string to find may not be empty", "value");
        for (int index = 0; ; index += value.Length)
        {
            index = str.IndexOf(value, index);
            if (index == -1)
                break;
            yield return index;
        }
    }
    public static IEnumerable<int> AllIndexesOf(this string str, char value)
    {
        for (int index = 0; ; index++)
        {
            index = str.IndexOf(value, index);
            if (index == -1)
                break;
            yield return index;
        }
    }
}
