
using Microsoft.EntityFrameworkCore;
using StockChart.Model;
using StockChart.Repository.Interfaces;
using DictionaryEntity = StockChart.Model.Dictionary;

namespace StockChart.Repository.Services
{
public sealed class MoexSyncService : IMoexSyncService
{
    private const byte MarketStocks = 0;
    private const byte MarketFutures = 1;
    private const byte MarketBonds = 2;
    private const byte MarketOptions = 7;

    private const byte LinkSameIssuer = 1;
    private const byte LinkUnderlying = 2;

    private const string SourceIssSecurities = "iss.securities";
    private const string SourceMap = "map";
    private readonly ApplicationDbContext _dbContext;
    private readonly IMoexApiService _moexApiService;

    public MoexSyncService(ApplicationDbContext dbContext, IMoexApiService moexApiService)
    {
        _dbContext = dbContext;
        _moexApiService = moexApiService;
    }

    public async Task<MoexSyncSummary> SyncAllAsync(CancellationToken cancellationToken = default)
    {
        var summary = new MoexSyncSummary();

        summary.UpdatedStocks = await SyncStocksEmitentsAsync(cancellationToken);

            
        var bonds = await SyncBondsInternalAsync(cancellationToken);
        summary.UpdatedBonds = bonds.Updated;
        summary.LinksUpserted += bonds.LinksUpserted;
            
        var futures = await SyncFuturesInternalAsync(cancellationToken);
        summary.UpdatedFutures = futures.Updated;
        summary.LinksUpserted += futures.LinksUpserted;
            
        var options = await SyncOptionsInternalAsync(cancellationToken);
        summary.UpdatedOptions = options.Updated;
        summary.LinksUpserted += options.LinksUpserted;
            
        return summary;
    }

    private async Task<IReadOnlyList<ShareInfo>> FetchActiveSharesAsync(
        CancellationToken cancellationToken,
        string boardId = "TQBR",
        int pageSize = 200)
    {
        var start = 0;
        return await _moexApiService.GetSharesAsync(boardId, start, pageSize, cancellationToken);
    }

