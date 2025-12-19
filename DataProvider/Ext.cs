using System;
using System.Globalization;
public static class DateTimeJavaScript
{
    public static CultureInfo _DateTimeCulture = CultureInfo.CreateSpecificCulture("ru-RU");
    public static readonly long DatetimeMinTimeTicks =
       (new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc)).Ticks;
    public static DateTime Floor(this DateTime date, TimeSpan span)
    {
        if (span.Ticks>0)
        {
            long ticks = (date.Ticks/span.Ticks);
            return new DateTime(ticks*span.Ticks);
        }
        else
            return date;
    }
    public static long ToJavaScriptMilliseconds(this DateTime dt)
    {
        return (dt.Ticks-DatetimeMinTimeTicks)/10000;
    }
    public static long ToJavaScriptSeconds(this DateTime dt)
    {
        return (dt.ToUniversalTime().Ticks-DatetimeMinTimeTicks)/10000000;
    }
    public static long ToJavaScriptMinutes(this DateTime dt)
    {
        return (dt.ToUniversalTime().Ticks-DatetimeMinTimeTicks)/10000000;
    }
    public static DateTime parseDateTime(this string sDateTime)
    {
        return DateTime.Parse(sDateTime, _DateTimeCulture.DateTimeFormat);
    }
    public static DateTime DateTimeFromMinutes(this long minutes)
    {
        return new DateTime(minutes*10000000+DatetimeMinTimeTicks).ToLocalTime();
    }
    public static string toDateTime(this DateTime dateTime)
    {
        return dateTime.ToString("dd.MM.yyyy");//_DateTimeCulture.DateTimeFormat);
    }
    public static string ToStringInvariant(this DateTime dateTime)
    {
        return dateTime.ToString(CultureInfo.InvariantCulture);// "yyyy.MM.dd");
    }
    public static double parseDouble(this string str)
    {
        return double.Parse(str, CultureInfo.InvariantCulture);
    }
    public static string ToStringInvariant(this double value)
    {
        return value.ToString(CultureInfo.InvariantCulture);
    }
    public static string ToStringInvariant(this decimal value)
    {
        return value.ToString(CultureInfo.InvariantCulture);
    }
    public static string toSqlDateTime(this string dateTime)
    {
        return parseDateTime(dateTime).ToString("yyyy.MM.dd");
    }
}

