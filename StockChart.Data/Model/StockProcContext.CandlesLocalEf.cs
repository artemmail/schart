using Microsoft.EntityFrameworkCore;
using System.Data.SqlTypes;

namespace StockChart.Model;

public partial class ApplicationDbContext
{
    private static readonly DateTime SqlDateOrigin = new DateTime(1900, 1, 1);
    private static readonly DateTime SqlWeekAnchor = new DateTime(2001, 1, 1);
    private static readonly DateTime SqlSundayBase = new DateTime(1899, 12, 31);

    private static DateTime FloorToMinutes(DateTime value, double periodMinutes)
    {
        if (periodMinutes <= 0)
            return value;

        long periodTicks = (long)Math.Round(periodMinutes * TimeSpan.TicksPerMinute, 0, MidpointRounding.AwayFromZero);
        if (periodTicks <= 0)
            return value;

        long delta = value.Ticks - SqlDateOrigin.Ticks;
        long bucket = delta / periodTicks;
        return new DateTime(SqlDateOrigin.Ticks + bucket * periodTicks);
    }

    private static DateTime DateRound2(DateTime value, double periodMinutes)
    {
        if (periodMinutes <= 0d)
            return value;

        double serial = (value - SqlDateOrigin).TotalDays;
        double scaled = serial * (1440d / periodMinutes);
        double truncated = Math.Truncate(scaled);
        double roundedSerial = (truncated / 1440d) * periodMinutes;

        // SQL does intermediate CONVERT(datetime, ...), preserve datetime precision.
        var sqlRounded = new SqlDateTime(SqlDateOrigin.AddDays(roundedSerial)).Value;
        var shifted = sqlRounded.AddMilliseconds(500d);
        return sqlRounded.AddMilliseconds(500d - shifted.Millisecond);
    }

    private static DateTime FloorToMonthSpan(DateTime value, int monthSpan)
    {
        if (monthSpan <= 0)
            monthSpan = 1;

        int monthIndex = value.Month - 1;
        monthIndex -= monthIndex % monthSpan;
        return new DateTime(value.Year, monthIndex + 1, 1);
    }

    private static int SqlWeekIndex(DateTime value)
    {
        return (int)Math.Floor((value.Date - SqlSundayBase).TotalDays / 7d);
    }

    private static DateTime SqlWeekStart(DateTime value)
    {
        int deltaWeeks = SqlWeekIndex(value) - SqlWeekIndex(SqlWeekAnchor);
        return SqlWeekAnchor.AddDays(deltaWeeks * 7d);
    }

    private static Candle BuildCandle(
        int id,
        DateTime period,
        decimal opn,
        decimal cls,
        decimal min,
        decimal max,
        decimal volume,
        decimal buyVolume,
        decimal quantity,
        decimal buyQuantity,
        int oi)
    {
        return new Candle
        {
            Id = id,
            Period = period,
            OpnPrice = opn,
            ClsPrice = cls,
            MinPrice = min,
            MaxPrice = max,
            Volume = volume,
            BuyVolume = buyVolume,
            Quantity = quantity,
            BuyQuantity = buyQuantity,
            Oi = oi
        };
    }

    private async Task<(int Id, byte Market)?> ResolveTickerIdAndMarketAsync(string ticker)
    {
        var item = await Dictionaries
            .AsNoTracking()
            .Where(x => x.Securityid == ticker)
            .Select(x => new
            {
                x.Id,
                Market = (byte?)x.Market
            })
            .FirstOrDefaultAsync();

        if (item == null)
            return null;

        return (item.Id, item.Market ?? 100);
    }

