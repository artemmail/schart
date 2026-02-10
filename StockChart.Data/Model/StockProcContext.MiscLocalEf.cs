using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using System.Data;

namespace StockChart.Model;

public partial class ApplicationDbContext
{
    private static decimal RoundToStep(decimal price, decimal step)
    {
        if (step <= 0)
            return price;

        return Math.Round(price / step, 0, MidpointRounding.AwayFromZero) * step;
    }

    private static DateTime FloorDateBySqlRound(DateTime value, double periodMinutes)
    {
        if (periodMinutes <= 0)
            return value;

        double scale = 1440.0 / periodMinutes;
        double floatValue = (value - SqlDateOrigin).TotalDays;
        double truncated = Math.Truncate(floatValue * scale) / scale;
        return SqlDateOrigin.AddDays(truncated);
    }

    private static decimal ResolveMaxTrade(decimal minValue, decimal maxValue)
    {
        return maxValue > -minValue ? maxValue : minValue;
    }

    private async Task<(int Id, byte Market, decimal MinStep)?> ResolveTickerWithFallbackAsync(string? ticker)
    {
        if (string.IsNullOrWhiteSpace(ticker))
            return null;

        string normalized = ticker.Trim();

        var exact = await Dictionaries
            .AsNoTracking()
            .Where(d => d.Securityid == normalized)
            .Select(d => new
            {
                d.Id,
                Market = (byte?)d.Market,
                d.Minstep
            })
            .FirstOrDefaultAsync();

        if (exact != null)
            return (exact.Id, exact.Market ?? 100, exact.Minstep);

        if (normalized.EndsWith("##", StringComparison.Ordinal) && normalized.Length >= 2)
            normalized = normalized.Substring(0, 2);

        if (normalized.Length == 2)
        {
            string prefix = normalized.ToUpperInvariant();
            var alias = await Dictionaries
                .AsNoTracking()
                .Where(d => d.Market == 1 && d.Securityid.StartsWith(prefix))
                .OrderByDescending(d => d.ToDate ?? DateTime.MinValue)
                .ThenBy(d => d.Securityid.Length)
                .Select(d => new
                {
                    d.Id,
                    Market = (byte?)d.Market,
                    d.Minstep
                })
                .FirstOrDefaultAsync();

            if (alias != null)
                return (alias.Id, alias.Market ?? 1, alias.Minstep);
        }

        return null;
    }

    private async Task<int> ResolveTickerIdExactAsync(string? ticker)
    {
        if (string.IsNullOrWhiteSpace(ticker))
            return 0;

        return await Dictionaries
            .AsNoTracking()
            .Where(d => d.Securityid == ticker)
            .Select(d => d.Id)
            .FirstOrDefaultAsync();
    }

    private async Task<List<AliasResult>> AliasLocalEfAsync(string ticker)
    {
        if (string.IsNullOrWhiteSpace(ticker))
            return new List<AliasResult>();

        string normalized = ticker.Trim();

        var securityId = await (
            from dc in DayCandles.AsNoTracking()
            join d in Dictionaries.AsNoTracking() on dc.Id equals d.Id
            where ((d.Market == 1 && d.Securityid.StartsWith(normalized) && d.Securityid.Length == 4)
                   || d.Securityid == normalized)
            orderby d.Market, dc.Period descending, dc.Volume descending
            select d.Securityid)
            .FirstOrDefaultAsync();

        if (string.IsNullOrWhiteSpace(securityId))
            return new List<AliasResult>();

        return new List<AliasResult>
        {
            new AliasResult
            {
                SECURITYID = securityId
            }
        };
    }

    private async Task<List<Candle>> GetLastCandlesLocalEfAsync(int tickerid, int period, int top)
    {
        if (period <= 0)
            return new List<Candle>();

        top = top <= 0 ? 5 : top;

        var endDate = await Candles
            .AsNoTracking()
            .Where(c => c.Id == tickerid)
            .MaxAsync(c => (DateTime?)c.Period);
        if (!endDate.HasValue)
            return new List<Candle>();

        // Exact port of:
        // ROUND(CONVERT(float,@enddate)*(1440.0/@period),0,1)/(1440.0/@period)
        // with 1900-01-01 datetime origin and truncate mode.
        double scale = 1440.0 / period;
        double endFloat = (endDate.Value - SqlDateOrigin).TotalDays;
        double truncated = Math.Truncate(endFloat * scale) / scale;
        DateTime roundedEndDate = SqlDateOrigin.AddDays(truncated);
        DateTime startDate = roundedEndDate.AddMinutes(-(double)(period * top));

        var candles = await GetCandlesNewLocalEfAsync(
            tickerid,
            0,
            period,
            startDate,
            endDate.Value,
            top);
        return candles;
    }

