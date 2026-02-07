using Microsoft.EntityFrameworkCore;
using StockChart.Model;
using StockChart.Repository.Interfaces;

namespace StockChart.Repository.Services;

public sealed class BondsQueryService : IBondsQueryService
{
    private const byte MarketStocks = 0;
    private const byte MarketBonds = 2;
    private static readonly string[] OfzTypeCodes = { "OFZ_BOND", "CB_BOND", "54", "4" };
    private static readonly string[] CorpTypeCodes = { "CORPORATE_BOND", "EXCHANGE_BOND", "IFI_BOND", "EURO_BOND", "NON_EXCHANGE_BOND", "2", "43", "42", "60", "78" };
    private static readonly string[] SubfedTypeCodes = { "SUBFEDERAL_BOND", "MUNICIPAL_BOND", "REGIONAL_BOND", "41", "45" };
    private readonly ApplicationDbContext _db;

    public BondsQueryService(ApplicationDbContext db)
    {
        _db = db;
    }

    public async Task<List<BondMoexTypeOptionDto>> GetMoexBondTypesAsync(CancellationToken cancellationToken = default)
    {
        var today = DateTime.UtcNow.Date;
        var existingMoexBondTypes = (
            from spec in _db.BondSpecs.AsNoTracking()
            join d in _db.Dictionaries.AsNoTracking() on spec.DictionaryId equals d.Id
            where d.Market == MarketBonds
                  && (!d.ToDate.HasValue || d.ToDate.Value >= today)
                  && spec.MoexType != null
            select spec.MoexType!
        ).Distinct();

        var rows = await _db.MoexSecurityTypes.AsNoTracking()
            .Where(x =>
                x.Name != null &&
                EF.Functions.Like(x.Name, "%_BOND") &&
                existingMoexBondTypes.Contains(x.Name))
            .Select(x => new BondMoexTypeOptionDto
            {
                Key = x.Name!,
                Label = string.IsNullOrWhiteSpace(x.Title) ? x.Name! : x.Title!
            })
            .OrderBy(x => x.Label)
            .ThenBy(x => x.Key)
            .ToListAsync(cancellationToken);

        return rows;
    }