    private async Task<List<Candle>> GetCandlesNewLocalEfAsync(int tickerId, byte market, double period, DateTime startDate, DateTime endDate, int top)
    {
        top = top <= 0 ? 50000 : top;
        const double eps = 1e-9;

        if (Math.Abs(period) < eps)
        {
            if (market == 20)
            {
                var rows = await Tradesbinances
                    .AsNoTracking()
                    .Where(t => t.Id == tickerId && t.TradeDate >= startDate && t.TradeDate <= endDate)
                    .OrderByDescending(t => t.TradeDate)
                    .ThenByDescending(t => t.Number)
                    .Take(18000)
                    .Select(t => new
                    {
                        t.Number,
                        t.TradeDate,
                        t.Price,
                        t.Quantity,
                        t.Direction
                    })
                    .ToListAsync();

                return rows
                    .OrderBy(x => x.Number)
                    .Select(x => BuildCandle(
                        tickerId,
                        x.TradeDate,
                        x.Price,
                        x.Price,
                        x.Price,
                        x.Price,
                        x.Quantity,
                        x.Quantity * x.Direction,
                        x.Quantity,
                        x.Quantity * x.Direction,
                        0))
                    .ToList();
            }

            var tradeRows = await Trades
                .AsNoTracking()
                .Where(t => t.Id == tickerId && t.TradeDate >= startDate && t.TradeDate <= endDate)
                .OrderByDescending(t => t.TradeDate)
                .ThenByDescending(t => t.Number)
                .Take(18000)
                .Select(t => new
                {
                    t.Number,
                    t.TradeDate,
                    t.Price,
                    t.Volume,
                    t.Quantity,
                    t.Direction,
                    t.Oi
                })
                .ToListAsync();

            return tradeRows
                .OrderBy(x => x.Number)
                .Select(x => BuildCandle(
                    tickerId,
                    x.TradeDate,
                    x.Price,
                    x.Price,
                    x.Price,
                    x.Price,
                    x.Volume,
                    x.Volume * x.Direction,
                    x.Quantity,
                    x.Quantity * x.Direction,
                    x.Oi))
                .ToList();
        }

        if (period < 1d - eps)
        {
            var rows = await Trades
                .AsNoTracking()
                .Where(t => t.Id == tickerId && t.TradeDate >= startDate && t.TradeDate <= endDate)
                .Select(t => new
                {
                    t.Number,
                    t.TradeDate,
                    t.Price,
                    t.Quantity,
                    t.Direction
                })
                .ToListAsync();

            return rows
                .GroupBy(x => DateRound2(x.TradeDate, period))
                .Select(g =>
                {
                    var minNumber = g.Min(x => x.Number);
                    var maxNumber = g.Max(x => x.Number);
                    var first = g.First(x => x.Number == minNumber);
                    var last = g.First(x => x.Number == maxNumber);
                    return BuildCandle(
                        tickerId,
                        g.Key,
                        first.Price,
                        last.Price,
                        g.Min(x => x.Price),
                        g.Max(x => x.Price),
                        g.Sum(x => x.Price * x.Quantity),
                        g.Sum(x => x.Price * x.Quantity * x.Direction),
                        g.Sum(x => (decimal)x.Quantity),
                        g.Sum(x => (decimal)x.Quantity * x.Direction),
                        0);
                })
                .OrderBy(x => x.Period)
                .ToList();
        }

        if (Math.Abs(period - 1d) < eps)
        {
            var rows = await Candles
                .AsNoTracking()
                .Where(c => c.Id == tickerId && c.Period >= startDate && c.Period < endDate)
                .OrderByDescending(c => c.Period)
                .Take(top)
                .Select(c => new
                {
                    c.Period,
                    c.OpnPrice,
                    c.ClsPrice,
                    c.MinPrice,
                    c.MaxPrice,
                    c.Volume,
                    c.BuyVolume,
                    c.Quantity,
                    c.BuyQuantity,
                    c.Oi
                })
                .ToListAsync();

            return rows
                .OrderBy(x => x.Period)
                .Select(x => BuildCandle(
                    tickerId,
                    x.Period,
                    x.OpnPrice,
                    x.ClsPrice,
                    x.MinPrice,
                    x.MaxPrice,
                    x.Volume,
                    x.BuyVolume,
                    x.Quantity,
                    x.BuyQuantity,
                    x.Oi))
                .ToList();
        }

        if (period >= 30000d - eps)
        {
            int monthSpan = Math.Max(1, (int)Math.Round(period / 30000d, MidpointRounding.AwayFromZero));

            var rows = await DayCandles
                .AsNoTracking()
                .Where(c => c.Id == tickerId && c.Period >= startDate && c.Period <= endDate)
                .Select(c => new
                {
                    c.Period,
                    c.OpnPrice,
                    c.ClsPrice,
                    c.MinPrice,
                    c.MaxPrice,
                    c.Volume,
                    c.BuyVolume,
                    c.Quantity,
                    c.BuyQuantity,
                    c.Oi
                })
                .ToListAsync();

            return rows
                .GroupBy(x => FloorToMonthSpan(x.Period, monthSpan))
                .Select(g =>
                {
                    var ordered = g.OrderBy(x => x.Period).ToList();
                    var first = ordered[0];
                    var last = ordered[^1];
                    return new
                    {
                        Candle = BuildCandle(
                            tickerId,
                            first.Period,
                            first.OpnPrice,
                            last.ClsPrice,
                            ordered.Min(x => x.MinPrice),
                            ordered.Max(x => x.MaxPrice),
                            ordered.Sum(x => x.Volume),
                            ordered.Sum(x => x.BuyVolume),
                            ordered.Sum(x => x.Quantity),
                            ordered.Sum(x => x.BuyQuantity),
                            last.Oi),
                        RoundDate = first.Period
                    };
                })
                .OrderByDescending(x => x.RoundDate)
                .Take(top)
                .OrderBy(x => x.RoundDate)
                .Select(x => x.Candle)
                .ToList();
        }

        if (Math.Abs(period - 1440d) < eps)
        {
            var rows = await DayCandles
                .AsNoTracking()
                .Where(c => c.Id == tickerId && c.Period >= startDate && c.Period < endDate)
                .OrderByDescending(c => c.Period)
                .Take(top)
                .Select(c => new
                {
                    c.Period,
                    c.OpnPrice,
                    c.ClsPrice,
                    c.MinPrice,
                    c.MaxPrice,
                    c.Volume,
                    c.BuyVolume,
                    c.Quantity,
                    c.BuyQuantity,
                    c.Oi
                })
                .ToListAsync();

            return rows
                .OrderBy(x => x.Period)
                .Select(x => BuildCandle(
                    tickerId,
                    x.Period,
                    x.OpnPrice,
                    x.ClsPrice,
                    x.MinPrice,
                    x.MaxPrice,
                    x.Volume,
                    x.BuyVolume,
                    x.Quantity,
                    x.BuyQuantity,
                    x.Oi))
                .ToList();
        }

        if (period > 1440d)
        {
            int days = (int)(period / 1440d);
            if (days < 1)
                days = 7;

            var rows = await DayCandles
                .AsNoTracking()
                .Where(c => c.Id == tickerId && c.Period >= startDate && c.Period < endDate)
                .Select(c => new
                {
                    c.Period,
                    c.OpnPrice,
                    c.ClsPrice,
                    c.MinPrice,
                    c.MaxPrice,
                    c.Volume,
                    c.BuyVolume,
                    c.Quantity,
                    c.BuyQuantity,
                    c.Oi
                })
                .ToListAsync();

            return rows
                .GroupBy(x => SqlWeekStart(x.Period))
                .Select(g =>
                {
                    var ordered = g.OrderBy(x => x.Period).ToList();
                    var firstPeriod = ordered[0].Period;
                    var lastPeriod = ordered[^1].Period;
                    var first = ordered.First(x => x.Period == firstPeriod);
                    var last = ordered.First(x => x.Period == lastPeriod);
                    var roundDate = g.Key >= startDate.Date ? g.Key : startDate.Date;
                    var closeDate = g.Key.AddDays(days) <= endDate
                        ? g.Key.AddDays(days - 1)
                        : endDate;

                    return new
                    {
                        WeekStart = g.Key,
                        Candle = BuildCandle(
                            tickerId,
                            roundDate,
                            first.OpnPrice,
                            last.ClsPrice,
                            ordered.Min(x => x.MinPrice),
                            ordered.Max(x => x.MaxPrice),
                            ordered.Sum(x => x.Volume),
                            ordered.Sum(x => x.BuyVolume),
                            ordered.Sum(x => x.Quantity),
                            ordered.Sum(x => x.BuyQuantity),
                            last.Oi),
                        CloseDate = closeDate
                    };
                })
                .OrderByDescending(x => x.WeekStart)
                .Take(top)
                .OrderBy(x => x.Candle.Period)
                .Select(x => x.Candle)
                .ToList();
        }

        var minuteRows = await Candles
            .AsNoTracking()
            .Where(c => c.Id == tickerId && c.Period >= startDate && c.Period < endDate)
            .Select(c => new
            {
                c.Period,
                c.OpnPrice,
                c.ClsPrice,
                c.MinPrice,
                c.MaxPrice,
                c.Volume,
                c.BuyVolume,
                c.Quantity,
                c.BuyQuantity,
                c.Oi
            })
            .ToListAsync();

        return minuteRows
            .GroupBy(x => FloorToMinutes(x.Period, period))
            .Select(g =>
            {
                var ordered = g.OrderBy(x => x.Period).ToList();
                var first = ordered[0];
                var last = ordered[^1];
                return new
                {
                    RoundDate = g.Key,
                    Candle = BuildCandle(
                        tickerId,
                        g.Key,
                        first.OpnPrice,
                        last.ClsPrice,
                        ordered.Min(x => x.MinPrice),
                        ordered.Max(x => x.MaxPrice),
                        ordered.Sum(x => x.Volume),
                        ordered.Sum(x => x.BuyVolume),
                        ordered.Sum(x => x.Quantity),
                        ordered.Sum(x => x.BuyQuantity),
                        last.Oi),
                    CloseDate = last.Period
                };
            })
            .OrderByDescending(x => x.RoundDate)
            .Take(top)
            .OrderBy(x => x.RoundDate)
            .Select(x => x.Candle)
            .ToList();
    }