    private async Task<List<LastTradingDateProcResult>> LastTradingDateProcLocalEfAsync(byte? market)
    {
        if (!market.HasValue)
            return new List<LastTradingDateProcResult>();

        var period = await (
            from dc in DayCandles.AsNoTracking()
            join dic in Dictionaries.AsNoTracking() on dc.Id equals dic.Id
            where dic.Market == market.Value
            orderby dc.Period descending
            select (DateTime?)dc.Period)
            .FirstOrDefaultAsync();

        if (!period.HasValue)
            return new List<LastTradingDateProcResult>();

        return new List<LastTradingDateProcResult>
        {
            new LastTradingDateProcResult
            {
                period = period.Value
            }
        };
    }

    private async Task<List<MarketMapPeriod4Result>> MarketMapPeriod4LocalEfAsync(
        DateTime? dat1,
        DateTime? dat2,
        byte? market,
        int? topByVolume = null)
    {
        if (!dat1.HasValue || !dat2.HasValue || !market.HasValue)
            return new List<MarketMapPeriod4Result>();

        DateTime fromDate = dat1.Value;
        DateTime toDate = dat2.Value;

        if (Database.IsSqlServer())
        {
            var p_dat1 = new SqlParameter("@dat1", SqlDbType.DateTime) { Value = fromDate };
            var p_dat2 = new SqlParameter("@dat2", SqlDbType.DateTime) { Value = toDate };
            var p_market = new SqlParameter("@market", SqlDbType.TinyInt) { Value = market.Value };

            if (topByVolume.HasValue && topByVolume.Value > 0)
            {
                var p_top = new SqlParameter("@topN", SqlDbType.Int) { Value = topByVolume.Value };
                const string sqlTop = @"
select Id,
       case when (o.opnprice is null) then c.OpnPrice else o.opnprice end as Opn,
       c.ClsPrice as Cls,
       Volume,
       BuyVolume
from (
    select top (@topN)
           DayCandles.id,
           sum(Volume) as Volume,
           sum(BuyVolume) as BuyVolume
    from DayCandles
    inner join Dictionary on Dictionary.Id = DayCandles.Id and Dictionary.market = @market
    where Period >= @dat1 and Period < @dat2 and OpnPrice > 0
    group by DayCandles.id
    order by sum(Volume) desc
) as leaders
cross apply (
    select top 1 OpnPrice, clsprice
    from DayCandles as d
    where Period between @dat1 and @dat2 and d.Id = leaders.id
    order by Period desc
) as c
outer apply (
    select top 1 clsprice as opnprice
    from DayCandles as d
    where Period < @dat1 and d.Id = leaders.id
    order by Period desc
) as o
order by opn
option (recompile)";

                return await MarketMapPeriod4
                    .FromSqlRaw(sqlTop, p_top, p_dat1, p_dat2, p_market)
                    .AsNoTracking()
                    .ToListAsync();
            }

            const string sql = @"
select Id,
       case when (o.opnprice is null) then c.OpnPrice else o.opnprice end as Opn,
       c.ClsPrice as Cls,
       Volume,
       BuyVolume
from (
    select DayCandles.id,
           sum(Volume) as Volume,
           sum(BuyVolume) as BuyVolume
    from DayCandles
    inner join Dictionary on Dictionary.Id = DayCandles.Id and Dictionary.market = @market
    where Period >= @dat1 and Period < @dat2 and OpnPrice > 0
    group by DayCandles.id
) as leaders
cross apply (
    select top 1 OpnPrice, clsprice
    from DayCandles as d
    where Period between @dat1 and @dat2 and d.Id = leaders.id
    order by Period desc
) as c
outer apply (
    select top 1 clsprice as opnprice
    from DayCandles as d
    where Period < @dat1 and d.Id = leaders.id
    order by Period desc
) as o
order by opn
option (recompile)";

            return await MarketMapPeriod4
                .FromSqlRaw(sql, p_dat1, p_dat2, p_market)
                .AsNoTracking()
                .ToListAsync();
        }

        var leaders =
            from dc in DayCandles.AsNoTracking()
            join dic in Dictionaries.AsNoTracking() on dc.Id equals dic.Id
            where dc.Period >= fromDate
                && dc.Period < toDate
                && dc.OpnPrice > 0
                && dic.Market == market.Value
            group dc by dc.Id
            into g
            select new
            {
                Id = g.Key,
                Volume = g.Sum(x => x.Volume),
                BuyVolume = g.Sum(x => x.BuyVolume)
            };

        if (topByVolume.HasValue && topByVolume.Value > 0)
        {
            leaders = leaders
                .OrderByDescending(x => x.Volume)
                .Take(topByVolume.Value);
        }

        var query =
            from l in leaders
            from c in DayCandles
                .AsNoTracking()
                .Where(d => d.Id == l.Id && d.Period >= fromDate && d.Period <= toDate)
                .OrderByDescending(d => d.Period)
                .Select(d => new
                {
                    d.OpnPrice,
                    d.ClsPrice
                })
                .Take(1)
            from o in DayCandles
                .AsNoTracking()
                .Where(d => d.Id == l.Id && d.Period < fromDate)
                .OrderByDescending(d => d.Period)
                .Select(d => (decimal?)d.ClsPrice)
                .Take(1)
                .DefaultIfEmpty()
            let opn = o ?? c.OpnPrice
            orderby opn
            select new MarketMapPeriod4Result
            {
                Id = l.Id,
                Opn = opn,
                Cls = c.ClsPrice,
                Volume = l.Volume,
                BuyVolume = l.BuyVolume
            };

        return await query.ToListAsync();
    }