    public async Task<BondListResponseDto> GetListAsync(BondsListRequestDto request, CancellationToken cancellationToken = default)
    {
        request ??= new BondsListRequestDto();

        var tab = NormalizeTab(request.Tab);
        var pageSize = Math.Clamp(request.PageSize <= 0 ? 50 : request.PageSize, 1, 200);
        var page = request.Page <= 0 ? 1 : request.Page;
        var today = DateTime.UtcNow.Date;

        var moexTypeFilter = (request.MoexType ?? new List<string>())
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Select(NormalizeCode)
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var couponFreqFilter = (request.CouponFreq ?? new List<int>())
            .Where(x => x > 0)
            .Distinct()
            .ToHashSet();

        var minMaturityDate = request.YearsToMaturityMin.HasValue
            ? today.AddDays((double)(request.YearsToMaturityMin.Value * 365.25m))
            : (DateTime?)null;
        var maxMaturityDate = request.YearsToMaturityMax.HasValue
            ? today.AddDays((double)(request.YearsToMaturityMax.Value * 365.25m))
            : (DateTime?)null;

        IQueryable<BaseBondRow> baseQuery =
            from d in _db.Dictionaries.AsNoTracking()
            where d.Market == MarketBonds
            join spec in _db.BondSpecs.AsNoTracking() on d.Id equals spec.DictionaryId into specJoin
            from spec in specJoin.DefaultIfEmpty()
            join moexType in _db.MoexSecurityTypes.AsNoTracking() on spec.MoexType equals moexType.Name into moexTypeJoin
            from moexType in moexTypeJoin.DefaultIfEmpty()
            select new BaseBondRow
            {
                DictionaryId = d.Id,
                SecId = d.Securityid,
                ShortName = d.Shortname,
                IsinFromDictionary = d.Isin,
                Isin = spec != null ? spec.Isin : null,
                RegNumber = spec != null ? spec.RegNumber : null,
                MaturityDate = spec != null ? spec.MaturityDate : null,
                OfferDate = spec != null ? spec.OfferDate : null,
                NextCouponDate = spec != null ? spec.NextCouponDate : null,
                PlacementDate = spec != null ? spec.PlacementDate : null,
                FaceValue = spec != null ? spec.FaceValue : null,
                CouponValue = spec != null ? spec.CouponValue : null,
                CouponPeriodDays = spec != null ? spec.CouponPeriodDays : null,
                CouponRate = spec != null ? spec.CouponRate : null,
                CouponType = spec != null ? spec.CouponType : null,
                AccruedInterest = spec != null ? spec.AccruedInterest : null,
                Currency = spec != null ? spec.Currency : null,
                FaceUnit = spec != null ? spec.FaceUnit : null,
                BondClass = spec != null ? spec.BondClass : null,
                IsForeignCurrency = spec != null ? spec.IsForeignCurrency : null,
                QualifiedOnly = spec != null ? spec.QualifiedOnly : null,
                PrimaryBoardId = spec != null ? spec.PrimaryBoardId : null,
                IssueSize = spec != null ? spec.IssueSize : null,
                IssueSizePlaced = spec != null ? spec.IssueSizePlaced : null,
                ListingLevel = spec != null ? spec.ListingLevel : null,
                MoexType = spec != null ? spec.MoexType : null,
                MoexGroup = spec != null ? spec.MoexGroup : null,
                MoexTypeTitle = moexType != null ? moexType.Title : null,
                ToDate = d.ToDate
            };

        baseQuery = baseQuery.Where(x => !x.ToDate.HasValue || x.ToDate.Value >= today);

        if (request.QualifiedOnly == true)
        {
            baseQuery = baseQuery.Where(x => x.QualifiedOnly == true);
        }

        if (minMaturityDate.HasValue)
        {
            baseQuery = baseQuery.Where(x => x.MaturityDate.HasValue && x.MaturityDate.Value >= minMaturityDate.Value);
        }
        if (maxMaturityDate.HasValue)
        {
            baseQuery = baseQuery.Where(x => x.MaturityDate.HasValue && x.MaturityDate.Value <= maxMaturityDate.Value);
        }

        if (moexTypeFilter.Count > 0)
        {
            var moexTypeFilterArray = moexTypeFilter.ToArray();
            baseQuery = baseQuery.Where(x => x.MoexType != null && moexTypeFilterArray.Contains(x.MoexType));
        }

        baseQuery = ApplyTabFilter(baseQuery, tab);

        var baseRows = await baseQuery.ToListAsync(cancellationToken);

        if (baseRows.Count == 0)
        {
            return new BondListResponseDto
            {
                Page = page,
                PageSize = pageSize
            };
        }

        var ids = baseRows.Select(x => x.DictionaryId).Distinct().ToArray();
        var latestImportedAtByDictionary = from s in _db.BondMarketSnapshots.AsNoTracking()
                                           where ids.Contains(s.DictionaryId)
                                           group s by s.DictionaryId into g
                                           select new
                                           {
                                               DictionaryId = g.Key,
                                               ImportedAt = g.Max(x => x.ImportedAt)
                                           };

        var latestSnapshots = await (from s in _db.BondMarketSnapshots.AsNoTracking()
                                     join latest in latestImportedAtByDictionary
                                         on new { s.DictionaryId, s.ImportedAt }
                                         equals new { latest.DictionaryId, latest.ImportedAt }
                                     where ids.Contains(s.DictionaryId)
                                     select s)
            .ToListAsync(cancellationToken);

        var snapshotMap = latestSnapshots
            .GroupBy(x => x.DictionaryId)
            .ToDictionary(
                g => g.Key,
                g => g.OrderByDescending(x => x.Id).First());

        var allRows = baseRows
            .Select(row => BuildItem(row, snapshotMap.TryGetValue(row.DictionaryId, out var snap) ? snap : null, today))
            .Where(row => row != null)
            .Cast<BondListItemDto>()
            .ToList();

        var filtered = allRows
            .Where(row => row.MaturityDate == null || row.MaturityDate >= today)
            .Where(row => row.YearsToMaturity == null || row.YearsToMaturity >= 0)
            .Where(row => request.YieldMin == null || (row.YieldPct.HasValue && row.YieldPct.Value >= request.YieldMin.Value))
            .Where(row => request.YieldMax == null || (row.YieldPct.HasValue && row.YieldPct.Value <= request.YieldMax.Value))
            .Where(row => request.YearsToMaturityMin == null || (row.YearsToMaturity.HasValue && row.YearsToMaturity.Value >= request.YearsToMaturityMin.Value))
            .Where(row => request.YearsToMaturityMax == null || (row.YearsToMaturity.HasValue && row.YearsToMaturity.Value <= request.YearsToMaturityMax.Value))
            .Where(row => request.DurationMin == null || (row.DurationYears.HasValue && row.DurationYears.Value >= request.DurationMin.Value))
            .Where(row => request.DurationMax == null || (row.DurationYears.HasValue && row.DurationYears.Value <= request.DurationMax.Value))
            .Where(row => couponFreqFilter.Count == 0 || (row.CouponFrequencyPerYear.HasValue && couponFreqFilter.Contains(row.CouponFrequencyPerYear.Value)))
            .ToList();

        var sorted = SortRows(filtered, request.OrderBy, request.Dir);
        var total = sorted.Count;
        var paged = sorted
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToList();

        var mapPoints = BuildMapPoints(filtered, request.MapMode);
        var facets = BuildFacets(filtered);

        return new BondListResponseDto
        {
            Total = total,
            Page = page,
            PageSize = pageSize,
            Items = paged,
            MapPoints = mapPoints,
            Facets = facets
        };
    }