    private async Task<List<Candle>> GetCandlesGluedLocalEfAsync(string ticker, int period, DateTime startDate, DateTime endDate, int top)
    {
        top = top <= 0 ? 50000 : top;

        if (string.IsNullOrWhiteSpace(ticker) || ticker.Length != 4 || !ticker.EndsWith("##", StringComparison.Ordinal))
            return new List<Candle>();

        string prefix = ticker.Substring(0, 2);

        var dayRows = await (
            from dc in DayCandles.AsNoTracking()
            join d in Dictionaries.AsNoTracking() on dc.Id equals d.Id
            where d.Market == 1
                && d.Securityid.Length == 4
                && d.Securityid.StartsWith(prefix)
                && dc.Period >= startDate
                && dc.Period <= endDate
            select new
            {
                dc.Id,
                dc.Period,
                dc.Volume
            })
            .ToListAsync();

        if (dayRows.Count == 0)
            return new List<Candle>();

        var bestRowsByPeriod = dayRows
            .GroupBy(x => x.Period)
            .SelectMany(g =>
            {
                var maxVolume = g.Max(x => x.Volume);
                return g.Where(x => x.Volume == maxVolume);
            })
            .ToList();

        var ranges = bestRowsByPeriod
            .GroupBy(x => x.Id)
            .Select(g => new
            {
                Id = g.Key,
                From = g.Min(x => x.Period),
                To = g.Max(x => x.Period)
            })
            .OrderBy(x => x.From)
            .ToList();

        var candlesRes = new List<Candle>();

        foreach (var range in ranges)
        {
            var localRows = await GetCandlesNewLocalEfAsync(
                range.Id,
                1,
                period < 1440 ? period : 1440,
                range.From,
                period < 1440 ? range.To.AddDays(1) : range.To,
                500000);

            foreach (var row in localRows)
                row.Id = range.Id;

            candlesRes.AddRange(localRows);
        }

        if (candlesRes.Count == 0)
            return new List<Candle>();

        // Build continuous glued series: one candle per timestamp by the most liquid contract.
        var dominantByPeriod = candlesRes
            .GroupBy(x => x.Period)
            .Select(g => g.OrderByDescending(x => x.Volume).ThenBy(x => x.Id).First())
            .OrderBy(x => x.Period)
            .ToList();

        if (period <= 1440)
        {
            return dominantByPeriod;
        }

        if (period == 30000)
        {
            return dominantByPeriod
                .GroupBy(x => new DateTime(x.Period.Year, x.Period.Month, 1))
                .Select(g =>
                {
                    var ordered = g.OrderBy(x => x.Period).ToList();
                    var first = ordered[0];
                    var last = ordered[^1];

                    return BuildCandle(
                        0,
                        first.Period,
                        first.OpnPrice,
                        last.ClsPrice,
                        ordered.Min(x => x.MinPrice),
                        ordered.Max(x => x.MaxPrice),
                        ordered.Sum(x => x.Volume),
                        ordered.Sum(x => x.BuyVolume),
                        ordered.Sum(x => x.Quantity),
                        ordered.Sum(x => x.BuyQuantity),
                        last.Oi);
                })
                .OrderByDescending(x => x.Period)
                .Take(top)
                .OrderBy(x => x.Period)
                .ToList();
        }

        int bigPeriod = period / 1440 - 1;
        var rowsByWeek = dominantByPeriod
            .GroupBy(x => SqlWeekStart(x.Period))
            .Select(g => new
            {
                WeekStart = g.Key
            })
            .OrderByDescending(x => x.WeekStart)
            .Take(top)
            .ToList();

        var result = new List<Candle>();

        foreach (var week in rowsByWeek)
        {
            var toDate = week.WeekStart.AddDays(bigPeriod);
            var window = dominantByPeriod
                .Where(x => x.Period >= week.WeekStart && x.Period <= toDate)
                .OrderBy(x => x.Period)
                .ToList();

            if (window.Count == 0)
                continue;

            var first = window[0];
            var last = window[^1];
            result.Add(BuildCandle(
                0,
                week.WeekStart,
                first.OpnPrice,
                last.ClsPrice,
                window.Min(x => x.MinPrice),
                window.Max(x => x.MaxPrice),
                window.Sum(x => x.Volume),
                window.Sum(x => x.BuyVolume),
                window.Sum(x => x.Quantity),
                window.Sum(x => x.BuyQuantity),
                last.Oi));
        }

        return result.OrderBy(x => x.Period).ToList();
    }
}