    public async Task<int> SyncStocksEmitentsAsync(CancellationToken cancellationToken = default)
    {

        var act = await FetchActiveSharesAsync(cancellationToken, "TQBR", 1000);

            
                
             var  a= act.Select(x => x.Secid).Distinct().ToArray();


            var stocks = await _dbContext.Dictionaries
                .Where(d => !d.ToDate.HasValue && d.Market == MarketStocks && d.EmitentId == null && a.Contains(d.Securityid))
            .ToListAsync(cancellationToken);

        if (stocks.Count == 0)
        {
            return 0;
        }

        var updated = 0;

        foreach (var stock in stocks)
        {
            var secid = NormalizeCode(stock.Securityid);
            if (string.IsNullOrWhiteSpace(secid))
            {
                continue;
            }

            var emitent = await FetchEmitentAsync(secid, cancellationToken);
            if (emitent == null || !emitent.EmitentId.HasValue)
            {
                continue;
            }

            var changed = ApplyEmitent(stock, emitent);
            if (changed)
            {
                updated++;
            }
        }

        if (_dbContext.ChangeTracker.HasChanges())
        {
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        return updated;
    }

    public async Task<int> SyncBondsAsync(CancellationToken cancellationToken = default)
    {
        var result = await SyncBondsInternalAsync(cancellationToken);
        return result.Updated;
    }

    public async Task<int> SyncFuturesAsync(CancellationToken cancellationToken = default)
    {
        var result = await SyncFuturesInternalAsync(cancellationToken);
        return result.Updated;
    }

    public async Task<int> SyncOptionsAsync(CancellationToken cancellationToken = default)
    {
        var result = await SyncOptionsInternalAsync(cancellationToken);
        return result.Updated;
    }

    public async Task<int> SyncOptionsForAssetAsync(string asset, CancellationToken cancellationToken = default)
    {
        var result = await SyncOptionsForAssetInternalAsync(asset, cancellationToken);
        return result.Updated;
    }
    private async Task<(int Updated, int LinksUpserted)> SyncBondsInternalAsync(CancellationToken cancellationToken)
    {
        var updated = 0;
        var linksUpserted = 0;
        var start = 0;
        const int limit = 100;

        while (true)
        {
            var page = await FetchBondPageAsync(start, limit, cancellationToken);
            if (page.Count == 0)
            {
                break;
            }

            var secids = page.Select(p => p.SecId).Distinct(StringComparer.OrdinalIgnoreCase).ToList();
            var existing = await _dbContext.Dictionaries
                .Where(d => /* d.Market == MarketBonds &&*/ secids.Contains(d.Securityid))
                .ToListAsync(cancellationToken);

            var marketData = await FetchBondMarketDataAsync(secids, cancellationToken);
            var marketMap = marketData.ToDictionary(m => m.SecId, m => m, StringComparer.OrdinalIgnoreCase);
            var importedAt = DateTime.UtcNow;
            var marketSnapshots = new List<BondMarketSnapshot>();
            var couponPayload = new List<BondCoupon>();

            var dictMap = existing.ToDictionary(d => d.Securityid, d => d, StringComparer.OrdinalIgnoreCase);
            var touchedBonds = new List<DictionaryEntity>();

            var bondIds = existing.Select(d => d.Id).ToList();
            var specMap = bondIds.Count == 0
                ? new Dictionary<int, BondSpec>()
                : await _dbContext.BondSpecs
                    .Where(b => bondIds.Contains(b.DictionaryId))
                    .ToDictionaryAsync(b => b.DictionaryId, cancellationToken);

            foreach (var row in page)
            {
                if (string.IsNullOrWhiteSpace(row.SecId))
                {
                    continue;
                }

                if (!dictMap.TryGetValue(row.SecId, out var dic))
                {
                    dic = new DictionaryEntity
                    {
                        Securityid = row.SecId,
                        Shortname = string.IsNullOrWhiteSpace(row.Shortname) ? row.SecId : row.Shortname,
                        Market = MarketBonds,
                        Minstep = 0m,
                        Volperqnt = 0m
                    };
                    _dbContext.Dictionaries.Add(dic);
                    dictMap[row.SecId] = dic;
                }

                var dictChanged = UpdateDictionaryBase(dic, row.Shortname, row.Isin, row.Currency, MarketBonds);
                dictChanged |= ApplyEmitent(dic, row.Emitent);

                var marketRow = marketMap.TryGetValue(row.SecId, out var foundMarket) ? foundMarket : null;

                var bondSpec = specMap.TryGetValue(dic.Id, out var existingSpec)
                    ? existingSpec
                    : new BondSpec { Dictionary = dic };

                var specChanged = UpdateBondSpec(bondSpec, row, marketRow);

                if (existingSpec == null)
                {
                    _dbContext.BondSpecs.Add(bondSpec);
                    specMap[dic.Id] = bondSpec;
                    specChanged = true;
                }

                if (marketRow != null)
                {
                    var faceValue = bondSpec.FaceValue ?? row.FaceValue;
                    decimal? priceRub = null;
                    if (marketRow.PricePct.HasValue && faceValue.HasValue && faceValue.Value > 0)
                    {
                        priceRub = marketRow.PricePct.Value / 100m * faceValue.Value;
                    }
                    var currencyId = marketRow.CurrencyId;
                    if (string.IsNullOrWhiteSpace(currencyId))
                    {
                        currencyId = bondSpec.Currency ?? row.Currency;
                    }

                    marketSnapshots.Add(new BondMarketSnapshot
                    {
                        Dictionary = dic,
                        ImportedAt = importedAt,
                        BoardId = marketRow.BoardId ?? bondSpec.PrimaryBoardId,
                        TradingStatus = marketRow.TradingStatus,
                        PriceUnit = marketRow.PriceUnit,
                        CurrencyId = currencyId,
                        PricePctOfPar = marketRow.PricePct,
                        PriceRub = priceRub,
                        YieldPct = marketRow.YieldPct,
                        DayChangePct = marketRow.DayChangePct,
                        DayVolume = marketRow.DayVolume,
                        DayVolumeQty = marketRow.DayVolumeQty,
                        AccruedInterest = marketRow.AccruedInterest,
                        CouponValue = marketRow.CouponValue,
                        NextCouponDate = marketRow.NextCouponDate,
                        OfferDate = marketRow.OfferDate
                    });
                }

                if (dictChanged || specChanged)
                {
                    updated++;
                    touchedBonds.Add(dic);
                }
            }

            if (marketSnapshots.Count > 0)
            {
                _dbContext.BondMarketSnapshots.AddRange(marketSnapshots);
            }

            if (dictMap.Count > 0)
            {
                foreach (var row in page)
                {
                    if (!dictMap.TryGetValue(row.SecId, out var dic))
                    {
                        continue;
                    }

                    var coupons = await FetchBondCouponsAsync(row.SecId, cancellationToken);
                    if (coupons.Count == 0)
                    {
                        continue;
                    }

                    var bondSpec = specMap.TryGetValue(dic.Id, out var spec) ? spec : null;
                    var marketRow = marketMap.TryGetValue(row.SecId, out var foundMarket) ? foundMarket : null;

                    var faceValue = bondSpec?.FaceValue ?? row.FaceValue;
                    decimal? priceRub = null;
                    if (marketRow?.PricePct.HasValue == true && faceValue.HasValue && faceValue.Value > 0)
                    {
                        priceRub = marketRow.PricePct.Value / 100m * faceValue.Value;
                    }

                    var periodDays = bondSpec?.CouponPeriodDays ?? marketRow?.CouponPeriodDays;

                    var couponList = coupons
                        .OrderBy(c => c.CouponDate ?? DateTime.MaxValue)
                        .ToList();

                    for (var i = 0; i < couponList.Count; i++)
                    {
                        var coupon = couponList[i];
                        if (!coupon.Number.HasValue || coupon.Number.Value <= 0)
                        {
                            couponList[i] = coupon with { Number = i + 1 };
                        }
                    }

                    foreach (var coupon in couponList)
                    {
                        var percentOfPar = coupon.PercentOfPar;
                        if (!percentOfPar.HasValue && coupon.CouponValue.HasValue && faceValue.HasValue && faceValue.Value > 0)
                        {
                            percentOfPar = coupon.CouponValue.Value / faceValue.Value * 100m;
                        }

                        var percentOfMarket = coupon.PercentOfMarket;
                        if (!percentOfMarket.HasValue && coupon.CouponValue.HasValue && priceRub.HasValue && priceRub.Value > 0)
                        {
                            percentOfMarket = coupon.CouponValue.Value / priceRub.Value * 100m;
                        }

                        var yieldPct = coupon.CouponYieldPct;
                        if (!yieldPct.HasValue && coupon.CouponValue.HasValue && priceRub.HasValue && priceRub.Value > 0)
                        {
                            if (periodDays.HasValue && periodDays.Value > 0)
                            {
                                yieldPct = coupon.CouponValue.Value / priceRub.Value * 365m / periodDays.Value * 100m;
                            }
                            else
                            {
                                yieldPct = coupon.CouponValue.Value / priceRub.Value * 100m;
                            }
                        }

                        couponPayload.Add(new BondCoupon
                        {
                            DictionaryId = dic.Id,
                            Number = coupon.Number,
                            CouponDate = coupon.CouponDate,
                            CouponValue = coupon.CouponValue,
                            CouponYieldPct = yieldPct,
                            PercentOfPar = percentOfPar,
                            PercentOfMarket = percentOfMarket
                        });
                    }
                }
            }

            if (couponPayload.Count > 0)
            {
                var couponIds = couponPayload.Select(c => c.DictionaryId).Distinct().ToList();
                var existingCoupons = await _dbContext.BondCoupons
                    .Where(c => couponIds.Contains(c.DictionaryId))
                    .ToListAsync(cancellationToken);
                _dbContext.BondCoupons.RemoveRange(existingCoupons);
                _dbContext.BondCoupons.AddRange(couponPayload);
            }

            if (_dbContext.ChangeTracker.HasChanges())
            {
                    try
                    {

                        await _dbContext.SaveChangesAsync(cancellationToken);
                    }
                    catch(Exception e)
                    {

                    }
            }

            if (touchedBonds.Count > 0)
            {
                linksUpserted += await BuildSameIssuerLinksAsync(touchedBonds, cancellationToken);
            }

            if (page.Count < limit)
            {
                break;
            }

            start += limit;
        }

        return (updated, linksUpserted);
    }

    private async Task<(int Updated, int LinksUpserted)> SyncFuturesInternalAsync(CancellationToken cancellationToken)
    {
        var updated = 0;
        var linksUpserted = 0;

        var rows = await FetchFuturesAsync(cancellationToken);
        if (rows.Count == 0)
        {
            return (0, 0);
        }

        var secids = rows.Select(r => r.SecId).Distinct(StringComparer.OrdinalIgnoreCase).ToList();
        var existing = await _dbContext.Dictionaries
            .Where(d => d.Market == MarketFutures && secids.Contains(d.Securityid))
            .ToListAsync(cancellationToken);

        var dictMap = existing.ToDictionary(d => d.Securityid, d => d, StringComparer.OrdinalIgnoreCase);
        var futureIds = existing.Select(d => d.Id).ToList();
        var specMap = futureIds.Count == 0
            ? new Dictionary<int, FutureSpec>()
            : await _dbContext.FutureSpecs
                .Where(f => futureIds.Contains(f.DictionaryId))
                .ToDictionaryAsync(f => f.DictionaryId, cancellationToken);

        var touchedFutures = new List<FutureSpec>();
        var linkTargets = new List<(DictionaryEntity Dic, string? AssetCode)>();

        foreach (var row in rows)
        {
            if (string.IsNullOrWhiteSpace(row.SecId))
            {
                continue;
            }

            if (!dictMap.TryGetValue(row.SecId, out var dic))
            {
                dic = new DictionaryEntity
                {
                    Securityid = row.SecId,
                    Shortname = string.IsNullOrWhiteSpace(row.Shortname) ? row.SecId : row.Shortname,
                    Market = MarketFutures,
                    Minstep = 0m,
                    Volperqnt = 0m
                };
                _dbContext.Dictionaries.Add(dic);
                dictMap[row.SecId] = dic;
            }

            var dictChanged = UpdateDictionaryBase(dic, row.Shortname, null, null, MarketFutures);

            var futureSpec = specMap.TryGetValue(dic.Id, out var existingSpec)
                ? existingSpec
                : new FutureSpec { Dictionary = dic };

            var specChanged = UpdateFutureSpec(futureSpec, row);

            if (existingSpec == null)
            {
                _dbContext.FutureSpecs.Add(futureSpec);
                specChanged = true;
            }

            if (!string.IsNullOrWhiteSpace(futureSpec.AssetCode))
            {
                linkTargets.Add((dic, futureSpec.AssetCode));
            }

            if (dictChanged || specChanged)
            {
                updated++;
                touchedFutures.Add(futureSpec);
            }
        }

        if (_dbContext.ChangeTracker.HasChanges())
        {
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        if (linkTargets.Count > 0)
        {
            linksUpserted += await BuildUnderlyingLinksAsync(
                linkTargets.Select(t => new UnderlyingTarget(t.Dic.Id, t.AssetCode)),
                cancellationToken);
        }

        return (updated, linksUpserted);
    }
    private async Task<(int Updated, int LinksUpserted)> SyncOptionsInternalAsync(CancellationToken cancellationToken)
    {
        var updated = 0;
        var linksUpserted = 0;

        var assets = await GetOptionAssetsAsync(cancellationToken);
        if (assets.Count == 0)
        {
            return (0, 0);
        }

        foreach (var asset in assets)
        {
            var result = await SyncOptionsForAssetInternalAsync(asset, cancellationToken);
            updated += result.Updated;
            linksUpserted += result.LinksUpserted;
        }

        return (updated, linksUpserted);
    }

    private async Task<(int Updated, int LinksUpserted)> SyncOptionsForAssetInternalAsync(
        string asset,
        CancellationToken cancellationToken)
    {
        var updated = 0;
        var linksUpserted = 0;

        var normalizedAsset = NormalizeCode(asset);
        if (string.IsNullOrWhiteSpace(normalizedAsset))
        {
            return (0, 0);
        }

        var importedAt = DateTime.UtcNow;
        var rows = await FetchOptionsAsync(normalizedAsset, cancellationToken);
        if (rows.Count == 0)
        {
            return (0, 0);
        }

        var fallbackLotSize = await ResolveFutureLotSizeAsync(normalizedAsset, cancellationToken);
        var secids = rows.Select(r => r.SecId).Distinct(StringComparer.OrdinalIgnoreCase).ToList();
        var existing = await _dbContext.Dictionaries
            .Where(d => d.Market == MarketOptions && secids.Contains(d.Securityid))
            .ToListAsync(cancellationToken);

        var dictMap = existing.ToDictionary(d => d.Securityid, d => d, StringComparer.OrdinalIgnoreCase);
        var optionIds = existing.Select(d => d.Id).ToList();
        var specMap = optionIds.Count == 0
            ? new Dictionary<int, OptionSpec>()
            : await _dbContext.OptionSpecs
                .Where(o => optionIds.Contains(o.DictionaryId))
                .ToDictionaryAsync(o => o.DictionaryId, cancellationToken);

        var touchedOptions = new List<OptionSpec>();
        var linkTargets = new List<(DictionaryEntity Dic, string? AssetCode)>();

        foreach (var row in rows)
        {
            if (string.IsNullOrWhiteSpace(row.SecId))
            {
                continue;
            }

            if (!dictMap.TryGetValue(row.SecId, out var dic))
            {
                dic = new DictionaryEntity
                {
                    Securityid = row.SecId,
                    Shortname = string.IsNullOrWhiteSpace(row.Shortname) ? row.SecId : row.Shortname,
                    Market = MarketOptions,
                    Minstep = 0m,
                    Volperqnt = 0m
                };
                _dbContext.Dictionaries.Add(dic);
                dictMap[row.SecId] = dic;
            }

            var dictChanged = UpdateDictionaryBase(dic, row.Shortname, null, null, MarketOptions);

            var optionSpec = specMap.TryGetValue(dic.Id, out var existingSpec)
                ? existingSpec
                : new OptionSpec { Dictionary = dic };

            var specChanged = UpdateOptionSpec(optionSpec, row, fallbackLotSize);

            if (existingSpec == null)
            {
                _dbContext.OptionSpecs.Add(optionSpec);
                specChanged = true;
            }

            if (!string.IsNullOrWhiteSpace(optionSpec.AssetCode))
            {
                linkTargets.Add((dic, optionSpec.AssetCode));
            }

            if (dictChanged || specChanged)
            {
                updated++;
                touchedOptions.Add(optionSpec);
            }

            var snapshotOptionType = string.IsNullOrWhiteSpace(row.OptionType)
                ? null
                : row.OptionType.Trim().ToUpperInvariant();
            if (!string.IsNullOrWhiteSpace(snapshotOptionType) && snapshotOptionType.Length > 1)
            {
                snapshotOptionType = snapshotOptionType.Substring(0, 1);
            }

            _dbContext.OptionMarketSnapshots.Add(new OptionMarketSnapshot
            {
                Dictionary = dic,
                ImportedAt = importedAt,
                BoardId = row.BoardId,
                OptionType = snapshotOptionType,
                Strike = row.Strike,
                TheorPrice = row.TheorPrice,
                Volat = row.Volat,
                Last = row.Last,
                Bid = row.Bid,
                Offer = row.Offer,
                VolToday = row.VolToday,
                OpenPosition = row.OpenPosition,
                UnderlyingPrice = row.UnderlyingPrice
            });
        }

        if (_dbContext.ChangeTracker.HasChanges())
        {
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        if (linkTargets.Count > 0)
        {
            linksUpserted += await BuildUnderlyingLinksAsync(
                linkTargets.Select(t => new UnderlyingTarget(t.Dic.Id, t.AssetCode)),
                cancellationToken);
        }

        return (updated, linksUpserted);
    }

    private async Task<List<MoexBondRow>> FetchBondPageAsync(int start, int limit, CancellationToken cancellationToken)
    {
        var page = await _moexApiService.GetCorporateBondsAsync(start, limit, cancellationToken);
        if (page.Count == 0)
        {
            return new List<MoexBondRow>();
        }

        var rows = new List<MoexBondRow>(page.Count);
        foreach (var bond in page)
        {
            var item = bond;
            if (!item.HasDetails)
            {
                var details = await FetchBondDetailsAsync(item.SecId, cancellationToken);
                if (details != null)
                {
                    item = item.WithDetails(details);
                }
            }

            rows.Add(item);
        }

        return rows;
    }
    private Task<BondDetails?> FetchBondDetailsAsync(string secid, CancellationToken cancellationToken)
    {
        return _moexApiService.GetBondDetailsAsync(secid, cancellationToken);
    }
    private Task<IReadOnlyList<MoexBondMarketRow>> FetchBondMarketDataAsync(IEnumerable<string> secids, CancellationToken cancellationToken)
    {
        try
        {
            return _moexApiService.GetBondMarketDataAsync(secids, cancellationToken);
        }
        catch
        {
            return Task.FromResult<IReadOnlyList<MoexBondMarketRow>>(Array.Empty<MoexBondMarketRow>());
        }
    }
    private Task<IReadOnlyList<MoexBondCouponRow>> FetchBondCouponsAsync(string secid, CancellationToken cancellationToken)
    {
        try
        {
            return _moexApiService.GetBondCouponsAsync(secid, cancellationToken);
        }
        catch
        {
            return Task.FromResult<IReadOnlyList<MoexBondCouponRow>>(Array.Empty<MoexBondCouponRow>());
        }
    }
    private Task<IReadOnlyList<MoexFutureRow>> FetchFuturesAsync(CancellationToken cancellationToken)
    {
        return _moexApiService.GetFuturesAsync(cancellationToken);
    }
    private Task<IReadOnlyList<MoexOptionRow>> FetchOptionsAsync(string asset, CancellationToken cancellationToken)
    {
        return _moexApiService.GetOptionsAsync(asset, cancellationToken);
    }
    private async Task<List<string>> GetOptionAssetsAsync(CancellationToken cancellationToken)
    {
        var assets = await _dbContext.FutureSpecs
            .AsNoTracking()
            .Where(f => f.AssetCode != null)
            .Select(f => f.AssetCode!)
            .Distinct()
            .ToListAsync(cancellationToken);

        if (assets.Count > 0)
        {
            return assets
                .Select(NormalizeCode)
                .Where(a => !string.IsNullOrWhiteSpace(a))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();
        }

        return new List<string> { "SBRF", "GAZR", "LKOH" };
    }

    private async Task<int> BuildSameIssuerLinksAsync(IEnumerable<DictionaryEntity> bonds, CancellationToken cancellationToken)
    {
        var bondEmitents = bonds
            .Where(b => b.EmitentId.HasValue)
            .Select(b => new { b.Id, EmitentId = b.EmitentId!.Value })
            .Distinct()
            .ToList();

        if (bondEmitents.Count == 0)
        {
            return 0;
        }

        var emitentIds = bondEmitents.Select(b => b.EmitentId).Distinct().ToList();
        var stocks = await _dbContext.Dictionaries
            .AsNoTracking()
            .Where(d => d.Market == MarketStocks && d.EmitentId.HasValue && emitentIds.Contains(d.EmitentId.Value))
            .Select(d => new { d.Id, EmitentId = d.EmitentId!.Value })
            .ToListAsync(cancellationToken);

        if (stocks.Count == 0)
        {
            return 0;
        }

        var stockLookup = stocks
            .GroupBy(s => s.EmitentId)
            .ToDictionary(g => g.Key, g => g.Select(s => s.Id).ToList());

        var now = DateTime.UtcNow;
        var links = new List<SecurityLink>();

        foreach (var bond in bondEmitents)
        {
            if (!stockLookup.TryGetValue(bond.EmitentId, out var stockIds))
            {
                continue;
            }

            foreach (var stockId in stockIds)
            {
                links.Add(new SecurityLink
                {
                    FromDictionaryId = stockId,
                    ToDictionaryId = bond.Id,
                    LinkType = LinkSameIssuer,
                    Source = SourceIssSecurities,
                    UpdatedAt = now
                });
            }
        }

        return await UpsertSecurityLinksAsync(links, cancellationToken);
    }

    private async Task<int> BuildUnderlyingLinksAsync(IEnumerable<UnderlyingTarget> targets, CancellationToken cancellationToken)
    {
        var targetList = targets
            .Where(t => !string.IsNullOrWhiteSpace(t.AssetCode))
            .ToList();

        if (targetList.Count == 0)
        {
            return 0;
        }

        var assetCodes = targetList.Select(t => t.AssetCode!).Distinct(StringComparer.OrdinalIgnoreCase).ToList();
        var maps = await _dbContext.UnderlyingMaps
            .AsNoTracking()
            .Where(m => assetCodes.Contains(m.AssetCode))
            .ToListAsync(cancellationToken);

        if (maps.Count == 0)
        {
            return 0;
        }

        var mapLookup = maps
            .Select(m => new { Asset = NormalizeCode(m.AssetCode), Spot = NormalizeCode(m.SpotSecId) })
            .Where(m => !string.IsNullOrWhiteSpace(m.Asset) && !string.IsNullOrWhiteSpace(m.Spot))
            .ToDictionary(m => m.Asset!, m => m.Spot!, StringComparer.OrdinalIgnoreCase);

        var spotIds = mapLookup.Values.Distinct(StringComparer.OrdinalIgnoreCase).ToList();
        var stocksList = await _dbContext.Dictionaries
            .AsNoTracking()
            .Where(d => d.Market == MarketStocks && spotIds.Contains(d.Securityid))
            .Select(d => new { d.Securityid, d.Id })
            .ToListAsync(cancellationToken);

        var stocks = stocksList.ToDictionary(d => d.Securityid, d => d.Id, StringComparer.OrdinalIgnoreCase);

        if (stocks.Count == 0)
        {
            return 0;
        }

        var now = DateTime.UtcNow;
        var links = new List<SecurityLink>();

        foreach (var target in targetList)
        {
            if (string.IsNullOrWhiteSpace(target.AssetCode))
            {
                continue;
            }

            if (!mapLookup.TryGetValue(NormalizeCode(target.AssetCode), out var spotSecId))
            {
                continue;
            }

            if (!stocks.TryGetValue(spotSecId, out var stockId))
            {
                continue;
            }

            links.Add(new SecurityLink
            {
                FromDictionaryId = stockId,
                ToDictionaryId = target.DictionaryId,
                LinkType = LinkUnderlying,
                Source = SourceMap,
                UpdatedAt = now
            });
        }

        return await UpsertSecurityLinksAsync(links, cancellationToken);
    }

    private async Task<int> UpsertSecurityLinksAsync(IEnumerable<SecurityLink> links, CancellationToken cancellationToken)
    {
        var unique = new Dictionary<(int From, int To, byte Type), SecurityLink>();
        foreach (var link in links)
        {
            var key = (link.FromDictionaryId, link.ToDictionaryId, link.LinkType);
            if (!unique.ContainsKey(key))
            {
                unique[key] = link;
            }
        }

        if (unique.Count == 0)
        {
            return 0;
        }

        var fromIds = unique.Keys.Select(k => k.From).Distinct().ToList();
        var toIds = unique.Keys.Select(k => k.To).Distinct().ToList();
        var linkTypes = unique.Keys.Select(k => k.Type).Distinct().ToList();

        var existing = await _dbContext.SecurityLinks
            .Where(l => fromIds.Contains(l.FromDictionaryId)
                && toIds.Contains(l.ToDictionaryId)
                && linkTypes.Contains(l.LinkType))
            .ToListAsync(cancellationToken);

        var existingMap = existing.ToDictionary(l => (l.FromDictionaryId, l.ToDictionaryId, l.LinkType));

        var changed = 0;

        foreach (var entry in unique)
        {
            if (existingMap.TryGetValue(entry.Key, out var existingLink))
            {
                existingLink.Source = entry.Value.Source;
                existingLink.UpdatedAt = entry.Value.UpdatedAt;
                changed++;
            }
            else
            {
                _dbContext.SecurityLinks.Add(entry.Value);
                changed++;
            }
        }

        if (_dbContext.ChangeTracker.HasChanges())
        {
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        return changed;
    }
    private bool UpdateDictionaryBase(DictionaryEntity dic, string? shortname, string? isin, string? currency, byte market)
    {
        var changed = false;

        if (!string.IsNullOrWhiteSpace(shortname) && dic.Shortname != shortname)
        {
            dic.Shortname = shortname;
            changed = true;
        }

        if (!dic.Market.HasValue || dic.Market.Value != market)
        {
            dic.Market = market;
            changed = true;
        }

        if (!string.IsNullOrWhiteSpace(isin) && dic.Isin != isin)
        {
            dic.Isin = isin;
            changed = true;
        }

        if (!string.IsNullOrWhiteSpace(currency) && dic.Currency != currency)
        {
            dic.Currency = currency;
            changed = true;
        }

        return changed;
    }

    private bool ApplyEmitent(DictionaryEntity dic, EmitentInfo? emitent)
    {
        if (emitent == null || !emitent.EmitentId.HasValue)
        {
            return false;
        }

        var changed = false;

        if (dic.EmitentId != emitent.EmitentId)
        {
            dic.EmitentId = emitent.EmitentId;
            changed = true;
        }

        if (!string.IsNullOrWhiteSpace(emitent.EmitentTitle) && dic.EmitentTitle != emitent.EmitentTitle)
        {
            dic.EmitentTitle = emitent.EmitentTitle;
            changed = true;
        }

        if (!string.IsNullOrWhiteSpace(emitent.EmitentInn) && dic.EmitentInn != emitent.EmitentInn)
        {
            dic.EmitentInn = emitent.EmitentInn;
            changed = true;
        }

        return changed;
    }

    private bool UpdateBondSpec(BondSpec spec, MoexBondRow row, MoexBondMarketRow? marketRow)
    {
        var changed = false;
        var now = DateTime.UtcNow;

        if (!string.IsNullOrWhiteSpace(row.Isin) && spec.Isin != row.Isin)
        {
            spec.Isin = row.Isin;
            changed = true;
        }

        if (!string.IsNullOrWhiteSpace(row.RegNumber) && spec.RegNumber != row.RegNumber)
        {
            spec.RegNumber = row.RegNumber;
            changed = true;
        }

        if (row.MaturityDate.HasValue && spec.MaturityDate != row.MaturityDate)
        {
            spec.MaturityDate = row.MaturityDate;
            changed = true;
        }

        if (row.FaceValue.HasValue && spec.FaceValue != row.FaceValue)
        {
            spec.FaceValue = row.FaceValue;
            changed = true;
        }

        if (!string.IsNullOrWhiteSpace(row.Currency) && spec.Currency != row.Currency)
        {
            spec.Currency = row.Currency;
            changed = true;
        }

        if (!string.IsNullOrWhiteSpace(row.PrimaryBoardId) && spec.PrimaryBoardId != row.PrimaryBoardId)
        {
            spec.PrimaryBoardId = row.PrimaryBoardId;
            changed = true;
        }

        if (marketRow != null)
        {
            if (marketRow.PlacementDate.HasValue && spec.PlacementDate != marketRow.PlacementDate)
            {
                spec.PlacementDate = marketRow.PlacementDate;
                changed = true;
            }

            if (marketRow.OfferDate.HasValue && spec.OfferDate != marketRow.OfferDate)
            {
                spec.OfferDate = marketRow.OfferDate;
                changed = true;
            }

            if (marketRow.NextCouponDate.HasValue && spec.NextCouponDate != marketRow.NextCouponDate)
            {
                spec.NextCouponDate = marketRow.NextCouponDate;
                changed = true;
            }

            if (marketRow.CouponValue.HasValue && spec.CouponValue != marketRow.CouponValue)
            {
                spec.CouponValue = marketRow.CouponValue;
                changed = true;
            }

            if (marketRow.CouponPeriodDays.HasValue && spec.CouponPeriodDays != marketRow.CouponPeriodDays)
            {
                spec.CouponPeriodDays = marketRow.CouponPeriodDays;
                changed = true;
            }

            if (marketRow.CouponRate.HasValue && spec.CouponRate != marketRow.CouponRate)
            {
                spec.CouponRate = marketRow.CouponRate;
                changed = true;
            }

            if (!string.IsNullOrWhiteSpace(marketRow.CouponType) && spec.CouponType != marketRow.CouponType)
            {
                spec.CouponType = marketRow.CouponType;
                changed = true;
            }

            if (marketRow.AccruedInterest.HasValue && spec.AccruedInterest != marketRow.AccruedInterest)
            {
                spec.AccruedInterest = marketRow.AccruedInterest;
                changed = true;
            }

            if (marketRow.IssueSize.HasValue && spec.IssueSize != marketRow.IssueSize)
            {
                spec.IssueSize = marketRow.IssueSize;
                changed = true;
            }

            if (marketRow.IssueSizePlaced.HasValue && spec.IssueSizePlaced != marketRow.IssueSizePlaced)
            {
                spec.IssueSizePlaced = marketRow.IssueSizePlaced;
                changed = true;
            }

            if (marketRow.ListingLevel.HasValue && spec.ListingLevel != marketRow.ListingLevel)
            {
                spec.ListingLevel = marketRow.ListingLevel;
                changed = true;
            }

            if (marketRow.QualifiedOnly.HasValue && spec.QualifiedOnly != marketRow.QualifiedOnly)
            {
                spec.QualifiedOnly = marketRow.QualifiedOnly;
                changed = true;
            }
        }

        if (changed || spec.UpdatedAt == default)
        {
            if (spec.UpdatedAt != now)
            {
                spec.UpdatedAt = now;
                changed = true;
            }
        }

        return changed;
    }

    private bool UpdateFutureSpec(FutureSpec spec, MoexFutureRow row)
    {
        var changed = false;
        var now = DateTime.UtcNow;

        if (!string.IsNullOrWhiteSpace(row.AssetCode) && spec.AssetCode != row.AssetCode)
        {
            spec.AssetCode = row.AssetCode;
            changed = true;
        }

        if (row.ExpirationDate.HasValue && spec.ExpirationDate != row.ExpirationDate)
        {
            spec.ExpirationDate = row.ExpirationDate;
            changed = true;
        }

        if (row.LotSize.HasValue && spec.LotSize != row.LotSize)
        {
            spec.LotSize = row.LotSize;
            changed = true;
        }

        if (row.MinStep.HasValue && spec.MinStep != row.MinStep)
        {
            spec.MinStep = row.MinStep;
            changed = true;
        }

        if (row.StepPrice.HasValue && spec.StepPrice != row.StepPrice)
        {
            spec.StepPrice = row.StepPrice;
            changed = true;
        }

        if (changed || spec.UpdatedAt == default)
        {
            if (spec.UpdatedAt != now)
            {
                spec.UpdatedAt = now;
                changed = true;
            }
        }

        return changed;
    }

    private bool UpdateOptionSpec(OptionSpec spec, MoexOptionRow row, int? fallbackLotSize)
    {
        var changed = false;
        var now = DateTime.UtcNow;

        if (!string.IsNullOrWhiteSpace(row.AssetCode) && spec.AssetCode != row.AssetCode)
        {
            spec.AssetCode = row.AssetCode;
            changed = true;
        }

        if (!string.IsNullOrWhiteSpace(row.OptionType))
        {
            var normalized = row.OptionType.Trim().ToUpperInvariant();
            if (normalized.Length > 1)
            {
                normalized = normalized.Substring(0, 1);
            }

            if (spec.OptionType != normalized)
            {
                spec.OptionType = normalized;
                changed = true;
            }
        }

        if (!string.IsNullOrWhiteSpace(row.BoardId) && spec.BoardId != row.BoardId)
        {
            spec.BoardId = row.BoardId;
            changed = true;
        }

        if (row.Strike.HasValue && spec.Strike != row.Strike)
        {
            spec.Strike = row.Strike;
            changed = true;
        }

        if (row.TheorPrice.HasValue && spec.TheorPrice != row.TheorPrice)
        {
            spec.TheorPrice = row.TheorPrice;
            changed = true;
        }

        if (row.Volat.HasValue && spec.Volat != row.Volat)
        {
            spec.Volat = row.Volat;
            changed = true;
        }

        if (row.Last.HasValue && spec.Last != row.Last)
        {
            spec.Last = row.Last;
            changed = true;
        }

        if (row.Bid.HasValue && spec.Bid != row.Bid)
        {
            spec.Bid = row.Bid;
            changed = true;
        }

        if (row.Offer.HasValue && spec.Offer != row.Offer)
        {
            spec.Offer = row.Offer;
            changed = true;
        }

        if (row.VolToday.HasValue && spec.VolToday != row.VolToday)
        {
            spec.VolToday = row.VolToday;
            changed = true;
        }

        if (row.OpenPosition.HasValue && spec.OpenPosition != row.OpenPosition)
        {
            spec.OpenPosition = row.OpenPosition;
            changed = true;
        }

        if (row.UnderlyingPrice.HasValue && spec.UnderlyingPrice != row.UnderlyingPrice)
        {
            spec.UnderlyingPrice = row.UnderlyingPrice;
            changed = true;
        }

        if (row.ExpirationDate.HasValue && spec.ExpirationDate != row.ExpirationDate)
        {
            spec.ExpirationDate = row.ExpirationDate;
            changed = true;
        }

        var resolvedLotSize = row.LotSize ?? fallbackLotSize;
        if (resolvedLotSize.HasValue && spec.LotSize != resolvedLotSize)
        {
            spec.LotSize = resolvedLotSize;
            changed = true;
        }

        if (changed || spec.UpdatedAt == default)
        {
            if (spec.UpdatedAt != now)
            {
                spec.UpdatedAt = now;
                changed = true;
            }
        }

        return changed;
    }

    private async Task<int?> ResolveFutureLotSizeAsync(string assetCode, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(assetCode))
        {
            return null;
        }

        var normalized = NormalizeCode(assetCode);
        if (string.IsNullOrWhiteSpace(normalized))
        {
            return null;
        }

        return await _dbContext.FutureSpecs
            .AsNoTracking()
            .Where(f => f.AssetCode == normalized && f.LotSize.HasValue)
            .OrderByDescending(f => f.ExpirationDate)
            .Select(f => f.LotSize)
            .FirstOrDefaultAsync(cancellationToken);
    }

    private Task<EmitentInfo?> FetchEmitentAsync(string secid, CancellationToken cancellationToken)
    {
        return _moexApiService.GetEmitentAsync(secid, cancellationToken);
    }
    private static string? NormalizeCode(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        return value.Trim().ToUpperInvariant();
    }

    private sealed record UnderlyingTarget(int DictionaryId, string? AssetCode);
}
}




