    public async Task<BondDetailsResponseDto?> GetDetailsAsync(string secIdOrIsin, CancellationToken cancellationToken = default)
    {
        var normalized = NormalizeCode(secIdOrIsin);
        if (string.IsNullOrWhiteSpace(normalized))
        {
            return null;
        }

        var bySecId = await FindBondAsync(
            q => q.Where(x => x.SecIdNormalized == normalized),
            cancellationToken);

        var bond = bySecId ?? await FindBondAsync(
            q => q.Where(x => x.IsinNormalized == normalized),
            cancellationToken);

        if (bond == null)
        {
            return null;
        }

        var issuerStock = await ResolveIssuerStockAsync(bond.EmitentId, cancellationToken);

        var latestSnapshot = await _db.BondMarketSnapshots.AsNoTracking()
            .Where(x => x.DictionaryId == bond.DictionaryId)
            .OrderByDescending(x => x.ImportedAt)
            .ThenByDescending(x => x.Id)
            .FirstOrDefaultAsync(cancellationToken);

        var coupons = await _db.BondCoupons.AsNoTracking()
            .Where(x => x.DictionaryId == bond.DictionaryId)
            .OrderBy(x => x.CouponDate)
            .ThenBy(x => x.Number)
            .Select(x => new BondDetailsCouponDto
            {
                Number = x.Number,
                CouponDate = x.CouponDate,
                CouponValue = x.CouponValue,
                CouponYieldPct = x.CouponYieldPct,
                PercentOfPar = x.PercentOfPar,
                PercentOfMarket = x.PercentOfMarket
            })
            .ToListAsync(cancellationToken);

        return new BondDetailsResponseDto
        {
            Instrument = new BondDetailsInstrumentDto
            {
                DictionaryId = bond.DictionaryId,
                SecId = bond.SecId,
                ShortName = bond.ShortName,
                Isin = bond.Isin,
                RegNumber = bond.RegNumber,
                BondClass = bond.BondClass,
                MoexType = bond.MoexType,
                MoexTypeTitle = bond.MoexTypeTitle,
                MoexGroup = bond.MoexGroup,
                Currency = bond.Currency,
                IsForeignCurrency = bond.IsForeignCurrency,
                QualifiedOnly = bond.QualifiedOnly,
                PlacementDate = bond.PlacementDate,
                MaturityDate = bond.MaturityDate,
                OfferDate = bond.OfferDate,
                NextCouponDate = bond.NextCouponDate,
                FaceValue = bond.FaceValue,
                CouponValue = bond.CouponValue,
                CouponPeriodDays = bond.CouponPeriodDays,
                CouponRate = bond.CouponRate,
                CouponType = bond.CouponType,
                AccruedInterest = bond.AccruedInterest,
                PrimaryBoardId = bond.PrimaryBoardId,
                IssueSize = bond.IssueSize,
                IssueSizePlaced = bond.IssueSizePlaced,
                ListingLevel = bond.ListingLevel,
                EmitentId = bond.EmitentId,
                EmitentTitle = bond.EmitentTitle,
                EmitentInn = bond.EmitentInn,
                IssuerStockSecId = issuerStock.SecurityId,
                IssuerStockShortName = issuerStock.ShortName
            },
            LastSnapshot = latestSnapshot == null
                ? null
                : new BondDetailsSnapshotDto
                {
                    ImportedAt = latestSnapshot.ImportedAt,
                    BoardId = latestSnapshot.BoardId,
                    TradingStatus = latestSnapshot.TradingStatus,
                    PriceUnit = latestSnapshot.PriceUnit,
                    CurrencyId = latestSnapshot.CurrencyId,
                    PricePctOfPar = latestSnapshot.PricePctOfPar,
                    PriceRub = latestSnapshot.PriceRub,
                    YieldPct = latestSnapshot.YieldPct,
                    DayChangePct = latestSnapshot.DayChangePct,
                    DayVolume = latestSnapshot.DayVolume,
                    DayVolumeQty = latestSnapshot.DayVolumeQty,
                    AccruedInterest = latestSnapshot.AccruedInterest,
                    CouponValue = latestSnapshot.CouponValue,
                    NextCouponDate = latestSnapshot.NextCouponDate,
                    OfferDate = latestSnapshot.OfferDate
                },
            Coupons = coupons
        };
    }