    private async Task<List<tickersResult>> TickersLocalEfAsync(string ticker, DateTime? startDate, DateTime? endDate)
    {
        if (!startDate.HasValue || !endDate.HasValue)
            return new List<tickersResult>();

        int tickerId = await ResolveTickerIdExactAsync(ticker);
        if (tickerId == 0)
            return new List<tickersResult>();

        return await Trades
            .AsNoTracking()
            .Where(t => t.Id == tickerId && t.TradeDate >= startDate.Value && t.TradeDate <= endDate.Value)
            .OrderBy(t => t.Number)
            .Select(t => new tickersResult
            {
                Number = t.Number,
                TradeDate = t.TradeDate,
                Price = t.Price,
                Quantity = t.Quantity,
                Direction = t.Direction,
                Volume = t.Volume,
                OI = t.Oi
            })
            .ToListAsync();
    }

    private async Task<List<tickersResult>> TickersByIdLocalEfAsync(int tickerid, DateTime? startDate, DateTime? endDate)
    {
        if (!startDate.HasValue || !endDate.HasValue)
            return new List<tickersResult>();

        return await Trades
            .AsNoTracking()
            .Where(t => t.Id == tickerid && t.TradeDate >= startDate.Value && t.TradeDate < endDate.Value)
            .Select(t => new tickersResult
            {
                Number = t.Number,
                TradeDate = t.TradeDate,
                Price = t.Price,
                Quantity = t.Quantity,
                Direction = t.Direction,
                Volume = t.Volume,
                OI = t.Oi
            })
            .ToListAsync();
    }

    private async Task<List<tickersdatesResult>> TickersDatesLocalEfAsync(string ticker)
    {
        int tickerId = await ResolveTickerIdExactAsync(ticker);
        if (tickerId == 0)
            return new List<tickersdatesResult>();

        var periods = await DayCandles
            .AsNoTracking()
            .Where(c => c.Id == tickerId)
            .Select(c => c.Period)
            .OrderByDescending(x => x)
            .ToListAsync();

        return periods
            .Select(x => new tickersdatesResult
            {
                period = x
            })
            .ToList();
    }

