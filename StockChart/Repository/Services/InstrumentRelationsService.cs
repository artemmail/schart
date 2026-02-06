using System;
using Microsoft.EntityFrameworkCore;
using StockChart.Data;
using StockChart.Model;
using StockChart.Repository.Interfaces;
using DictionaryEntity = StockChart.Model.Dictionary;

namespace StockChart.Repository.Services
{
    public sealed class InstrumentRelationsService : IInstrumentRelationsService
    {
        private const byte MarketStocks = 0;
        private const byte MarketFutures = 1;
        private const byte MarketBonds = 2;
        private const byte MarketOptions = 7;

        private const byte LinkSameIssuer = 1;
        private const byte LinkUnderlying = 2;

        private readonly ApplicationDbContext _db;
        private readonly IMoexApiService _moexApiService;

        public InstrumentRelationsService(ApplicationDbContext db, IMoexApiService moexApiService)
        {
            _db = db;
            _moexApiService = moexApiService;
        }

        public async Task<InstrumentRelationsDto?> GetRelationsAsync(string stockSecId, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(stockSecId))
            {
                return null;
            }

            var normalized = stockSecId.Trim().ToUpperInvariant();
            var stock = await _db.Dictionaries
                .AsNoTracking()
                .FirstOrDefaultAsync(d => d.Market == MarketStocks && d.Securityid == normalized, cancellationToken);

            if (stock == null)
            {
                stock = await _db.Dictionaries
                    .AsNoTracking()
                    .FirstOrDefaultAsync(d => d.Securityid == normalized, cancellationToken);
            }

            if (stock == null)
            {
                return null;
            }

            var today = DateTime.Today;
            var baseCode = ResolveBaseCode(stock.Securityid);

            var links = await _db.SecurityLinks
                .AsNoTracking()
                .Where(l => l.FromDictionaryId == stock.Id || l.ToDictionaryId == stock.Id)
                .ToListAsync(cancellationToken);

            var bondDicts = new Dictionary<int, DictionaryEntity>();
            var futureDicts = new Dictionary<int, DictionaryEntity>();
            var optionDicts = new Dictionary<int, DictionaryEntity>();

            if (links.Count > 0)
            {
                var relatedIds = links
                    .Select(l => l.FromDictionaryId == stock.Id ? l.ToDictionaryId : l.FromDictionaryId)
                    .Distinct()
                    .ToList();

                var related = await _db.Dictionaries
                    .AsNoTracking()
                    .Where(d => relatedIds.Contains(d.Id))
                    .ToDictionaryAsync(d => d.Id, cancellationToken);

                foreach (var link in links)
                {
                    var otherId = link.FromDictionaryId == stock.Id ? link.ToDictionaryId : link.FromDictionaryId;
                    if (!related.TryGetValue(otherId, out var dic))
                    {
                        continue;
                    }

                    if (link.LinkType == LinkSameIssuer)
                    {
                        if (!bondDicts.ContainsKey(dic.Id))
                        {
                            bondDicts[dic.Id] = dic;
                        }
                        continue;
                    }

                    if (link.LinkType == LinkUnderlying)
                    {
                        if (dic.Market == MarketFutures)
                        {
                            if (!futureDicts.ContainsKey(dic.Id))
                            {
                                futureDicts[dic.Id] = dic;
                            }
                        }
                        else if (dic.Market == MarketOptions)
                        {
                            if (!optionDicts.ContainsKey(dic.Id))
                            {
                                optionDicts[dic.Id] = dic;
                            }
                        }
                    }
                }
            }

            if (bondDicts.Count == 0 && stock.EmitentId.HasValue)
            {
                var bonds = await _db.Dictionaries
                    .AsNoTracking()
                    .Where(d => d.Market == MarketBonds && d.EmitentId == stock.EmitentId)
                    .ToListAsync(cancellationToken);

                foreach (var bond in bonds)
                {
                    if (!bondDicts.ContainsKey(bond.Id))
                    {
                        bondDicts[bond.Id] = bond;
                    }
                }
            }

