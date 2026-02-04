using Microsoft.EntityFrameworkCore;
using StockChart.Model;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace StockChart.Data;

public static class BondPriceQueries
{
    public static async Task<Dictionary<int, decimal>> GetBondMoneyPricesAsync(
        this ApplicationDbContext context,
        IEnumerable<int> bondIds,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(context);

        if (bondIds == null)
        {
            return new Dictionary<int, decimal>();
        }

        var ids = bondIds.Distinct().Where(id => id > 0).ToList();
        if (ids.Count == 0)
        {
            return new Dictionary<int, decimal>();
        }

        var snapshotRows = await (from s in context.BondMarketSnapshots.AsNoTracking()
                                  where ids.Contains(s.DictionaryId)
                                  group s by s.DictionaryId
            into g
                                  select new
                                  {
                                      Id = g.Key,
                                      PriceRub = g.OrderByDescending(x => x.ImportedAt).Select(x => x.PriceRub).FirstOrDefault(),
                                      PricePct = g.OrderByDescending(x => x.ImportedAt).Select(x => x.PricePctOfPar).FirstOrDefault()
                                  })
            .ToListAsync(cancellationToken);

        var snapshotMap = snapshotRows.ToDictionary(x => x.Id, x => new SnapshotPrice(x.PriceRub, x.PricePct));

        var tradeRows = await (from t in context.Trades.AsNoTracking()
                               join mt in context.MaxTrades.AsNoTracking()
                                   on new { t.Id, t.Number } equals new { Id = mt.Id, Number = mt.MaxNumber }
                               where ids.Contains(t.Id)
                               select new
                               {
                                   t.Id,
                                   t.Price,
                                   t.Volume,
                                   t.Quantity
                               })
            .ToListAsync(cancellationToken);

        var candleRows = await (from c in context.DayCandles.AsNoTracking()
                                where ids.Contains(c.Id)
                                group c by c.Id
            into g
                                select new
                                {
                                    Id = g.Key,
                                    Price = g.OrderByDescending(x => x.Period).Select(x => x.ClsPrice).FirstOrDefault()
                                })
            .ToListAsync(cancellationToken);

        var faceValues = await context.BondSpecs.AsNoTracking()
            .Where(b => ids.Contains(b.DictionaryId) && b.FaceValue.HasValue && b.FaceValue.Value > 0)
            .ToDictionaryAsync(b => b.DictionaryId, b => b.FaceValue!.Value, cancellationToken);

        var lotSizes = await context.Dictionaries.AsNoTracking()
            .Where(d => ids.Contains(d.Id))
            .ToDictionaryAsync(d => d.Id, d => d.Lotsize ?? 1, cancellationToken);

        var tradeMap = tradeRows.ToDictionary(
            x => x.Id,
            x => new TradeSnapshot(x.Price, x.Volume, x.Quantity));
        var candleMap = candleRows.ToDictionary(x => x.Id, x => x.Price);

        var result = new Dictionary<int, decimal>();
        foreach (var id in ids)
        {
            if (snapshotMap.TryGetValue(id, out var snap))
            {
                if (snap.PricePct.HasValue && snap.PricePct.Value > 0 && faceValues.TryGetValue(id, out var faceValue))
                {
                    result[id] = snap.PricePct.Value / 100m * faceValue;
                    continue;
                }

                if (snap.PriceRub.HasValue && snap.PriceRub.Value > 0)
                {
                    result[id] = snap.PriceRub.Value;
                    continue;
                }
            }

            if (TryGetMoneyPriceFromTrade(id, tradeMap, faceValues, lotSizes, out var moneyPrice) ||
                TryGetMoneyPriceFromCandle(id, candleMap, faceValues, out moneyPrice))
            {
                result[id] = moneyPrice;
            }
        }

        return result;
    }

    private static bool TryGetMoneyPriceFromTrade(
        int id,
        IReadOnlyDictionary<int, TradeSnapshot> tradeMap,
        IReadOnlyDictionary<int, decimal> faceValues,
        IReadOnlyDictionary<int, int> lotSizes,
        out decimal price)
    {
        price = 0m;
        if (!tradeMap.TryGetValue(id, out var trade))
        {
            return false;
        }

        var moneyFromVolume = 0m;
        if (trade.Volume <= 0 || trade.Quantity <= 0)
        {
            moneyFromVolume = 0m;
        }
        else
        {
            var lotSize = lotSizes.TryGetValue(id, out var lot) && lot > 0 ? lot : 1;
            var denominator = (decimal)trade.Quantity * lotSize;
            if (denominator > 0)
            {
                moneyFromVolume = trade.Volume / denominator;
            }
        }

        if (faceValues.TryGetValue(id, out var faceValue) && faceValue > 0 && trade.Price > 0)
        {
            var moneyFromPercent = trade.Price / 100m * faceValue;

            if (moneyFromVolume > 0)
            {
                // If raw trade price looks like percent (<200), but volume-implied money is much higher,
                // trust volume to fix scaling quirks.
                if (trade.Price < 200m && moneyFromVolume > moneyFromPercent * 1.5m)
                {
                    price = moneyFromVolume;
                    return true;
                }

                price = moneyFromPercent;
                return true;
            }

            price = moneyFromPercent;
            return true;
        }

        if (moneyFromVolume > 0)
        {
            price = moneyFromVolume;
            return true;
        }

        if (trade.Price > 0)
        {
            price = trade.Price;
            return true;
        }

        return false;
    }

    private static bool TryGetMoneyPriceFromCandle(
        int id,
        IReadOnlyDictionary<int, decimal> candleMap,
        IReadOnlyDictionary<int, decimal> faceValues,
        out decimal price)
    {
        price = 0m;
        if (!candleMap.TryGetValue(id, out var candlePrice) || candlePrice <= 0)
        {
            return false;
        }

        if (faceValues.TryGetValue(id, out var faceValue))
        {
            price = candlePrice / 100m * faceValue;
            return true;
        }

        price = candlePrice;
        return true;
    }

    private sealed record TradeSnapshot(decimal Price, decimal Volume, int Quantity);
    private sealed record SnapshotPrice(decimal? PriceRub, decimal? PricePct);
}
