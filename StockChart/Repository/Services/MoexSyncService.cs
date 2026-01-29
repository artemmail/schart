
using System.Globalization;
using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
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

    private static readonly string[] BondColumns =
    {
        "secid",
        "shortname",
        "isin",
        "regnumber",
        "emitent_id",
        "emitent_title",
        "emitent_inn",
        "primary_boardid",
        "matdate",
        "facevalue",
        "currencyid"
    };

    private static readonly string[] FuturesColumns =
    {
        "secid",
        "shortname",
        "assetcode",
        "expirationdate",
        "lasttradedate",
        "lastdeldate",
        "lasttradingdate",
        "lotsize",
        "minstep",
        "stepprice"
    };

    private static readonly string[] OptionsColumns =
    {
        "secid",
        "shortname",
        "assetcode",
        "optiontype",
        "strike",
        "expirationdate",
        "lasttradedate",
        "lastdeldate",
        "lasttradingdate",
        "lotsize"
    };

    private readonly ApplicationDbContext _dbContext;
    private readonly HttpClient _httpClient;
    private readonly ILogger<MoexSyncService> _logger;

    public MoexSyncService(ApplicationDbContext dbContext, HttpClient httpClient, ILogger<MoexSyncService> logger)
    {
        _dbContext = dbContext;
        _httpClient = httpClient;
        _logger = logger;
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


        private sealed record ShareInfo(
        string Secid,
        string? Shortname,
        string? Isin,
        int? LotSize,
        int? Decimals,
        decimal? MinStep
    );

        private async Task<IReadOnlyList<ShareInfo>> FetchActiveSharesAsync(
            CancellationToken cancellationToken,
            string boardId = "TQBR",
            int pageSize = 200)
        {
            // ћинимально полезные колонки под твой Dictionary (Securityid/Shortname/Isin/Lotsize/Scale/Minstep)
            var columns = Uri.EscapeDataString("SECID,SHORTNAME,ISIN,LOTSIZE,DECIMALS,MINSTEP");

            var result = new List<ShareInfo>(2048);
            var start = 0;

           // while (true)
            {
                var url =
                    $"https://iss.moex.com/iss/engines/stock/markets/shares/boards/{Uri.EscapeDataString(boardId)}/securities.json" +
                    $"?iss.meta=off&iss.only=securities&securities.columns={columns}&start={start}&limit={pageSize}";

                using var doc = await GetJsonAsync(url, cancellationToken);
                if (doc == null)
                {
                    return result;
                }

                if (!TryGetTable(doc.RootElement, "securities", out var columnsElement, out var dataElement))
                {
                    return result;
                }

                if (dataElement.ValueKind != JsonValueKind.Array || dataElement.GetArrayLength() == 0)
                {
                    return result;
                }

                var columnIndex = BuildColumnIndex(columnsElement);

                var secidIndex = GetColumnIndex(columnIndex, "SECID");
                if (!secidIndex.HasValue)
                {
                    return result;
                }

                var shortnameIndex = GetColumnIndex(columnIndex, "SHORTNAME");
                var isinIndex = GetColumnIndex(columnIndex, "ISIN");
                var lotsizeIndex = GetColumnIndex(columnIndex, "LOTSIZE");
                var decimalsIndex = GetColumnIndex(columnIndex, "DECIMALS");
                var minstepIndex = GetColumnIndex(columnIndex, "MINSTEP");

                foreach (var row in dataElement.EnumerateArray())
                {
                    if (row.ValueKind != JsonValueKind.Array)
                    {
                        continue;
                    }

                    var secid = ReadString(row, secidIndex.Value);
                    if (string.IsNullOrWhiteSpace(secid))
                    {
                        continue;
                    }

                    result.Add(new ShareInfo(
                        Secid: NormalizeCode(secid),
                        Shortname: ReadString(row, shortnameIndex),
                        Isin: ReadString(row, isinIndex),
                        LotSize: ReadInt(row, lotsizeIndex),
                        Decimals: ReadInt(row, decimalsIndex),
                        MinStep: ReadDecimal(row, minstepIndex)
                    ));
                }

                start += pageSize;
            }

            return result;

            static decimal? ReadDecimal(JsonElement row, int? index)
            {
                if (!index.HasValue || row.ValueKind != JsonValueKind.Array)
                {
                    return null;
                }

                if (index.Value < 0 || index.Value >= row.GetArrayLength())
                {
                    return null;
                }

                var cell = row[index.Value];

                if (cell.ValueKind == JsonValueKind.Number)
                {
                    if (cell.TryGetDecimal(out var d)) return d;
                    if (cell.TryGetDouble(out var dbl)) return (decimal)dbl;
                    return null;
                }

                if (cell.ValueKind == JsonValueKind.String)
                {
                    var s = cell.GetString();
                    if (string.IsNullOrWhiteSpace(s)) return null;

                    if (decimal.TryParse(s, NumberStyles.Any, CultureInfo.InvariantCulture, out var d)) return d;
                    if (decimal.TryParse(s, NumberStyles.Any, CultureInfo.GetCultureInfo("ru-RU"), out d)) return d;
                }

                return null;
            }
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
    private async Task<(int Updated, int LinksUpserted)> SyncBondsInternalAsync(CancellationToken cancellationToken)
    {
        var updated = 0;
        var linksUpserted = 0;
        var start = 0;
        const int limit = 1000;

        while (true)
        {
            var page = await FetchBondPageAsync(start, limit, cancellationToken);
            if (page.Count == 0)
            {
                break;
            }

            var secids = page.Select(p => p.SecId).Distinct(StringComparer.OrdinalIgnoreCase).ToList();
            var existing = await _dbContext.Dictionaries
                .Where(d => d.Market == MarketBonds && secids.Contains(d.Securityid))
                .ToListAsync(cancellationToken);

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

                var bondSpec = specMap.TryGetValue(dic.Id, out var existingSpec)
                    ? existingSpec
                    : new BondSpec { Dictionary = dic };

                var specChanged = UpdateBondSpec(bondSpec, row);

                if (existingSpec == null)
                {
                    _dbContext.BondSpecs.Add(bondSpec);
                    specChanged = true;
                }

                if (dictChanged || specChanged)
                {
                    updated++;
                    touchedBonds.Add(dic);
                }
            }

            if (_dbContext.ChangeTracker.HasChanges())
            {
                await _dbContext.SaveChangesAsync(cancellationToken);
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
            var rows = await FetchOptionsAsync(asset, cancellationToken);
            if (rows.Count == 0)
            {
                continue;
            }

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

                var specChanged = UpdateOptionSpec(optionSpec, row);

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
        }

        return (updated, linksUpserted);
    }

    private async Task<List<MoexBondRow>> FetchBondPageAsync(int start, int limit, CancellationToken cancellationToken)
    {
        var columns = string.Join(",", BondColumns);
        var url =
            $"https://iss.moex.com/iss/securities.json?iss.meta=off&group_by=type&group_by_filter=corporate_bond" +
            $"&limit={limit}&start={start}&securities.columns={Uri.EscapeDataString(columns)}";

        using var doc = await GetJsonAsync(url, cancellationToken);
        if (doc == null)
        {
            return new List<MoexBondRow>();
        }

        if (!TryGetTable(doc.RootElement, "securities", out var columnsElement, out var dataElement))
        {
            return new List<MoexBondRow>();
        }

        var columnIndex = BuildColumnIndex(columnsElement);
        var rows = new List<MoexBondRow>();
        var secidIndex = GetColumnIndex(columnIndex, "secid");
        if (!secidIndex.HasValue)
        {
            return rows;
        }

        foreach (var row in dataElement.EnumerateArray())
        {
            if (row.ValueKind != JsonValueKind.Array)
            {
                continue;
            }

            var secid = ReadString(row, secidIndex.Value);
            if (string.IsNullOrWhiteSpace(secid))
            {
                continue;
            }

            var shortname = ReadString(row, GetColumnIndex(columnIndex, "shortname"));
            var isin = ReadString(row, GetColumnIndex(columnIndex, "isin"));
            var regnumber = ReadString(row, GetColumnIndex(columnIndex, "regnumber"));
            var emitentId = ReadInt(row, GetColumnIndex(columnIndex, "emitent_id"));
            var emitentTitle = ReadString(row, GetColumnIndex(columnIndex, "emitent_title"));
            var emitentInn = ReadString(row, GetColumnIndex(columnIndex, "emitent_inn"));
            var primaryBoard = ReadString(row, GetColumnIndex(columnIndex, "primary_boardid"));
            var maturity = ReadDate(row, GetColumnIndex(columnIndex, "matdate"));
            var faceValue = ReadDecimal(row, GetColumnIndex(columnIndex, "facevalue"));
            var currency = ReadString(row, GetColumnIndex(columnIndex, "currencyid"));

            var emitent = new EmitentInfo(emitentId, emitentTitle, emitentInn);
            var bond = new MoexBondRow(
                NormalizeCode(secid),
                shortname,
                isin,
                regnumber,
                emitent,
                primaryBoard,
                maturity,
                faceValue,
                currency);

            if (!bond.HasDetails)
            {
                var details = await FetchBondDetailsAsync(bond.SecId, cancellationToken);
                if (details != null)
                {
                    bond = bond.WithDetails(details);
                }
            }

            rows.Add(bond);
        }

        return rows;
    }

    private async Task<BondDetails?> FetchBondDetailsAsync(string secid, CancellationToken cancellationToken)
    {
        var columns = Uri.EscapeDataString("SECID,SHORTNAME,MATDATE,FACEVALUE,CURRENCYID,ISIN,REGNUMBER,PRIMARY_BOARDID");
        var url =
            $"https://iss.moex.com/iss/engines/stock/markets/bonds/securities/{Uri.EscapeDataString(secid)}.json" +
            $"?iss.meta=off&securities.columns={columns}";

        using var doc = await GetJsonAsync(url, cancellationToken);
        if (doc == null)
        {
            return null;
        }

        if (!TryGetTable(doc.RootElement, "securities", out var columnsElement, out var dataElement))
        {
            return null;
        }

        var columnIndex = BuildColumnIndex(columnsElement);
        var secidIndex = GetColumnIndex(columnIndex, "SECID", "secid");
        if (!secidIndex.HasValue)
        {
            return null;
        }

        foreach (var row in dataElement.EnumerateArray())
        {
            if (row.ValueKind != JsonValueKind.Array)
            {
                continue;
            }

            var rowSecid = ReadString(row, secidIndex.Value);
            if (!string.Equals(NormalizeCode(rowSecid), secid, StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            var maturity = ReadDate(row, GetColumnIndex(columnIndex, "MATDATE", "matdate"));
            var faceValue = ReadDecimal(row, GetColumnIndex(columnIndex, "FACEVALUE", "facevalue"));
            var currency = ReadString(row, GetColumnIndex(columnIndex, "CURRENCYID", "currencyid"));
            var isin = ReadString(row, GetColumnIndex(columnIndex, "ISIN", "isin"));
            var regNumber = ReadString(row, GetColumnIndex(columnIndex, "REGNUMBER", "regnumber"));
            var primaryBoard = ReadString(row, GetColumnIndex(columnIndex, "PRIMARY_BOARDID", "primary_boardid"));

            return new BondDetails(maturity, faceValue, currency, isin, regNumber, primaryBoard);
        }

        return null;
    }
    private async Task<List<MoexFutureRow>> FetchFuturesAsync(CancellationToken cancellationToken)
    {
        var columns = Uri.EscapeDataString(string.Join(",", FuturesColumns));
        var url =
            "https://iss.moex.com/iss/engines/futures/markets/forts/boards/rfud/securities.json" +
            $"?iss.meta=off&securities.columns={columns}";

        using var doc = await GetJsonAsync(url, cancellationToken);
        if (doc == null)
        {
            return new List<MoexFutureRow>();
        }

        if (!TryGetTable(doc.RootElement, "securities", out var columnsElement, out var dataElement))
        {
            return new List<MoexFutureRow>();
        }

        var columnIndex = BuildColumnIndex(columnsElement);
        var secidIndex = GetColumnIndex(columnIndex, "secid");
        if (!secidIndex.HasValue)
        {
            return new List<MoexFutureRow>();
        }

        var rows = new List<MoexFutureRow>();

        foreach (var row in dataElement.EnumerateArray())
        {
            if (row.ValueKind != JsonValueKind.Array)
            {
                continue;
            }

            var secid = ReadString(row, secidIndex.Value);
            if (string.IsNullOrWhiteSpace(secid))
            {
                continue;
            }

            var shortname = ReadString(row, GetColumnIndex(columnIndex, "shortname"));
            var assetCode = ReadString(row, GetColumnIndex(columnIndex, "assetcode"));
            var expiration = ReadDate(row, GetColumnIndex(columnIndex, "expirationdate", "lasttradedate", "lastdeldate", "lasttradingdate"));
            var lotSize = ReadInt(row, GetColumnIndex(columnIndex, "lotsize"));
            var minstep = ReadDecimal(row, GetColumnIndex(columnIndex, "minstep"));
            var stepPrice = ReadDecimal(row, GetColumnIndex(columnIndex, "stepprice"));

            rows.Add(new MoexFutureRow(
                NormalizeCode(secid),
                shortname,
                NormalizeCode(assetCode),
                expiration,
                lotSize,
                minstep,
                stepPrice));
        }

        return rows;
    }

    private async Task<List<MoexOptionRow>> FetchOptionsAsync(string asset, CancellationToken cancellationToken)
    {
        var columns = Uri.EscapeDataString(string.Join(",", OptionsColumns));
        var url =
            $"https://iss.moex.com/iss/statistics/engines/futures/markets/options/assets/{Uri.EscapeDataString(asset)}/optionboard.json" +
            $"?iss.meta=off&optionboard.columns={columns}";

        using var doc = await GetJsonAsync(url, cancellationToken);
        if (doc == null)
        {
            return new List<MoexOptionRow>();
        }

        if (!TryGetTable(doc.RootElement, "optionboard", out var columnsElement, out var dataElement))
        {
            return new List<MoexOptionRow>();
        }

        var columnIndex = BuildColumnIndex(columnsElement);
        var secidIndex = GetColumnIndex(columnIndex, "secid");
        if (!secidIndex.HasValue)
        {
            return new List<MoexOptionRow>();
        }

        var rows = new List<MoexOptionRow>();

        foreach (var row in dataElement.EnumerateArray())
        {
            if (row.ValueKind != JsonValueKind.Array)
            {
                continue;
            }

            var secid = ReadString(row, secidIndex.Value);
            if (string.IsNullOrWhiteSpace(secid))
            {
                continue;
            }

            var shortname = ReadString(row, GetColumnIndex(columnIndex, "shortname"));
            var assetCode = ReadString(row, GetColumnIndex(columnIndex, "assetcode"));
            var optionType = ReadString(row, GetColumnIndex(columnIndex, "optiontype"));
            var strike = ReadDecimal(row, GetColumnIndex(columnIndex, "strike"));
            var expiration = ReadDate(row, GetColumnIndex(columnIndex, "expirationdate", "lasttradedate", "lastdeldate", "lasttradingdate"));
            var lotSize = ReadInt(row, GetColumnIndex(columnIndex, "lotsize"));

            rows.Add(new MoexOptionRow(
                NormalizeCode(secid),
                shortname,
                NormalizeCode(assetCode),
                optionType,
                strike,
                expiration,
                lotSize));
        }

        return rows;
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

    private bool UpdateBondSpec(BondSpec spec, MoexBondRow row)
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

    private bool UpdateOptionSpec(OptionSpec spec, MoexOptionRow row)
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

        if (row.Strike.HasValue && spec.Strike != row.Strike)
        {
            spec.Strike = row.Strike;
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

    private async Task<EmitentInfo?> FetchEmitentAsync(string secid, CancellationToken cancellationToken)
    {
        var columns = Uri.EscapeDataString("secid,emitent_id,emitent_title,emitent_inn");
        var url =
            $"https://iss.moex.com/iss/securities.json?iss.meta=off&q={Uri.EscapeDataString(secid)}&securities.columns={columns}";

        using var doc = await GetJsonAsync(url, cancellationToken);
        if (doc == null)
        {
            return null;
        }

        if (!TryGetTable(doc.RootElement, "securities", out var columnsElement, out var dataElement))
        {
            return null;
        }

        var columnIndex = BuildColumnIndex(columnsElement);
        var secidIndex = GetColumnIndex(columnIndex, "secid");
        if (!secidIndex.HasValue)
        {
            return null;
        }

        foreach (var row in dataElement.EnumerateArray())
        {
            if (row.ValueKind != JsonValueKind.Array)
            {
                continue;
            }

            var rowSecid = ReadString(row, secidIndex.Value);
            if (!string.Equals(NormalizeCode(rowSecid), secid, StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            var emitentId = ReadInt(row, GetColumnIndex(columnIndex, "emitent_id"));
            var emitentTitle = ReadString(row, GetColumnIndex(columnIndex, "emitent_title"));
            var emitentInn = ReadString(row, GetColumnIndex(columnIndex, "emitent_inn"));

            return new EmitentInfo(emitentId, emitentTitle, emitentInn);
        }

        return null;
    }

    private async Task<JsonDocument?> GetJsonAsync(string url, CancellationToken cancellationToken)
    {
        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, url);
            request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            request.Headers.UserAgent.ParseAdd("StockChart/1.0");

            using var response = await _httpClient.SendAsync(request, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("MOEX request failed: {Url} ({StatusCode})", url, response.StatusCode);
                return null;
            }

            var content = await response.Content.ReadAsStringAsync(cancellationToken);
            return JsonDocument.Parse(content);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "MOEX request failed: {Url}", url);
            return null;
        }
    }

    private static bool TryGetTable(JsonElement root, string tableName, out JsonElement columns, out JsonElement data)
    {
        columns = default;
        data = default;

        if (!root.TryGetProperty(tableName, out var table) || table.ValueKind != JsonValueKind.Object)
        {
            return false;
        }

        if (!table.TryGetProperty("columns", out columns) || columns.ValueKind != JsonValueKind.Array)
        {
            return false;
        }

        if (!table.TryGetProperty("data", out data) || data.ValueKind != JsonValueKind.Array)
        {
            return false;
        }

        return true;
    }

    private static Dictionary<string, int> BuildColumnIndex(JsonElement columns)
    {
        var index = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        var i = 0;
        foreach (var column in columns.EnumerateArray())
        {
            var name = column.GetString();
            if (!string.IsNullOrWhiteSpace(name))
            {
                index[name] = i;
            }
            i++;
        }
        return index;
    }

    private static int? GetColumnIndex(Dictionary<string, int> columns, params string[] names)
    {
        foreach (var name in names)
        {
            if (columns.TryGetValue(name, out var index))
            {
                return index;
            }
        }
        return null;
    }

    private static string? ReadString(JsonElement row, int? index)
    {
        if (!index.HasValue)
        {
            return null;
        }

        if (row.ValueKind != JsonValueKind.Array || row.GetArrayLength() <= index.Value)
        {
            return null;
        }

        var element = row[index.Value];
        if (element.ValueKind == JsonValueKind.String)
        {
            return element.GetString();
        }

        if (element.ValueKind == JsonValueKind.Number)
        {
            return element.GetRawText();
        }

        return null;
    }

    private static int? ReadInt(JsonElement row, int? index)
    {
        if (!index.HasValue || row.ValueKind != JsonValueKind.Array || row.GetArrayLength() <= index.Value)
        {
            return null;
        }

        var element = row[index.Value];
        if (element.ValueKind == JsonValueKind.Number)
        {
            if (element.TryGetInt32(out var i))
            {
                return i;
            }

            if (element.TryGetInt64(out var l))
            {
                if (l >= int.MinValue && l <= int.MaxValue)
                {
                    return (int)l;
                }
            }
        }

        if (element.ValueKind == JsonValueKind.String)
        {
            var str = element.GetString();
            if (int.TryParse(str, NumberStyles.Integer, CultureInfo.InvariantCulture, out var i))
            {
                return i;
            }
        }

        return null;
    }

    private static decimal? ReadDecimal(JsonElement row, int? index)
    {
        if (!index.HasValue || row.ValueKind != JsonValueKind.Array || row.GetArrayLength() <= index.Value)
        {
            return null;
        }

        var element = row[index.Value];
        if (element.ValueKind == JsonValueKind.Number)
        {
            if (element.TryGetDecimal(out var dec))
            {
                return dec;
            }

            if (element.TryGetDouble(out var dbl))
            {
                return (decimal)dbl;
            }
        }

        if (element.ValueKind == JsonValueKind.String)
        {
            var str = element.GetString();
            if (string.IsNullOrWhiteSpace(str))
            {
                return null;
            }

            if (decimal.TryParse(str.Replace(',', '.'),
                    NumberStyles.Any,
                    CultureInfo.InvariantCulture,
                    out var dec))
            {
                return dec;
            }
        }

        return null;
    }

    private static DateTime? ReadDate(JsonElement row, int? index)
    {
        if (!index.HasValue || row.ValueKind != JsonValueKind.Array || row.GetArrayLength() <= index.Value)
        {
            return null;
        }

        var element = row[index.Value];
        if (element.ValueKind == JsonValueKind.String)
        {
            var str = element.GetString();
            if (string.IsNullOrWhiteSpace(str) || str == "0000-00-00")
            {
                return null;
            }

            if (DateTime.TryParseExact(str, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var date))
            {
                return date;
            }

            if (DateTime.TryParse(str, CultureInfo.InvariantCulture, DateTimeStyles.None, out date))
            {
                return date;
            }
        }

        return null;
    }

    private static string? NormalizeCode(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        return value.Trim().ToUpperInvariant();
    }

    private sealed record EmitentInfo(int? EmitentId, string? EmitentTitle, string? EmitentInn);

    private sealed record BondDetails(
        DateTime? MaturityDate,
        decimal? FaceValue,
        string? Currency,
        string? Isin,
        string? RegNumber,
        string? PrimaryBoardId);

    private sealed record MoexBondRow(
        string SecId,
        string? Shortname,
        string? Isin,
        string? RegNumber,
        EmitentInfo Emitent,
        string? PrimaryBoardId,
        DateTime? MaturityDate,
        decimal? FaceValue,
        string? Currency)
    {
        public bool HasDetails =>
            MaturityDate.HasValue || FaceValue.HasValue || !string.IsNullOrWhiteSpace(Currency);

        public MoexBondRow WithDetails(BondDetails details)
        {
            return new MoexBondRow(
                SecId,
                Shortname,
                string.IsNullOrWhiteSpace(Isin) ? details.Isin : Isin,
                string.IsNullOrWhiteSpace(RegNumber) ? details.RegNumber : RegNumber,
                Emitent,
                string.IsNullOrWhiteSpace(PrimaryBoardId) ? details.PrimaryBoardId : PrimaryBoardId,
                MaturityDate ?? details.MaturityDate,
                FaceValue ?? details.FaceValue,
                string.IsNullOrWhiteSpace(Currency) ? details.Currency : Currency);
        }
    }

    private sealed record MoexFutureRow(
        string SecId,
        string? Shortname,
        string? AssetCode,
        DateTime? ExpirationDate,
        int? LotSize,
        decimal? MinStep,
        decimal? StepPrice);

    private sealed record MoexOptionRow(
        string SecId,
        string? Shortname,
        string? AssetCode,
        string? OptionType,
        decimal? Strike,
        DateTime? ExpirationDate,
        int? LotSize);

    private sealed record UnderlyingTarget(int DictionaryId, string? AssetCode);
}
}