    private async Task<List<ClusterProfileResult>> ClusterProfileQLocalEfAsync(
        int tickerid,
        double period,
        DateTime startdate,
        DateTime finishdate,
        decimal step,
        byte post)
    {
        _ = post;
        decimal stepValue = step <= 0 ? 1m : step;

        if (period < 1d)
        {
            var tradesRows = await Trades
                .AsNoTracking()
                .Where(t => t.Id == tickerid && t.TradeDate >= startdate && t.TradeDate <= finishdate)
                .Select(t => new
                {
                    t.TradeDate,
                    t.Price,
                    t.Quantity,
                    t.Direction
                })
                .ToListAsync();

            return tradesRows
                .GroupBy(t => new
                {
                    Period = FloorDateBySqlRound(t.TradeDate, period),
                    Price = RoundToStep(t.Price, stepValue)
                })
                .Select(g =>
                {
                    decimal maxBuy = g.Max(x => (decimal)(x.Quantity * x.Direction));
                    decimal minSigned = g.Min(x => (decimal)(x.Quantity * ((x.Direction * 2) - 1)));
                    decimal maxTrade = (-minSigned > maxBuy) ? minSigned : maxBuy;

                    return new ClusterProfileResult
                    {
                        period = g.Key.Period,
                        price = g.Key.Price,
                        quantity = g.Sum(x => (decimal)x.Quantity),
                        buyquantity = g.Sum(x => (decimal)(x.Quantity * x.Direction)),
                        count = g.Sum(x => x.Quantity),
                        maxtrade = maxTrade
                    };
                })
                .OrderBy(x => x.period)
                .ThenBy(x => x.price)
                .ToList();
        }

        if (period >= 30000d)
        {
            int monthSpan = Math.Max(1, (int)(period / 30000d));

            var dayRows = await DayClusters
                .AsNoTracking()
                .Where(c => c.Id == tickerid && c.Period >= startdate && c.Period <= finishdate)
                .Select(c => new
                {
                    c.Period,
                    c.Price,
                    c.Quantity,
                    c.Buyquantity,
                    c.Count,
                    c.Maxtrade
                })
                .ToListAsync();

            return dayRows
                .GroupBy(x => new
                {
                    Period = FloorToMonthSpan(x.Period, monthSpan),
                    Price = RoundToStep(x.Price, stepValue)
                })
                .Select(g => new ClusterProfileResult
                {
                    period = g.Key.Period,
                    price = g.Key.Price,
                    quantity = g.Sum(x => x.Quantity),
                    buyquantity = g.Sum(x => x.Buyquantity),
                    count = g.Sum(x => x.Count),
                    maxtrade = ResolveMaxTrade(g.Min(x => x.Maxtrade), g.Max(x => x.Maxtrade))
                })
                .OrderBy(x => x.period)
                .ThenBy(x => x.price)
                .ToList();
        }

        if (Math.Abs(period - 1440d) < 1e-9)
        {
            var dayRows = await DayClusters
                .AsNoTracking()
                .Where(c => c.Id == tickerid && c.Period >= startdate && c.Period <= finishdate)
                .Select(c => new
                {
                    c.Period,
                    c.Price,
                    c.Quantity,
                    c.Buyquantity,
                    c.Count,
                    c.Maxtrade
                })
                .ToListAsync();

            return dayRows
                .GroupBy(x => new
                {
                    x.Period,
                    Price = RoundToStep(x.Price, stepValue)
                })
                .Select(g => new ClusterProfileResult
                {
                    period = g.Key.Period,
                    price = g.Key.Price,
                    quantity = g.Sum(x => x.Quantity),
                    buyquantity = g.Sum(x => x.Buyquantity),
                    count = g.Sum(x => x.Count),
                    maxtrade = ResolveMaxTrade(g.Min(x => x.Maxtrade), g.Max(x => x.Maxtrade))
                })
                .OrderBy(x => x.period)
                .ThenBy(x => x.price)
                .ToList();
        }

        if (period >= 1440d)
        {
            int days = (int)(period / 1440d);

            if (days % 7 == 0)
            {
                DateTime weekBase = new DateTime(2001, 1, 1);
                var weekRows = await DayClusters
                    .AsNoTracking()
                    .Where(c => c.Id == tickerid && c.Period >= startdate && c.Period <= finishdate)
                    .Select(c => new
                    {
                        Bucket = EF.Functions.DateDiffWeek(weekBase, c.Period),
                        c.Price,
                        c.Quantity,
                        c.Buyquantity,
                        c.Count,
                        c.Maxtrade
                    })
                    .ToListAsync();

                return weekRows
                    .GroupBy(x => new
                    {
                        x.Bucket,
                        Price = RoundToStep(x.Price, stepValue)
                    })
                    .Select(g => new ClusterProfileResult
                    {
                        period = weekBase.AddDays(g.Key.Bucket * 7),
                        price = g.Key.Price,
                        quantity = g.Sum(x => x.Quantity),
                        buyquantity = g.Sum(x => x.Buyquantity),
                        count = g.Sum(x => x.Count),
                        maxtrade = ResolveMaxTrade(g.Min(x => x.Maxtrade), g.Max(x => x.Maxtrade))
                    })
                    .OrderBy(x => x.period)
                    .ThenBy(x => x.price)
                    .ToList();
            }
        }

        if (period > 1d)
        {
            var clusterRows = await Clusters
                .AsNoTracking()
                .Where(c => c.Id == tickerid && c.Period >= startdate && c.Period <= finishdate)
                .Select(c => new
                {
                    c.Period,
                    c.Price,
                    c.Quantity,
                    c.Buyquantity,
                    c.Count,
                    c.Maxtrade
                })
                .ToListAsync();

            return clusterRows
                .GroupBy(x => new
                {
                    Period = FloorDateBySqlRound(x.Period, period),
                    Price = RoundToStep(x.Price, stepValue)
                })
                .Select(g => new ClusterProfileResult
                {
                    period = g.Key.Period,
                    price = g.Key.Price,
                    quantity = g.Sum(x => x.Quantity),
                    buyquantity = g.Sum(x => x.Buyquantity),
                    count = g.Sum(x => x.Count),
                    maxtrade = ResolveMaxTrade(g.Min(x => x.Maxtrade), g.Max(x => x.Maxtrade))
                })
                .OrderBy(x => x.period)
                .ThenBy(x => x.price)
                .ToList();
        }

        if (Math.Abs(period - 1d) < 1e-9)
        {
            var clusterRows = await Clusters
                .AsNoTracking()
                .Where(c => c.Id == tickerid && c.Period >= startdate && c.Period <= finishdate)
                .Select(c => new
                {
                    c.Period,
                    c.Price,
                    c.Quantity,
                    c.Buyquantity,
                    c.Count,
                    c.Maxtrade
                })
                .ToListAsync();

            return clusterRows
                .GroupBy(x => new
                {
                    x.Period,
                    Price = RoundToStep(x.Price, stepValue)
                })
                .Select(g => new ClusterProfileResult
                {
                    period = g.Key.Period,
                    price = g.Key.Price,
                    quantity = g.Sum(x => x.Quantity),
                    buyquantity = g.Sum(x => x.Buyquantity),
                    count = g.Sum(x => x.Count),
                    maxtrade = ResolveMaxTrade(g.Min(x => x.Maxtrade), g.Max(x => x.Maxtrade))
                })
                .OrderBy(x => x.period)
                .ThenBy(x => x.price)
                .ToList();
        }

        return new List<ClusterProfileResult>();
    }

