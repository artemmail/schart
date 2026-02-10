using Microsoft.EntityFrameworkCore;

namespace StockChart.Model;

public partial class ApplicationDbContext
{
    private sealed class ClusterSourceRow
    {
        public DateTime Period { get; set; }
        public decimal Price { get; set; }
        public decimal Quantity { get; set; }
        public decimal BuyQuantity { get; set; }
        public int Count { get; set; }
        public decimal MaxTrade { get; set; }
    }

    private sealed class ClusterAggregateState
    {
        public decimal Quantity { get; private set; }
        public decimal BuyQuantity { get; private set; }
        public int Count { get; private set; }
        public decimal MinMaxTrade { get; private set; } = decimal.MaxValue;
        public decimal MaxMaxTrade { get; private set; } = decimal.MinValue;

        public void Add(ClusterSourceRow row)
        {
            Quantity += row.Quantity;
            BuyQuantity += row.BuyQuantity;
            Count += row.Count;
            if (row.MaxTrade < MinMaxTrade)
                MinMaxTrade = row.MaxTrade;
            if (row.MaxTrade > MaxMaxTrade)
                MaxMaxTrade = row.MaxTrade;
        }
    }

    private static int FindCandleWindowIndex(IReadOnlyList<DateTime> candleStarts, DateTime value)
    {
        int lo = 0;
        int hi = candleStarts.Count - 1;

        while (lo <= hi)
        {
            int mid = lo + ((hi - lo) / 2);
            var midValue = candleStarts[mid];
            if (midValue <= value)
                lo = mid + 1;
            else
                hi = mid - 1;
        }

        return hi;
    }

    public async Task<List<ClusterProfileResult>> ClusterProfileFromClusterSqlLocalEfAsync(
        int tickerid,
        int period,
        DateTime startdate,
        DateTime finishdate,
        decimal step,
        IReadOnlyList<Candle> candles)
    {
        if (period <= 0 || candles.Count == 0)
            return new List<ClusterProfileResult>();

        decimal stepValue = step <= 0 ? 1m : step;

        var candleStarts = candles
            .Select(c => c.Period)
            .Distinct()
            .OrderBy(x => x)
            .ToList();

        if (candleStarts.Count == 0)
            return new List<ClusterProfileResult>();

        DateTime firstStart = candleStarts[0];
        bool useDayClusters = period >= 1440;
        bool addOneToMaxTrade = period > 1 && period < 1440;

        List<ClusterSourceRow> sourceRows;
        if (useDayClusters)
        {
            sourceRows = await DayClusters
                .AsNoTracking()
                .Where(x => x.Id == tickerid && x.Period >= firstStart && x.Period <= finishdate)
                .OrderBy(x => x.Period)
                .Select(x => new ClusterSourceRow
                {
                    Period = x.Period,
                    Price = x.Price,
                    Quantity = x.Quantity,
                    BuyQuantity = x.Buyquantity,
                    Count = x.Count,
                    MaxTrade = x.Maxtrade
                })
                .ToListAsync();
        }
        else
        {
            sourceRows = await Clusters
                .AsNoTracking()
                .Where(x => x.Id == tickerid && x.Period >= firstStart && x.Period <= finishdate)
                .OrderBy(x => x.Period)
                .Select(x => new ClusterSourceRow
                {
                    Period = x.Period,
                    Price = x.Price,
                    Quantity = x.Quantity,
                    BuyQuantity = x.Buyquantity,
                    Count = x.Count,
                    MaxTrade = x.Maxtrade
                })
                .ToListAsync();
        }

        if (sourceRows.Count == 0)
            return new List<ClusterProfileResult>();

        var grouped = new Dictionary<(DateTime Period, decimal Price), ClusterAggregateState>();

        foreach (var row in sourceRows)
        {
            int idx = FindCandleWindowIndex(candleStarts, row.Period);
            if (idx < 0)
                continue;

            var bucketPeriod = candleStarts[idx];

            if (idx + 1 < candleStarts.Count && row.Period >= candleStarts[idx + 1])
                continue;

            decimal roundedPrice = RoundToStep(row.Price, stepValue);
            var key = (bucketPeriod, roundedPrice);
            if (!grouped.TryGetValue(key, out var state))
            {
                state = new ClusterAggregateState();
                grouped[key] = state;
            }

            state.Add(row);
        }

        return grouped
            .Select(x => new ClusterProfileResult
            {
                period = x.Key.Period,
                price = x.Key.Price,
                quantity = x.Value.Quantity,
                buyquantity = x.Value.BuyQuantity,
                count = x.Value.Count,
                maxtrade = (addOneToMaxTrade ? 1m : 0m) + ResolveMaxTrade(x.Value.MinMaxTrade, x.Value.MaxMaxTrade)
            })
            .OrderBy(x => x.period)
            .ThenBy(x => x.price)
            .ToList();
    }
}

