using Microsoft.EntityFrameworkCore;

namespace StockChart.Model;

public partial class ApplicationDbContext
{
    private static string RemoveAoPrefix(string? shortName)
    {
        if (string.IsNullOrWhiteSpace(shortName))
            return string.Empty;

        var value = shortName.Trim();

        string[] prefixes =
        {
            "ПАО ",
            "АО ",
            "ОАО ",
            "ПАО\"",
            "АО\"",
            "ОАО\"",
            "ПАО «",
            "АО «",
            "ОАО «"
        };

        foreach (var prefix in prefixes)
        {
            if (value.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
            {
                value = value.Substring(prefix.Length).Trim();
                break;
            }
        }

        return value.Trim('"', '«', '»', '\'', ' ');
    }

    private async Task<List<candleseekerResult>> VolumeSplashLocalEfAsync(int bigPeriod, int smallPeriod, byte market, double splash)
    {
        var endDate = await (
            from dc in DayCandles.AsNoTracking()
            join dic0 in Dictionaries.AsNoTracking() on dc.Id equals dic0.Id
            where dic0.Market == 0
            select (DateTime?)dc.Period)
            .MaxAsync();

        if (!endDate.HasValue)
            return new List<candleseekerResult>();

        var smallFrom = endDate.Value.AddDays(-smallPeriod);
        var bigFrom = endDate.Value.AddDays(-bigPeriod);
        var splashDecimal = (decimal)splash;

        var maxById = DayCandles
            .AsNoTracking()
            .Where(d => d.Period > smallFrom)
            .GroupBy(d => d.Id)
            .Select(g => new
            {
                Id = g.Key,
                MaxVolume = g.Max(x => x.Volume)
            });

        var avgById = DayCandles
            .AsNoTracking()
            .Where(d => d.Period > bigFrom)
            .GroupBy(d => d.Id)
            .Select(g => new
            {
                Id = g.Key,
                AvgVal = g.Average(x => x.Volume)
            });

        var baseRows = await (
            from q in maxById
            join avg in avgById on q.Id equals avg.Id
            join dic in Dictionaries.AsNoTracking().Where(d => d.Market == market) on avg.Id equals dic.Id
            where avg.AvgVal > 0 && (q.MaxVolume / avg.AvgVal) > splashDecimal
            let cls = DayCandles.AsNoTracking()
                .Where(d => d.Id == q.Id)
                .OrderByDescending(d => d.Period)
                .Select(d => d.ClsPrice)
                .FirstOrDefault()
            orderby q.MaxVolume / avg.AvgVal descending
            select new
            {
                Huge = q.MaxVolume / avg.AvgVal,
                Max = q.MaxVolume,
                AvgVal = avg.AvgVal,
                Ticker = dic.Securityid,
                ShortName = dic.Shortname,
                Cls = cls
            })
            .ToListAsync();

        return baseRows
            .Select(x => new candleseekerResult
            {
                huge = x.Huge,
                max = x.Max,
                avgval = x.AvgVal,
                ticker = x.Ticker,
                name = RemoveAoPrefix(x.ShortName),
                cls = x.Cls
            })
            .ToList();
    }
}