            if (futureDicts.Count == 0 || optionDicts.Count == 0)
            {
                var mappedAssets = await _db.UnderlyingMaps
                    .AsNoTracking()
                    .Where(m => m.SpotSecId == stock.Securityid)
                    .Select(m => m.AssetCode)
                    .ToListAsync(cancellationToken);

                var assetSet = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                foreach (var code in mappedAssets)
                {
                    if (!string.IsNullOrWhiteSpace(code))
                    {
                        assetSet.Add(code.Trim());
                    }
                }

                if (!string.IsNullOrWhiteSpace(stock.Securityid))
                {
                    assetSet.Add(stock.Securityid.Trim());
                }

                if (!string.IsNullOrWhiteSpace(baseCode))
                {
                    assetSet.Add(baseCode);
                }

                var normalizedAssets = assetSet
                    .Where(a => !string.IsNullOrWhiteSpace(a))
                    .Select(a => a.Trim().ToUpperInvariant())
                    .ToList();

                if (normalizedAssets.Count > 0)
                {
                    if (futureDicts.Count == 0)
                    {
                        var futures = await (from f in _db.FutureSpecs.AsNoTracking()
                                             join d in _db.Dictionaries.AsNoTracking() on f.DictionaryId equals d.Id
                                             where d.Market == MarketFutures
                                                   && f.AssetCode != null
                                                   && normalizedAssets.Contains(f.AssetCode)
                                                   && (!f.ExpirationDate.HasValue || f.ExpirationDate.Value >= today)
                                             select d)
                            .ToListAsync(cancellationToken);

                        foreach (var fut in futures)
                        {
                            if (!futureDicts.ContainsKey(fut.Id))
                            {
                                futureDicts[fut.Id] = fut;
                            }
                        }
                    }

                    if (optionDicts.Count == 0)
                    {
                        var options = await (from o in _db.OptionSpecs.AsNoTracking()
                                             join d in _db.Dictionaries.AsNoTracking() on o.DictionaryId equals d.Id
                                             where d.Market == MarketOptions
                                                   && o.AssetCode != null
                                                   && normalizedAssets.Contains(o.AssetCode)
                                                   && (!o.ExpirationDate.HasValue || o.ExpirationDate.Value >= today)
                                             select d)
                            .ToListAsync(cancellationToken);

                        foreach (var opt in options)
                        {
                            if (!optionDicts.ContainsKey(opt.Id))
                            {
                                optionDicts[opt.Id] = opt;
                            }
                        }
                    }
                }
            }

            if (futureDicts.Count == 0 && !string.IsNullOrWhiteSpace(baseCode))
            {
                var futures = await (from f in _db.FutureSpecs.AsNoTracking()
                                     join d in _db.Dictionaries.AsNoTracking() on f.DictionaryId equals d.Id
                                     where d.Market == MarketFutures
                                           && d.Securityid.StartsWith(baseCode)
                                           && (!f.ExpirationDate.HasValue || f.ExpirationDate.Value >= today)
                                     select d)
                    .ToListAsync(cancellationToken);

                foreach (var fut in futures)
                {
                    if (!futureDicts.ContainsKey(fut.Id))
                    {
                        futureDicts[fut.Id] = fut;
                    }
                }
            }

            if (optionDicts.Count == 0 && !string.IsNullOrWhiteSpace(baseCode))
            {
                var options = await (from o in _db.OptionSpecs.AsNoTracking()
                                     join d in _db.Dictionaries.AsNoTracking() on o.DictionaryId equals d.Id
                                     where d.Market == MarketOptions
                                           && d.Securityid.StartsWith(baseCode)
                                           && (!o.ExpirationDate.HasValue || o.ExpirationDate.Value >= today)
                                     select d)
                    .ToListAsync(cancellationToken);

                foreach (var opt in options)
                {
                    if (!optionDicts.ContainsKey(opt.Id))
                    {
                        optionDicts[opt.Id] = opt;
                    }
                }
            }

            var bondIds = bondDicts.Keys.ToList();
            var bondSpecMap = bondIds.Count == 0
                ? new Dictionary<int, BondSpec>()
                : await _db.BondSpecs
                    .AsNoTracking()
                    .Where(b => bondIds.Contains(b.DictionaryId))
                    .ToDictionaryAsync(b => b.DictionaryId, cancellationToken);
            var bondsWithCandles = bondIds.Count == 0
                ? new HashSet<int>()
                : new HashSet<int>(await _db.DayCandles
                    .AsNoTracking()
                    .Where(c => bondIds.Contains(c.Id))
                    .Select(c => c.Id)
                    .Distinct()
                    .ToListAsync(cancellationToken));