    private async Task<BondDetailsRaw?> FindBondAsync(
        Func<IQueryable<BondDetailsRaw>, IQueryable<BondDetailsRaw>> scope,
        CancellationToken cancellationToken)
    {
        var query = from d in _db.Dictionaries.AsNoTracking()
                    where d.Market == MarketBonds
                    join spec in _db.BondSpecs.AsNoTracking() on d.Id equals spec.DictionaryId into specJoin
                    from spec in specJoin.DefaultIfEmpty()
                    join moexType in _db.MoexSecurityTypes.AsNoTracking() on spec.MoexType equals moexType.Name into moexTypeJoin
                    from moexType in moexTypeJoin.DefaultIfEmpty()
                    select new BondDetailsRaw
                    {
                        DictionaryId = d.Id,
                        SecId = d.Securityid,
                        SecIdNormalized = (d.Securityid ?? string.Empty).ToUpper(),
                        IsinNormalized = ((spec != null ? spec.Isin : d.Isin) ?? string.Empty).ToUpper(),
                        ShortName = d.Shortname,
                        Isin = spec != null && !string.IsNullOrWhiteSpace(spec.Isin) ? spec.Isin : d.Isin,
                        RegNumber = spec != null ? spec.RegNumber : null,
                        BondClass = spec != null ? spec.BondClass : null,
                        MoexType = spec != null ? spec.MoexType : null,
                        MoexGroup = spec != null ? spec.MoexGroup : null,
                        MoexTypeTitle = moexType != null ? moexType.Title : null,
                        Currency = spec != null ? spec.Currency : null,
                        IsForeignCurrency = spec != null ? spec.IsForeignCurrency : null,
                        QualifiedOnly = spec != null ? spec.QualifiedOnly : null,
                        PlacementDate = spec != null ? spec.PlacementDate : null,
                        MaturityDate = spec != null ? spec.MaturityDate : null,
                        OfferDate = spec != null ? spec.OfferDate : null,
                        NextCouponDate = spec != null ? spec.NextCouponDate : null,
                        FaceValue = spec != null ? spec.FaceValue : null,
                        CouponValue = spec != null ? spec.CouponValue : null,
                        CouponPeriodDays = spec != null ? spec.CouponPeriodDays : null,
                        CouponRate = spec != null ? spec.CouponRate : null,
                        CouponType = spec != null ? spec.CouponType : null,
                        AccruedInterest = spec != null ? spec.AccruedInterest : null,
                        PrimaryBoardId = spec != null ? spec.PrimaryBoardId : null,
                        IssueSize = spec != null ? spec.IssueSize : null,
                        IssueSizePlaced = spec != null ? spec.IssueSizePlaced : null,
                        ListingLevel = spec != null ? spec.ListingLevel : null,
                        EmitentId = d.EmitentId,
                        EmitentTitle = d.EmitentTitle,
                        EmitentInn = d.EmitentInn
                    };

        return await scope(query).OrderBy(x => x.SecId).FirstOrDefaultAsync(cancellationToken);
    }

