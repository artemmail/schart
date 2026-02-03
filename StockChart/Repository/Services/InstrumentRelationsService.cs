using System;
using Microsoft.EntityFrameworkCore;
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

        public InstrumentRelationsService(ApplicationDbContext db)
        {
            _db = db;
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
            var bondsWithMaturity = new HashSet<int>(
                bondSpecMap.Values
                    .Where(b => b.MaturityDate.HasValue)
                    .Select(b => b.DictionaryId));

            var bondsWithCandles = bondIds.Count == 0
                ? new HashSet<int>()
                : new HashSet<int>(await _db.DayCandles
                    .AsNoTracking()
                    .Where(c => bondIds.Contains(c.Id))
                    .Select(c => c.Id)
                    .Distinct()
                    .ToListAsync(cancellationToken));

            var bondsKeep = new HashSet<int>(bondsWithMaturity);
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

            var bondsResult = bondDicts.Values
                .Where(dic => bondsKeep.Contains(dic.Id))
                .Select(dic => MapBondItem(dic, bondSpecMap.TryGetValue(dic.Id, out var spec) ? spec : null))
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

        private static InstrumentRelationItemDto MapBondItem(DictionaryEntity dic, BondSpec? spec)
        {
            var dto = MapItem(dic);
            if (spec == null)
            {
                return dto;
            }

            dto.RegNumber = spec.RegNumber;
            dto.MaturityDate = spec.MaturityDate;
            dto.FaceValue = spec.FaceValue;
            dto.Currency = spec.Currency;
            dto.PrimaryBoardId = spec.PrimaryBoardId;
            if (!string.IsNullOrWhiteSpace(spec.Isin))
            {
                dto.Isin = spec.Isin;
            }

            return dto;
        }
    }
}