            var bondsWithTrades = bondIds.Count == 0
                ? new HashSet<int>()
                : new HashSet<int>(await _db.MaxTrades
                    .AsNoTracking()
                    .Where(t => bondIds.Contains(t.Id) && t.MaxNumber > 0)
                    .Select(t => t.Id)
                    .Distinct()
                    .ToListAsync(cancellationToken));

            var bondsKeep = new HashSet<int>(bondsWithTrades);
            bondsKeep.UnionWith(bondsWithCandles);

            var futureIds = futureDicts.Keys.ToList();
            var futureSpecMap = futureIds.Count == 0
                ? new Dictionary<int, FutureSpec>()
                : await _db.FutureSpecs
                    .AsNoTracking()
                    .Where(f => futureIds.Contains(f.DictionaryId))
                    .ToDictionaryAsync(f => f.DictionaryId, cancellationToken);

            var optionIds = optionDicts.Keys.ToList();
            var optionSpecMap = optionIds.Count == 0
                ? new Dictionary<int, OptionSpec>()
                : await _db.OptionSpecs
                    .AsNoTracking()
                    .Where(o => optionIds.Contains(o.DictionaryId))
                    .ToDictionaryAsync(o => o.DictionaryId, cancellationToken);

            var bondsForOutput = bondDicts.Values
                .Where(dic => bondsKeep.Contains(dic.Id)
                              && (!dic.ToDate.HasValue || dic.ToDate.Value.Date >= today.Date))
                .ToList();

            var bondPriceMap = await LoadBondLastPricesAsync(bondsForOutput, cancellationToken);
            var bondYieldMap = await LoadBondMarketYieldsAsync(bondsForOutput, cancellationToken);
            var bondCouponsMap = await LoadBondCouponsAsync(bondsForOutput, cancellationToken);

            var bondsResult = bondsForOutput
                .Select(dic =>
                {
                    decimal? currentPrice = null;
                    if (bondPriceMap.TryGetValue(dic.Id, out var foundPrice))
                    {
                        currentPrice = foundPrice;
                    }

                    var spec = bondSpecMap.TryGetValue(dic.Id, out var specRow) ? specRow : null;
                    var coupon = ResolveCouponInfo(dic.Id, bondCouponsMap, today, out var couponPeriodDays);
                    var couponSchedule = bondCouponsMap.TryGetValue(dic.Id, out var schedule) ? schedule : null;
                    decimal? currentYield = null;
                    if (bondYieldMap.TryGetValue(dic.Id, out var marketYield) && marketYield > 0)
                    {
                        currentYield = marketYield;
                    }
                    else
                    {
                        currentYield = CalculateCurrentYield(spec, coupon, couponPeriodDays, currentPrice);
                    }

                    var isCouponed = spec?.IsCouponed;
                    if (!isCouponed.HasValue && couponSchedule != null)
                    {
                        isCouponed = couponSchedule.Any(c => c.Value.HasValue && c.Value.Value > 0m);
                    }

                    var nextCouponDate = ResolveNextCouponDate(couponSchedule, today);
                    if (!nextCouponDate.HasValue)
                    {
                        nextCouponDate = spec?.NextCouponDate;
                    }

                    return MapBondItem(dic, spec, currentYield, currentPrice, isCouponed, nextCouponDate);
                })
                .OrderBy(b => b.SecurityId)
                .ToList();

            var futuresResult = futureDicts.Values
                .Where(dic => !futureSpecMap.TryGetValue(dic.Id, out var spec) || !spec.ExpirationDate.HasValue || spec.ExpirationDate.Value >= today)
                .Select(MapItem)
                .OrderBy(f => f.SecurityId)
                .ToList();

            var optionsResult = optionDicts.Values
                .Where(dic => !optionSpecMap.TryGetValue(dic.Id, out var spec) || !spec.ExpirationDate.HasValue || spec.ExpirationDate.Value >= today)
                .Select(MapItem)
                .OrderBy(o => o.SecurityId)
                .ToList();