    private async Task<(string? SecurityId, string? ShortName)> ResolveIssuerStockAsync(
        int? emitentId,
        CancellationToken cancellationToken)
    {
        if (!emitentId.HasValue)
        {
            return (null, null);
        }

        var today = DateTime.UtcNow.Date;
        var activeStock = await _db.Dictionaries.AsNoTracking()
            .Where(d =>
                d.Market == MarketStocks &&
                d.EmitentId == emitentId.Value &&
                (!d.ToDate.HasValue || d.ToDate.Value >= today))
            .OrderBy(d => d.Securityid)
            .Select(d => new { d.Securityid, d.Shortname })
            .FirstOrDefaultAsync(cancellationToken);

        if (activeStock != null)
        {
            return (activeStock.Securityid, activeStock.Shortname);
        }

        var anyStock = await _db.Dictionaries.AsNoTracking()
            .Where(d => d.Market == MarketStocks && d.EmitentId == emitentId.Value)
            .OrderByDescending(d => d.ToDate)
            .ThenBy(d => d.Securityid)
            .Select(d => new { d.Securityid, d.Shortname })
            .FirstOrDefaultAsync(cancellationToken);

        return anyStock == null
            ? (null, null)
            : (anyStock.Securityid, anyStock.Shortname);
    }

    private static BondListItemDto? BuildItem(BaseBondRow row, BondMarketSnapshot? snapshot, DateTime today)
    {
        if (string.IsNullOrWhiteSpace(row.SecId))
        {
            return null;
        }

        if (row.ToDate.HasValue && row.ToDate.Value.Date < today)
        {
            return null;
        }

        var yearsToMaturity = ComputeYearsToDate(row.MaturityDate, today);
        var durationYears = yearsToMaturity;
        var priceRub = ResolvePriceRub(snapshot, row.FaceValue);
        var couponFrequency = ComputeCouponFrequency(row.CouponPeriodDays);
        var couponAnnualYieldPct = ComputeCouponAnnualYieldPct(row, snapshot, priceRub);

        return new BondListItemDto
        {
            DictionaryId = row.DictionaryId,
            SecId = row.SecId,
            ShortName = row.ShortName,
            Isin = string.IsNullOrWhiteSpace(row.Isin) ? row.IsinFromDictionary : row.Isin,
            RegNumber = row.RegNumber,
            BondClass = row.BondClass,
            MoexType = row.MoexType,
            MoexTypeTitle = string.IsNullOrWhiteSpace(row.MoexTypeTitle) ? row.MoexType : row.MoexTypeTitle,
            MoexGroup = row.MoexGroup,
            Currency = row.Currency,
            IsForeignCurrency = row.IsForeignCurrency,
            QualifiedOnly = row.QualifiedOnly,
            MaturityDate = row.MaturityDate,
            OfferDate = snapshot?.OfferDate ?? row.OfferDate,
            NextCouponDate = snapshot?.NextCouponDate ?? row.NextCouponDate,
            YearsToMaturity = yearsToMaturity,
            DurationYears = durationYears,
            YieldPct = snapshot?.YieldPct,
            CouponAnnualYieldPct = couponAnnualYieldPct,
            PricePctOfPar = snapshot?.PricePctOfPar,
            PriceRub = priceRub,
            AccruedInterest = snapshot?.AccruedInterest ?? row.AccruedInterest,
            CouponValue = snapshot?.CouponValue ?? row.CouponValue,
            CouponPeriodDays = row.CouponPeriodDays,
            CouponFrequencyPerYear = couponFrequency,
            DayVolume = snapshot?.DayVolume,
            DayVolumeQty = snapshot?.DayVolumeQty,
            BoardId = snapshot?.BoardId ?? row.PrimaryBoardId
        };
    }

