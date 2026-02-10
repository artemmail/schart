using Microsoft.EntityFrameworkCore;

namespace StockChart.Model;

public partial class ApplicationDbContext
{
    private async Task<List<TopOrdersResult>> TopOrdersLocalEfAsync(string ticker, int? bigPeriod)
    {
        if (string.IsNullOrWhiteSpace(ticker) || !bigPeriod.HasValue)
            return new List<TopOrdersResult>();

        int periodDays = bigPeriod.Value;
        if (periodDays > 14)
            periodDays = 14;

        var tickerId = await Dictionaries
            .AsNoTracking()
            .Where(d => d.Securityid == ticker)
            .Select(d => (int?)d.Id)
            .FirstOrDefaultAsync() ?? 0;

        if (tickerId == 0)
            return new List<TopOrdersResult>();

        var lastDayPeriod = await DayCandles
            .AsNoTracking()
            .Where(d => d.Id == tickerId)
            .Select(d => (DateTime?)d.Period)
            .MaxAsync();

        if (!lastDayPeriod.HasValue)
            return new List<TopOrdersResult>();

        DateTime endDate = lastDayPeriod.Value.AddDays(1);
        DateTime startDate = endDate.AddDays(-periodDays);

        return await Trades
            .AsNoTracking()
            .Where(t => t.Id == tickerId && t.TradeDate >= startDate && t.TradeDate <= endDate)
            .OrderByDescending(t => t.Quantity)
            .Take(200)
            .Select(t => new TopOrdersResult
            {
                tradeDate = t.TradeDate,
                price = t.Price,
                quantity = t.Quantity,
                volume = t.Volume,
                direction = t.Direction
            })
            .ToListAsync();
    }

    private async Task<List<TopOrdersResult>> TopOrdersPeriodLocalEfAsync(string ticker, DateTime startDate, DateTime endDate, int topN)
    {
        var tickerId = await Dictionaries
            .AsNoTracking()
            .Where(d => d.Securityid == ticker)
            .Select(d => (int?)d.Id)
            .FirstOrDefaultAsync() ?? 0;

        if ((endDate - startDate).TotalDays > 14)
            startDate = endDate.AddDays(-14);

        if (tickerId == 0 || topN <= 0)
            return new List<TopOrdersResult>();

        return await Trades
            .AsNoTracking()
            .Where(t => t.Id == tickerId && t.TradeDate >= startDate && t.TradeDate <= endDate)
            .OrderByDescending(t => t.Quantity)
            .Take(topN)
            .Select(t => new TopOrdersResult
            {
                tradeDate = t.TradeDate,
                price = t.Price,
                quantity = t.Quantity,
                volume = t.Volume,
                direction = t.Direction
            })
            .ToListAsync();
    }
}