            return new InstrumentRelationsDto
            {
                Stock = MapItem(stock),
                Bonds = bondsResult,
                Futures = futuresResult,
                Options = optionsResult
            };
        }

        private static string? ResolveBaseCode(string? securityId)
        {
            if (string.IsNullOrWhiteSpace(securityId))
            {
                return null;
            }

            var trimmed = securityId.Trim().ToUpperInvariant();
            if (trimmed.Length <= 2)
            {
                return trimmed;
            }

            return trimmed.Substring(0, 2);
        }

        private async Task<Dictionary<int, decimal>> LoadBondLastPricesAsync(
            IEnumerable<DictionaryEntity> bonds,
            CancellationToken cancellationToken)
        {
            var bondIds = bonds
                .Select(b => b.Id)
                .Distinct()
                .ToList();

            return await _db.GetBondMoneyPricesAsync(bondIds, cancellationToken);
        }

        private async Task<Dictionary<int, decimal>> LoadBondMarketYieldsAsync(
            IEnumerable<DictionaryEntity> bonds,
            CancellationToken cancellationToken)
        {
            var bondIds = bonds
                .Select(b => b.Id)
                .Distinct()
                .ToList();

            if (bondIds.Count == 0)
            {
                return new Dictionary<int, decimal>();
            }

            var rows = await (from s in _db.BondMarketSnapshots.AsNoTracking()
                              where bondIds.Contains(s.DictionaryId)
                              group s by s.DictionaryId
                into g
                              select new
                              {
                                  Id = g.Key,
                                  YieldPct = g.OrderByDescending(x => x.ImportedAt).Select(x => x.YieldPct).FirstOrDefault()
                              })
                .ToListAsync(cancellationToken);

            return rows
                .Where(r => r.YieldPct.HasValue && r.YieldPct.Value > 0)
                .ToDictionary(r => r.Id, r => r.YieldPct!.Value);
        }

        private async Task<Dictionary<int, List<BondCouponInfo>>> LoadBondCouponsAsync(
            IEnumerable<DictionaryEntity> bonds,
            CancellationToken cancellationToken)
        {
            var bondIds = bonds
                .Select(b => b.Id)
                .Distinct()
                .ToList();

            if (bondIds.Count == 0)
            {
                return new Dictionary<int, List<BondCouponInfo>>();
            }

            var rows = await _db.BondCoupons
                .AsNoTracking()
                .Where(c => bondIds.Contains(c.DictionaryId)
                            && c.CouponDate.HasValue)
                .Select(c => new
                {
                    c.DictionaryId,
                    c.CouponDate,
                    c.CouponValue,
                    c.CouponYieldPct,
                    c.PercentOfMarket,
                    c.PercentOfPar
                })
                .ToListAsync(cancellationToken);

            return rows
                .GroupBy(r => r.DictionaryId)
                .ToDictionary(
                    g => g.Key,
                    g => g.OrderBy(r => r.CouponDate)
                        .Select(r => new BondCouponInfo(
                            r.CouponDate!.Value,
                            r.CouponValue,
                            r.CouponYieldPct,
                            r.PercentOfMarket,
                            r.PercentOfPar))
                        .ToList());
        }

        private static InstrumentRelationItemDto MapItem(DictionaryEntity dic)
        {
            return new InstrumentRelationItemDto
            {
                DictionaryId = dic.Id,
                SecurityId = dic.Securityid,
                Shortname = dic.Shortname,
                Market = dic.Market,
                Isin = dic.Isin
            };
        }

        private static InstrumentRelationItemDto MapBondItem(
            DictionaryEntity dic,
            BondSpec? spec,
            decimal? currentYield,
            decimal? currentPrice,
            bool? isCouponed,
            DateTime? nextCouponDate)
        {
            var dto = MapItem(dic);
            dto.CurrentYield = currentYield;
            dto.CurrentPrice = currentPrice;
            dto.IsCouponed = isCouponed;
            dto.NextCouponDate = nextCouponDate;
            if (spec == null)
            {
                return dto;
            }

            dto.RegNumber = spec.RegNumber;
            dto.MaturityDate = spec.MaturityDate;
            dto.FaceValue = spec.FaceValue;
            dto.Currency = spec.Currency;
            dto.PrimaryBoardId = spec.PrimaryBoardId;
            if (!dto.IsCouponed.HasValue)
            {
                dto.IsCouponed = spec.IsCouponed;
            }
            if (!dto.NextCouponDate.HasValue && spec.NextCouponDate.HasValue)
            {
                dto.NextCouponDate = spec.NextCouponDate;
            }
            if (!string.IsNullOrWhiteSpace(spec.Isin))
            {
                dto.Isin = spec.Isin;
            }

            return dto;
        }