    private async Task<List<VolumeSearchResult>> VolumeSearchLocalEfAsync(
        string ticker,
        int? period,
        DateTime? startdate,
        DateTime? finishdate,
        decimal step)
    {
        if (string.IsNullOrWhiteSpace(ticker) || !period.HasValue || !startdate.HasValue || !finishdate.HasValue)
            return new List<VolumeSearchResult>();

        int tickerId = await ResolveTickerIdExactAsync(ticker);
        if (tickerId == 0)
            return new List<VolumeSearchResult>();

        var tabout = await ClusterProfileQLocalEfAsync(
            tickerId,
            period.Value,
            startdate.Value,
            finishdate.Value,
            step,
            1);

        if (tabout.Count == 0)
            return new List<VolumeSearchResult>();

        return tabout
            .GroupBy(x => x.period)
            .Select(g =>
            {
                decimal sumQuantity = g.Sum(x => x.quantity);
                decimal sumBuyQuantity = g.Sum(x => x.buyquantity);
                decimal maxQuantity = g.Max(x => x.quantity);

                var bestPrice = g
                    .OrderByDescending(x => x.quantity)
                    .Select(x => x.price)
                    .First();

                return new VolumeSearchResult
                {
                    Time = g.Key,
                    Price = bestPrice,
                    MaxVolume = (int)maxQuantity,
                    TotalVolume = (int)sumQuantity,
                    BarSize = g.Count(),
                    Trades = g.Sum(x => x.count),
                    Ask = (int)sumBuyQuantity,
                    Bid = (int)(sumQuantity - sumBuyQuantity),
                    Delta = (int)(-sumQuantity + 2 * sumBuyQuantity)
                };
            })
            .OrderBy(x => x.Time)
            .ToList();
    }
}