    private static List<BondListItemDto> SortRows(List<BondListItemDto> rows, string? orderBy, string? dir)
    {
        var key = (orderBy ?? string.Empty).Trim().ToLowerInvariant();
        var desc = string.Equals(dir, "desc", StringComparison.OrdinalIgnoreCase);

        IOrderedEnumerable<BondListItemDto> ordered = key switch
        {
            "name" => rows.OrderBy(x => x.ShortName ?? x.SecId, StringComparer.OrdinalIgnoreCase),
            "secid" => rows.OrderBy(x => x.SecId, StringComparer.OrdinalIgnoreCase),
            "maturitydate" => rows.OrderBy(x => x.MaturityDate ?? DateTime.MaxValue),
            "yearstomaturity" => rows.OrderBy(x => x.YearsToMaturity ?? decimal.MaxValue),
            "yield" or "yieldpct" => rows.OrderBy(x => x.YieldPct ?? decimal.MinValue),
            "couponannualyieldpct" => rows.OrderBy(x => x.CouponAnnualYieldPct ?? decimal.MinValue),
            "pricepctofpar" => rows.OrderBy(x => x.PricePctOfPar ?? decimal.MinValue),
            "pricerub" => rows.OrderBy(x => x.PriceRub ?? decimal.MinValue),
            "dayvolume" => rows.OrderBy(x => x.DayVolume ?? decimal.MinValue),
            "dayvolumeqty" => rows.OrderBy(x => x.DayVolumeQty ?? long.MinValue),
            "duration" or "durationyears" => rows.OrderBy(x => x.DurationYears ?? decimal.MaxValue),
            _ => rows.OrderBy(x => x.YieldPct ?? decimal.MinValue)
        };

        if (desc)
        {
            ordered = key switch
            {
                "name" => rows.OrderByDescending(x => x.ShortName ?? x.SecId, StringComparer.OrdinalIgnoreCase),
                "secid" => rows.OrderByDescending(x => x.SecId, StringComparer.OrdinalIgnoreCase),
                "maturitydate" => rows.OrderByDescending(x => x.MaturityDate ?? DateTime.MinValue),
                "yearstomaturity" => rows.OrderByDescending(x => x.YearsToMaturity ?? decimal.MinValue),
                "yield" or "yieldpct" => rows.OrderByDescending(x => x.YieldPct ?? decimal.MinValue),
                "couponannualyieldpct" => rows.OrderByDescending(x => x.CouponAnnualYieldPct ?? decimal.MinValue),
                "pricepctofpar" => rows.OrderByDescending(x => x.PricePctOfPar ?? decimal.MinValue),
                "pricerub" => rows.OrderByDescending(x => x.PriceRub ?? decimal.MinValue),
                "dayvolume" => rows.OrderByDescending(x => x.DayVolume ?? decimal.MinValue),
                "dayvolumeqty" => rows.OrderByDescending(x => x.DayVolumeQty ?? long.MinValue),
                "duration" or "durationyears" => rows.OrderByDescending(x => x.DurationYears ?? decimal.MinValue),
                _ => rows.OrderByDescending(x => x.YieldPct ?? decimal.MinValue)
            };
        }

        return ordered
            .ThenBy(x => x.SecId, StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    private static BondFacetsDto BuildFacets(List<BondListItemDto> rows)
    {
        var moexTypes = rows
            .Where(x => !string.IsNullOrWhiteSpace(x.MoexType))
            .GroupBy(x => new { Key = x.MoexType!, Label = string.IsNullOrWhiteSpace(x.MoexTypeTitle) ? x.MoexType! : x.MoexTypeTitle! })
            .Select(g => new BondFacetItemDto
            {
                Key = g.Key.Key,
                Label = g.Key.Label,
                Count = g.Count()
            })
            .OrderByDescending(x => x.Count)
            .ThenBy(x => x.Key, StringComparer.OrdinalIgnoreCase)
            .ToList();

        var couponFrequencies = rows
            .Where(x => x.CouponFrequencyPerYear.HasValue && x.CouponFrequencyPerYear.Value > 0)
            .GroupBy(x => x.CouponFrequencyPerYear!.Value)
            .Select(g => new BondFacetItemDto
            {
                Key = g.Key.ToString(),
                Label = $"{g.Key} / year",
                Count = g.Count()
            })
            .OrderBy(x => int.Parse(x.Key))
            .ToList();

        return new BondFacetsDto
        {
            MoexTypes = moexTypes,
            CouponFrequencies = couponFrequencies
        };
    }

    private static List<BondMapPointDto> BuildMapPoints(List<BondListItemDto> rows, string? mapMode)
    {
        var mode = (mapMode ?? string.Empty).Trim().ToLowerInvariant();
        decimal? ResolveY(BondListItemDto x)
        {
            return mode switch
            {
                "coupon_yield_by_duration" => x.CouponAnnualYieldPct,
                "ytm" => x.YieldPct,
                "coupon_yield_to_maturity" => x.CouponAnnualYieldPct,
                _ => x.YieldPct
            };
        }

        return rows
            .Select(x => new BondMapPointDto
            {
                DictionaryId = x.DictionaryId,
                SecId = x.SecId,
                ShortName = x.ShortName,
                X = x.DurationYears,
                Y = ResolveY(x),
                PricePctOfPar = x.PricePctOfPar,
                MaturityDate = x.MaturityDate
            })
            .Where(x => x.X.HasValue && x.Y.HasValue)
            .Take(2000)
            .ToList();
    }

    private static IQueryable<BaseBondRow> ApplyTabFilter(IQueryable<BaseBondRow> query, string tab)
    {
        return tab switch
        {
            "all" => query,
            "ofz" => query.Where(x =>
                (x.BondClass != null && x.BondClass == "ofz") ||
                (x.MoexType != null && OfzTypeCodes.Contains(x.MoexType))),
            "corp" => query.Where(x =>
                ((x.BondClass != null && x.BondClass == "corp") ||
                 (x.MoexType != null && CorpTypeCodes.Contains(x.MoexType))) &&
                x.IsForeignCurrency != true),
            "cur" => query.Where(x => x.IsForeignCurrency == true),
            "subfed" => query.Where(x =>
                (x.BondClass != null && x.BondClass == "subfed") ||
                (x.MoexType != null && SubfedTypeCodes.Contains(x.MoexType))),
            "other" => query.Where(x =>
                x.IsForeignCurrency != true &&
                !((x.BondClass != null && (x.BondClass == "ofz" || x.BondClass == "corp" || x.BondClass == "subfed")) ||
                  (x.MoexType != null && (OfzTypeCodes.Contains(x.MoexType) || CorpTypeCodes.Contains(x.MoexType) || SubfedTypeCodes.Contains(x.MoexType))))),
            _ => query
        };
    }

    private static string NormalizeTab(string? tab)
    {
        var normalized = (tab ?? "all").Trim().ToLowerInvariant();
        return normalized switch
        {
            "all" => "all",
            "ofz" => "ofz",
            "corp" => "corp",
            "cur" => "cur",
            "subfed" => "subfed",
            "other" => "other",
            _ => "all"
        };
    }

    private static string NormalizeCode(string? value)
    {
        return (value ?? string.Empty).Trim().ToUpperInvariant();
    }

    private static decimal? ComputeYearsToDate(DateTime? date, DateTime today)
    {
        if (!date.HasValue)
        {
            return null;
        }

        var days = (decimal)(date.Value.Date - today.Date).TotalDays;
        return Math.Round(days / 365.25m, 4, MidpointRounding.AwayFromZero);
    }

    private static int? ComputeCouponFrequency(int? couponPeriodDays)
    {
        if (!couponPeriodDays.HasValue || couponPeriodDays.Value <= 0)
        {
            return null;
        }

        var perYear = (int)Math.Round(365m / couponPeriodDays.Value, MidpointRounding.AwayFromZero);
        return perYear <= 0 ? null : perYear;
    }

    private static decimal? ResolvePriceRub(BondMarketSnapshot? snapshot, decimal? faceValue)
    {
        if (snapshot == null)
        {
            return null;
        }

        if (snapshot.PriceRub.HasValue && snapshot.PriceRub.Value > 0)
        {
            return snapshot.PriceRub.Value;
        }

        if (snapshot.PricePctOfPar.HasValue && snapshot.PricePctOfPar.Value > 0 && faceValue.HasValue && faceValue.Value > 0)
        {
            return snapshot.PricePctOfPar.Value / 100m * faceValue.Value;
        }

        return null;
    }

    private static decimal? ComputeCouponAnnualYieldPct(BaseBondRow row, BondMarketSnapshot? snapshot, decimal? moneyPrice)
    {
        if (!moneyPrice.HasValue || moneyPrice.Value <= 0)
        {
            return null;
        }

        var faceValue = row.FaceValue;
        var couponRate = NormalizePercent(row.CouponRate);
        if (couponRate.HasValue && faceValue.HasValue && faceValue.Value > 0)
        {
            var annualCoupon = faceValue.Value * couponRate.Value / 100m;
            if (annualCoupon > 0)
            {
                return annualCoupon / moneyPrice.Value * 100m;
            }
        }

        var couponValue = row.CouponValue ?? snapshot?.CouponValue;
        if (!couponValue.HasValue || couponValue.Value <= 0)
        {
            return null;
        }

        var annualCouponByPeriod = row.CouponPeriodDays.HasValue && row.CouponPeriodDays.Value > 0
            ? couponValue.Value * 365m / row.CouponPeriodDays.Value
            : couponValue.Value;

        if (annualCouponByPeriod <= 0)
        {
            return null;
        }

        return annualCouponByPeriod / moneyPrice.Value * 100m;
    }

    private static decimal? NormalizePercent(decimal? value)
    {
        if (!value.HasValue || value.Value <= 0)
        {
            return null;
        }

        return value.Value <= 1m
            ? value.Value * 100m
            : value.Value;
    }

    private sealed class BaseBondRow
    {
        public int DictionaryId { get; set; }
        public string SecId { get; set; } = string.Empty;
        public string? ShortName { get; set; }
        public string? IsinFromDictionary { get; set; }
        public string? Isin { get; set; }
        public string? RegNumber { get; set; }
        public DateTime? PlacementDate { get; set; }
        public DateTime? MaturityDate { get; set; }
        public DateTime? OfferDate { get; set; }
        public DateTime? NextCouponDate { get; set; }
        public decimal? FaceValue { get; set; }
        public decimal? CouponValue { get; set; }
        public int? CouponPeriodDays { get; set; }
        public decimal? CouponRate { get; set; }
        public string? CouponType { get; set; }
        public decimal? AccruedInterest { get; set; }
        public string? Currency { get; set; }
        public string? FaceUnit { get; set; }
        public string? BondClass { get; set; }
        public bool? IsForeignCurrency { get; set; }
        public bool? QualifiedOnly { get; set; }
        public string? PrimaryBoardId { get; set; }
        public long? IssueSize { get; set; }
        public long? IssueSizePlaced { get; set; }
        public int? ListingLevel { get; set; }
        public string? MoexType { get; set; }
        public string? MoexGroup { get; set; }
        public string? MoexTypeTitle { get; set; }
        public DateTime? ToDate { get; set; }
    }

    private sealed class BondDetailsRaw
    {
        public int DictionaryId { get; set; }
        public string SecId { get; set; } = string.Empty;
        public string SecIdNormalized { get; set; } = string.Empty;
        public string IsinNormalized { get; set; } = string.Empty;
        public string? ShortName { get; set; }
        public string? Isin { get; set; }
        public string? RegNumber { get; set; }
        public string? BondClass { get; set; }
        public string? MoexType { get; set; }
        public string? MoexTypeTitle { get; set; }
        public string? MoexGroup { get; set; }
        public string? Currency { get; set; }
        public bool? IsForeignCurrency { get; set; }
        public bool? QualifiedOnly { get; set; }
        public DateTime? PlacementDate { get; set; }
        public DateTime? MaturityDate { get; set; }
        public DateTime? OfferDate { get; set; }
        public DateTime? NextCouponDate { get; set; }
        public decimal? FaceValue { get; set; }
        public decimal? CouponValue { get; set; }
        public int? CouponPeriodDays { get; set; }
        public decimal? CouponRate { get; set; }
        public string? CouponType { get; set; }
        public decimal? AccruedInterest { get; set; }
        public string? PrimaryBoardId { get; set; }
        public long? IssueSize { get; set; }
        public long? IssueSizePlaced { get; set; }
        public int? ListingLevel { get; set; }
        public int? EmitentId { get; set; }
        public string? EmitentTitle { get; set; }
        public string? EmitentInn { get; set; }
    }
}