        private static BondCouponInfo? ResolveCouponInfo(
            int dictionaryId,
            IReadOnlyDictionary<int, List<BondCouponInfo>> couponMap,
            DateTime today,
            out int? periodDays)
        {
            periodDays = null;
            if (!couponMap.TryGetValue(dictionaryId, out var coupons) || coupons.Count == 0)
            {
                return null;
            }

            var next = coupons.FirstOrDefault(c => c.Date.Date >= today.Date) ?? coupons.Last();
            if (coupons.Count < 2)
            {
                return next;
            }

            var index = coupons.IndexOf(next);
            if (index > 0)
            {
                var prev = coupons[index - 1];
                var diff = (next.Date.Date - prev.Date.Date).TotalDays;
                if (diff > 0)
                {
                    periodDays = (int)diff;
                    return next;
                }
            }

            if (index + 1 < coupons.Count)
            {
                var future = coupons[index + 1];
                var diff = (future.Date.Date - next.Date.Date).TotalDays;
                if (diff > 0)
                {
                    periodDays = (int)diff;
                }
            }

            return next;
        }

        private static DateTime? ResolveNextCouponDate(
            IReadOnlyList<BondCouponInfo>? coupons,
            DateTime today)
        {
            if (coupons == null || coupons.Count == 0)
            {
                return null;
            }

            var next = coupons.FirstOrDefault(c => c.Date.Date >= today.Date);
            return next?.Date;
        }

        private static decimal? CalculateCurrentYield(
            BondSpec? spec,
            BondCouponInfo? coupon,
            int? periodDays,
            decimal? price)
        {
            if (!price.HasValue || price.Value <= 0)
            {
                return null;
            }

            var faceValue = spec?.FaceValue;
            var days = periodDays ?? spec?.CouponPeriodDays;

            var couponRate = NormalizePercent(spec?.CouponRate);
            if (couponRate.HasValue == true && faceValue.HasValue && faceValue.Value > 0)
            {
                var annualCoupon = faceValue.Value * couponRate.Value / 100m;
                if (annualCoupon > 0)
                {
                    return annualCoupon / price.Value * 100m;
                }
            }

            decimal? couponValue = null;
            var percentOfPar = NormalizePercent(coupon?.PercentOfPar);
            if (percentOfPar.HasValue && percentOfPar.Value > 0 && faceValue.HasValue && faceValue.Value > 0)
            {
                couponValue = faceValue.Value * percentOfPar.Value / 100m;
            }
            else if (coupon?.Value.HasValue == true && coupon.Value.Value > 0)
            {
                couponValue = coupon.Value.Value;
            }
            else if (spec?.CouponValue.HasValue == true && spec.CouponValue.Value > 0)
            {
                couponValue = spec.CouponValue.Value;
            }

            if (couponValue.HasValue && couponValue.Value > 0)
            {
                var annualCoupon = days.HasValue && days.Value > 0
                    ? couponValue.Value * 365m / days.Value
                    : couponValue.Value;

                if (annualCoupon > 0)
                {
                    return annualCoupon / price.Value * 100m;
                }
            }

            return null;
        }

        private static decimal? NormalizePercent(decimal? value)
        {
            if (!value.HasValue)
            {
                return null;
            }

            var v = value.Value;
            if (v <= 0)
            {
                return null;
            }

            // MOEX sometimes stores percent values as fractions (0.01 = 1%).
            if (v > 0 && v <= 1m)
            {
                return v * 100m;
            }

            return v;
        }

        private sealed record BondCouponInfo(
            DateTime Date,
            decimal? Value,
            decimal? YieldPct,
            decimal? PercentOfMarket,
            decimal? PercentOfPar);
    }
}
