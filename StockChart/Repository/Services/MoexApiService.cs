using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using StockChart.Model;
using StockChart.Repository.Interfaces;
using StockChart.Repository.Moex;

namespace StockChart.Repository.Services
{
    public class MoexApiService : IMoexApiService
    {
        private const string DefaultUserAgent = "StockChart/1.0";
        private const string OpenPositionsUserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36";

        private static readonly string[] ShareColumns =
        {
            "SECID",
            "SHORTNAME",
            "ISIN",
            "LOTSIZE",
            "DECIMALS",
            "MINSTEP"
        };

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

        private static readonly string[] BondDetailsColumns =
        {
            "SECID",
            "SHORTNAME",
            "MATDATE",
            "FACEVALUE",
            "CURRENCYID",
            "ISIN",
            "REGNUMBER",
            "PRIMARY_BOARDID"
        };

        private static readonly string[] FuturesColumns =
        {
            "SECID",
            "SHORTNAME",
            "ASSETCODE",
            "EXPIRATIONDATE",
            "LASTTRADEDATE",
            "LASTDELDATE",
            "LASTTRADINGDATE",
            "LOTSIZE",
            "MINSTEP",
            "STEPPRICE"
        };

        private static readonly string[] EmitentColumns =
        {
            "secid",
            "emitent_id",
            "emitent_title",
            "emitent_inn"
        };

        private readonly HttpClient _httpClient;
        private readonly ILogger<MoexApiService> _logger;

        public MoexApiService(HttpClient httpClient, ILogger<MoexApiService> logger)
        {
            _httpClient = httpClient;
            _logger = logger;
        }

        public async Task<IReadOnlyList<OpenPosRow>?> GetOpenPositionsAsync(string contractName, DateTime date, CancellationToken cancellationToken = default)
        {
            var dateIso = date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
            var columns = "title,long_fiz,short_fiz,long_jur,short_jur,total";
            var url =
                $"https://web.moex.com/moex-web-iss-api/api/v1/open-position/F/{Uri.EscapeDataString(contractName)}" +
                $"?lang=ru&iss.meta=off&iss.json=extended" +
                $"&openpositions.columns={Uri.EscapeDataString(columns)}" +
                $"&limit=20&dir=asc" +
                $"&date={Uri.EscapeDataString(dateIso)}" +
                $"&asset={Uri.EscapeDataString(contractName)}";

            using var stream = await GetStreamAsync(url, "application/json,text/plain,*/*", OpenPositionsUserAgent, cancellationToken);
            if (stream == null)
            {
                return null;
            }

            var envelopes = MoexOpenPositionsDeserializer.Deserialize(stream);
            if (envelopes == null)
            {
                return null;
            }

            var rows = new List<OpenPosRow>();
            foreach (var envelope in envelopes)
            {
                if (envelope?.Openpositions == null)
                {
                    continue;
                }

                rows.AddRange(envelope.Openpositions);
            }

            return rows;
        }

        public async Task<IReadOnlyList<MoexDividendRow>?> GetDividendsAsync(string ticker, CancellationToken cancellationToken = default)
        {
            var url = $"https://iss.moex.com/iss/securities/{Uri.EscapeDataString(ticker)}/dividends.json";
            var table = await GetTableAsync(url, "dividends", cancellationToken);
            if (table == null)
            {
                return null;
            }

            var columnIndex = BuildColumnIndex(table.Columns);
            if (!columnIndex.TryGetValue("registryclosedate", out var dateIndex) ||
                !columnIndex.TryGetValue("value", out var valueIndex))
            {
                return null;
            }

            var rows = new List<MoexDividendRow>();
            var seenDates = new HashSet<DateTime>();

            foreach (var row in table.Rows)
            {
                var date = ReadDate(row, dateIndex);
                var value = ReadDecimal(row, valueIndex);

                if (!date.HasValue || !value.HasValue)
                {
                    continue;
                }

                var dateValue = date.Value.Date;
                if (!seenDates.Add(dateValue))
                {
                    continue;
                }

                rows.Add(new MoexDividendRow(dateValue, value.Value));
            }

            return rows;
        }

        public async Task<IReadOnlyList<ShareInfo>> GetSharesAsync(string boardId, int start, int limit, CancellationToken cancellationToken = default)
        {
            var columnsParam = BuildColumns(ShareColumns);
            var url =
                $"https://iss.moex.com/iss/engines/stock/markets/shares/boards/{Uri.EscapeDataString(boardId)}/securities.json" +
                $"?iss.meta=off&iss.only=securities&securities.columns={columnsParam}&start={start}&limit={limit}";

            var table = await GetTableAsync(url, "securities", cancellationToken);
            if (table == null || table.Rows.Count == 0)
            {
                return Array.Empty<ShareInfo>();
            }

            var columnIndex = BuildColumnIndex(table.Columns);
            var secidIndex = GetColumnIndex(columnIndex, "SECID");
            if (!secidIndex.HasValue)
            {
                return Array.Empty<ShareInfo>();
            }

            var result = new List<ShareInfo>(table.Rows.Count);
            var shortnameIndex = GetColumnIndex(columnIndex, "SHORTNAME");
            var isinIndex = GetColumnIndex(columnIndex, "ISIN");
            var lotsizeIndex = GetColumnIndex(columnIndex, "LOTSIZE");
            var decimalsIndex = GetColumnIndex(columnIndex, "DECIMALS");
            var minstepIndex = GetColumnIndex(columnIndex, "MINSTEP");

            foreach (var row in table.Rows)
            {
                var secid = ReadString(row, secidIndex.Value);
                if (string.IsNullOrWhiteSpace(secid))
                {
                    continue;
                }

                result.Add(new ShareInfo(
                    Secid: NormalizeCode(secid) ?? secid,
                    Shortname: ReadString(row, shortnameIndex),
                    Isin: ReadString(row, isinIndex),
                    LotSize: ReadInt(row, lotsizeIndex),
                    Decimals: ReadInt(row, decimalsIndex),
                    MinStep: ReadDecimal(row, minstepIndex)
                ));
            }

            return result;
        }

        public async Task<IReadOnlyList<MoexBondRow>> GetCorporateBondsAsync(int start, int limit, CancellationToken cancellationToken = default)
        {
            var columnsParam = BuildColumns(BondColumns);
            var url =
                $"https://iss.moex.com/iss/securities.json?iss.meta=off&group_by=type&group_by_filter=corporate_bond" +
                $"&limit={limit}&start={start}&securities.columns={columnsParam}";

            var table = await GetTableAsync(url, "securities", cancellationToken);
            if (table == null || table.Rows.Count == 0)
            {
                return Array.Empty<MoexBondRow>();
            }

            var columnIndex = BuildColumnIndex(table.Columns);
            var secidIndex = GetColumnIndex(columnIndex, "secid");
            if (!secidIndex.HasValue)
            {
                return Array.Empty<MoexBondRow>();
            }

            var result = new List<MoexBondRow>(table.Rows.Count);

            foreach (var row in table.Rows)
            {
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
                result.Add(new MoexBondRow(
                    NormalizeCode(secid) ?? secid,
                    shortname,
                    isin,
                    regnumber,
                    emitent,
                    primaryBoard,
                    maturity,
                    faceValue,
                    currency));
            }

            return result;
        }

        public async Task<BondDetails?> GetBondDetailsAsync(string secid, CancellationToken cancellationToken = default)
        {
            var columnsParam = BuildColumns(BondDetailsColumns);
            var url =
                $"https://iss.moex.com/iss/engines/stock/markets/bonds/securities/{Uri.EscapeDataString(secid)}.json" +
                $"?iss.meta=off&securities.columns={columnsParam}";

            var table = await GetTableAsync(url, "securities", cancellationToken);
            if (table == null)
            {
                return null;
            }

            var columnIndex = BuildColumnIndex(table.Columns);
            var secidIndex = GetColumnIndex(columnIndex, "SECID", "secid");
            if (!secidIndex.HasValue)
            {
                return null;
            }

            foreach (var row in table.Rows)
            {
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

        public async Task<IReadOnlyList<MoexBondMarketRow>> GetBondMarketDataAsync(IEnumerable<string> secids, CancellationToken cancellationToken = default)
        {
            if (secids == null)
            {
                return Array.Empty<MoexBondMarketRow>();
            }

            var normalized = secids
                .Select(NormalizeCode)
                .Where(s => !string.IsNullOrWhiteSpace(s))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            if (normalized.Count == 0)
            {
                return Array.Empty<MoexBondMarketRow>();
            }

            var result = new List<MoexBondMarketRow>();
            const int chunkSize = 50;

            for (var offset = 0; offset < normalized.Count; offset += chunkSize)
            {
                var chunk = normalized.Skip(offset).Take(chunkSize).ToList();
                var joined = string.Join(",", chunk);
                var url =
                    "https://iss.moex.com/iss/engines/stock/markets/bonds/securities.json" +
                    $"?iss.meta=off&iss.only=securities,marketdata,marketdata_yields&securities={Uri.EscapeDataString(joined)}";

                using var doc = await GetJsonAsync(url, cancellationToken);
                if (doc == null)
                {
                    continue;
                }

                var secTable = ReadTable(doc.RootElement, "securities");
                var mktTable = ReadTable(doc.RootElement, "marketdata");
                var yldTable = ReadTable(doc.RootElement, "marketdata_yields");

                var secRows = BuildSecidRowMap(secTable, out var secIndex);
                var mktRows = BuildSecidRowMap(mktTable, out var mktIndex);
                var yldRows = BuildSecidRowMap(yldTable, out var yldIndex);

                var prevAdmittedIndex = GetColumnIndex(secIndex, "PREVADMITTEDQUOTE", "prevadmittedquote");
                var prevWapIndex = GetColumnIndex(secIndex, "PREVWAPRICE", "prevwaprice");
                var prevPriceIndex = GetColumnIndex(secIndex, "PREVPRICE", "prevprice");
                var prevLegalIndex = GetColumnIndex(secIndex, "PREVLEGALCLOSEPRICE", "prevlegalcloseprice");
                var yieldAtPrevWapIndex = GetColumnIndex(secIndex, "YIELDATPREVWAPRICE", "yieldatprevwaprice");
                var statusIndex = GetColumnIndex(secIndex, "STATUS", "status");
                var accruedIndex = GetColumnIndex(secIndex, "ACCRUEDINT", "accruedint");
                var nextCouponIndex = GetColumnIndex(secIndex, "NEXTCOUPON", "nextcoupon");
                var couponValueIndex = GetColumnIndex(secIndex, "COUPONVALUE", "couponvalue");
                var offerIndex = GetColumnIndex(secIndex, "OFFERDATE", "offerdate");
                var issueDateIndex = GetColumnIndex(secIndex, "ISSUEDATE", "issuedate");
                var issueSizeIndex = GetColumnIndex(secIndex, "ISSUESIZE", "issuesize");
                var issuePlacedIndex = GetColumnIndex(secIndex, "ISSUESIZEPLACED", "issuesizeplaced");
                var listLevelIndex = GetColumnIndex(secIndex, "LISTLEVEL", "listlevel");
                var qualifiedIndex = GetColumnIndex(secIndex, "ISQUALIFIEDINVESTORS", "isqualifiedinvestors", "qualifiedonly", "isqualified");
                var couponPeriodIndex = GetColumnIndex(secIndex, "COUPONPERIOD", "couponperiod");
                var couponRateIndex = GetColumnIndex(secIndex, "COUPONRATE", "couponrate", "COUPONPERCENT", "couponpercent");
                var couponTypeIndex = GetColumnIndex(secIndex, "COUPONTYPE", "coupontype");
                var secBoardIndex = GetColumnIndex(secIndex, "BOARDID", "boardid");

                var marketPrice2Index = GetColumnIndex(mktIndex, "MARKETPRICE2", "marketprice2");
                var marketPriceIndex = GetColumnIndex(mktIndex, "MARKETPRICE", "marketprice");
                var marketPriceTodayIndex = GetColumnIndex(mktIndex, "MARKETPRICETODAY", "marketpricetoday");
                var marketPrice3Index = GetColumnIndex(mktIndex, "MARKETPRICE3", "marketprice3");
                var admittedIndex = GetColumnIndex(mktIndex, "ADMITTEDQUOTE", "admittedquote");
                var lastIndex = GetColumnIndex(mktIndex, "LAST", "last");
                var wapPriceIndex = GetColumnIndex(mktIndex, "WAPRICE", "waprice");
                var closePriceIndex = GetColumnIndex(mktIndex, "CLOSEPRICE", "closeprice");
                var dayVolumeIndex = GetColumnIndex(mktIndex, "VALUE", "value");
                var volTodayIndex = GetColumnIndex(mktIndex, "VOLTODAY", "voltoday");
                var numTradesIndex = GetColumnIndex(mktIndex, "NUMTRADES", "numtrades");
                var dayChangeIndex = GetColumnIndex(mktIndex, "LASTCHANGEPRCNT", "lastchangeprcnt", "changeprcnt", "pctchange", "percent");
                var tradingStatusIndex = GetColumnIndex(mktIndex, "TRADINGSTATUS", "tradingstatus", "status");
                var mktBoardIndex = GetColumnIndex(mktIndex, "BOARDID", "boardid");
                var yieldMarketIndex = GetColumnIndex(mktIndex, "YIELD", "yield");
                var yieldAtWapIndex = GetColumnIndex(mktIndex, "YIELDATWAPRICE", "yieldatwaprice");

                var yieldIndex = GetColumnIndex(yldIndex, "EFFECTIVEYIELD", "effectiveyield");

                foreach (var secid in chunk)
                {
                    secRows.TryGetValue(secid, out var secRow);
                    mktRows.TryGetValue(secid, out var mktRow);
                    yldRows.TryGetValue(secid, out var yldRow);

                    var pricePct = FirstNonNull(
                        ReadDecimal(mktRow, marketPrice2Index),
                        ReadDecimal(mktRow, marketPriceIndex),
                        ReadDecimal(mktRow, marketPriceTodayIndex),
                        ReadDecimal(mktRow, marketPrice3Index),
                        ReadDecimal(mktRow, wapPriceIndex),
                        ReadDecimal(mktRow, closePriceIndex),
                        ReadDecimal(mktRow, admittedIndex),
                        ReadDecimal(mktRow, lastIndex),
                        ReadDecimal(secRow, prevWapIndex),
                        ReadDecimal(secRow, prevPriceIndex),
                        ReadDecimal(secRow, prevLegalIndex),
                        ReadDecimal(secRow, prevAdmittedIndex));

                    var dayVolume = ReadDecimal(mktRow, dayVolumeIndex);
                    var dayVolumeQty = ReadLong(mktRow, volTodayIndex) ?? ReadLong(mktRow, numTradesIndex);
                    var dayChange = ReadDecimal(mktRow, dayChangeIndex);
                    var yield = FirstNonNull(
                        ReadDecimal(yldRow, yieldIndex),
                        ReadDecimal(mktRow, yieldMarketIndex),
                        ReadDecimal(mktRow, yieldAtWapIndex),
                        ReadDecimal(secRow, yieldAtPrevWapIndex));

                    var boardId = ReadString(mktRow, mktBoardIndex) ?? ReadString(secRow, secBoardIndex);
                    var tradingStatus = ReadString(mktRow, tradingStatusIndex) ?? ReadString(secRow, statusIndex);

                    var row = new MoexBondMarketRow(
                        SecId: secid,
                        BoardId: boardId,
                        PricePct: pricePct,
                        YieldPct: yield,
                        DayChangePct: dayChange,
                        DayVolume: dayVolume,
                        DayVolumeQty: dayVolumeQty,
                        AccruedInterest: ReadDecimal(secRow, accruedIndex),
                        NextCouponDate: ReadDate(secRow, nextCouponIndex),
                        OfferDate: ReadDate(secRow, offerIndex),
                        CouponValue: ReadDecimal(secRow, couponValueIndex),
                        CouponPeriodDays: ReadInt(secRow, couponPeriodIndex),
                        CouponRate: ReadDecimal(secRow, couponRateIndex),
                        CouponType: ReadString(secRow, couponTypeIndex),
                        PlacementDate: ReadDate(secRow, issueDateIndex),
                        IssueSize: ReadLong(secRow, issueSizeIndex),
                        IssueSizePlaced: ReadLong(secRow, issuePlacedIndex),
                        ListingLevel: ReadInt(secRow, listLevelIndex),
                        QualifiedOnly: ReadBool(secRow, qualifiedIndex),
                        TradingStatus: tradingStatus);

                    result.Add(row);
                }
            }

            return result;
        }

        public async Task<IReadOnlyList<MoexBondCouponRow>> GetBondCouponsAsync(string secid, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(secid))
            {
                return Array.Empty<MoexBondCouponRow>();
            }

            var url =
                $"https://iss.moex.com/iss/statistics/engines/stock/markets/bonds/bondization/{Uri.EscapeDataString(secid)}.json" +
                "?iss.meta=off&iss.only=coupons";

            var table = await GetTableAsync(url, "coupons", cancellationToken);
            if (table == null || table.Rows.Count == 0)
            {
                return Array.Empty<MoexBondCouponRow>();
            }

            var columnIndex = BuildColumnIndex(table.Columns);
            var numberIndex = GetColumnIndex(columnIndex, "COUPONNUMBER", "COUPONNUM", "NUMBER", "number", "n");
            var dateIndex = GetColumnIndex(columnIndex, "COUPONDATE", "coupondate", "date");
            var valueIndex = GetColumnIndex(columnIndex, "VALUE", "value", "couponvalue");
            var yieldIndex = GetColumnIndex(columnIndex, "COUPONPRC", "couponprc", "yield", "yieldpct", "yieldpercent", "couponrate");
            var percentParIndex = GetColumnIndex(columnIndex, "VALUEPRC", "valueprc", "percent", "percentofpar", "pctofpar", "couponpercent");
            var percentMarketIndex = GetColumnIndex(columnIndex, "PCTOFMKT", "pctofmkt", "percentofmarket", "pctofmarket");

            var result = new List<MoexBondCouponRow>();
            foreach (var row in table.Rows)
            {
                result.Add(new MoexBondCouponRow(
                    SecId: secid.Trim().ToUpperInvariant(),
                    Number: ReadInt(row, numberIndex),
                    CouponDate: ReadDate(row, dateIndex),
                    CouponValue: ReadDecimal(row, valueIndex),
                    CouponYieldPct: ReadDecimal(row, yieldIndex),
                    PercentOfPar: ReadDecimal(row, percentParIndex),
                    PercentOfMarket: ReadDecimal(row, percentMarketIndex)));
            }

            return result;
        }

        public async Task<Dictionary<string, decimal>> GetBondEffectiveYieldsAsync(IEnumerable<string> secids, CancellationToken cancellationToken = default)
        {
            if (secids == null)
            {
                return new Dictionary<string, decimal>(StringComparer.OrdinalIgnoreCase);
            }

            var normalized = secids
                .Select(NormalizeCode)
                .Where(s => !string.IsNullOrWhiteSpace(s))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            if (normalized.Count == 0)
            {
                return new Dictionary<string, decimal>(StringComparer.OrdinalIgnoreCase);
            }

            var result = new Dictionary<string, decimal>(StringComparer.OrdinalIgnoreCase);
            const int chunkSize = 50;

            for (var offset = 0; offset < normalized.Count; offset += chunkSize)
            {
                var chunk = normalized.Skip(offset).Take(chunkSize).ToList();
                var joined = string.Join(",", chunk);
                var url =
                    "https://iss.moex.com/iss/engines/stock/markets/bonds/securities.json" +
                    $"?iss.meta=off&iss.only=marketdata_yields&securities={Uri.EscapeDataString(joined)}" +
                    "&marketdata_yields.columns=SECID,EFFECTIVEYIELD";

                var table = await GetTableAsync(url, "marketdata_yields", cancellationToken);
                if (table == null || table.Rows.Count == 0)
                {
                    continue;
                }

                var columnIndex = BuildColumnIndex(table.Columns);
                var secidIndex = GetColumnIndex(columnIndex, "SECID", "secid");
                var yieldIndex = GetColumnIndex(columnIndex, "EFFECTIVEYIELD", "effectiveyield");
                if (!secidIndex.HasValue || !yieldIndex.HasValue)
                {
                    continue;
                }

                foreach (var row in table.Rows)
                {
                    var secid = ReadString(row, secidIndex.Value);
                    var effectiveYield = ReadDecimal(row, yieldIndex);
                    if (string.IsNullOrWhiteSpace(secid) || !effectiveYield.HasValue)
                    {
                        continue;
                    }

                    var normalizedSecid = NormalizeCode(secid) ?? secid;
                    result[normalizedSecid] = effectiveYield.Value;
                }
            }

            return result;
        }

        public async Task<IReadOnlyList<MoexFutureRow>> GetFuturesAsync(CancellationToken cancellationToken = default)
        {
            var columnsParam = BuildColumns(FuturesColumns);
            var url =
                "https://iss.moex.com/iss/engines/futures/markets/forts/boards/rfud/securities.json" +
                $"?iss.meta=off&securities.columns={columnsParam}";

            var table = await GetTableAsync(url, "securities", cancellationToken);
            if (table == null || table.Rows.Count == 0)
            {
                return Array.Empty<MoexFutureRow>();
            }

            var columnIndex = BuildColumnIndex(table.Columns);
            var secidIndex = GetColumnIndex(columnIndex, "secid");
            if (!secidIndex.HasValue)
            {
                return Array.Empty<MoexFutureRow>();
            }

            var rows = new List<MoexFutureRow>(table.Rows.Count);

            foreach (var row in table.Rows)
            {
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
                    NormalizeCode(secid) ?? secid,
                    shortname,
                    NormalizeCode(assetCode),
                    expiration,
                    lotSize,
                    minstep,
                    stepPrice));
            }

            return rows;
        }

        public async Task<IReadOnlyList<MoexOptionRow>> GetOptionsAsync(string asset, CancellationToken cancellationToken = default)
        {
            var optionboardColumns = Uri.EscapeDataString("SECID,SHORTNAME,ASSETCODE,OPTIONTYPE,STRIKE,EXPIRATIONDATE,LASTDELDATE,LASTTRADINGDATE,LOTSIZE");
            var url =
                $"https://iss.moex.com/iss/statistics/engines/futures/markets/options/assets/{Uri.EscapeDataString(asset)}/optionboard.json" +
                $"?iss.meta=off&iss.only=call,put,asset,optionboard&optionboard.columns={optionboardColumns}";

            using var doc = await GetJsonAsync(url, cancellationToken);
            if (doc == null)
            {
                return Array.Empty<MoexOptionRow>();
            }

            var assetCode = NormalizeCode(asset) ?? asset;
            DateTime? expiration = null;
            int? lotSize = null;
            decimal? underlyingPrice = null;

            var assetTable = ReadTable(doc.RootElement, "asset");
            if (assetTable != null && assetTable.Rows.Count > 0)
            {
                var assetIndex = BuildColumnIndex(assetTable.Columns);
                var assetRow = assetTable.Rows[0];

                var underlying = ReadString(assetRow, GetColumnIndex(assetIndex, "UNDERLYINGASSET", "ASSETCODE", "ASSET"));
                assetCode = NormalizeCode(underlying) ?? assetCode;
                expiration = ReadDate(assetRow, GetColumnIndex(assetIndex, "LASTDELDATE", "EXPIRATIONDATE", "LASTTRADINGDATE", "LASTTRADEDATE"));
                lotSize = ReadInt(assetRow, GetColumnIndex(assetIndex, "LOTSIZE"));
                underlyingPrice = ReadDecimal(assetRow, GetColumnIndex(assetIndex, "UNDERLYINGSETTLEPRICE", "UNDERLYINGPRICE", "SETTLEPRICE"));
            }

            var optionBoardLookup = BuildOptionBoardLookup(ReadTable(doc.RootElement, "optionboard"));

            var rows = new List<MoexOptionRow>();
            AppendOptionRows(rows, ReadTable(doc.RootElement, "call"), "C", assetCode, expiration, lotSize, underlyingPrice);
            AppendOptionRows(rows, ReadTable(doc.RootElement, "put"), "P", assetCode, expiration, lotSize, underlyingPrice);

            if (optionBoardLookup.Count > 0)
            {
                for (var i = 0; i < rows.Count; i++)
                {
                    var row = rows[i];
                    if (!optionBoardLookup.TryGetValue(row.SecId, out var board))
                    {
                        continue;
                    }

                    rows[i] = row with
                    {
                        Shortname = string.IsNullOrWhiteSpace(row.Shortname) ? board.Shortname : row.Shortname,
                        AssetCode = string.IsNullOrWhiteSpace(row.AssetCode) ? board.AssetCode : row.AssetCode,
                        OptionType = string.IsNullOrWhiteSpace(row.OptionType) ? board.OptionType : row.OptionType,
                        Strike = row.Strike ?? board.Strike,
                        ExpirationDate = row.ExpirationDate ?? board.ExpirationDate,
                        LotSize = row.LotSize ?? board.LotSize
                    };
                }
            }

            return rows;
        }

        public async Task<EmitentInfo?> GetEmitentAsync(string secid, CancellationToken cancellationToken = default)
        {
            var columnsParam = BuildColumns(EmitentColumns);
            var url =
                $"https://iss.moex.com/iss/securities.json?iss.meta=off&q={Uri.EscapeDataString(secid)}&securities.columns={columnsParam}";

            var table = await GetTableAsync(url, "securities", cancellationToken);
            if (table == null)
            {
                return null;
            }

            var columnIndex = BuildColumnIndex(table.Columns);
            var secidIndex = GetColumnIndex(columnIndex, "secid");
            if (!secidIndex.HasValue)
            {
                return null;
            }

            foreach (var row in table.Rows)
            {
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
                request.Headers.UserAgent.ParseAdd(DefaultUserAgent);

                using var response = await _httpClient.SendAsync(request, cancellationToken);
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("MOEX request failed: {Url} ({StatusCode})", url, response.StatusCode);
                    return null;
                }

                await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
                return await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "MOEX request failed: {Url}", url);
                return null;
            }
        }

        private async Task<Stream?> GetStreamAsync(string url, string acceptHeader, string userAgent, CancellationToken cancellationToken)
        {
            try
            {
                using var request = new HttpRequestMessage(HttpMethod.Get, url);
                request.Headers.TryAddWithoutValidation("Accept", acceptHeader);
                request.Headers.UserAgent.ParseAdd(userAgent);

                using var response = await _httpClient.SendAsync(request, cancellationToken);
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("MOEX request failed: {Url} ({StatusCode})", url, response.StatusCode);
                    return null;
                }

                await using var responseStream = await response.Content.ReadAsStreamAsync(cancellationToken);
                var buffer = new MemoryStream();
                await responseStream.CopyToAsync(buffer, cancellationToken);
                buffer.Position = 0;
                return buffer;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "MOEX request failed: {Url}", url);
                return null;
            }
        }

        private async Task<MoexTable?> GetTableAsync(string url, string tableName, CancellationToken cancellationToken)
        {
            using var doc = await GetJsonAsync(url, cancellationToken);
            if (doc == null)
            {
                return null;
            }
            return ReadTable(doc.RootElement, tableName);
        }

        private static MoexTable? ReadTable(JsonElement root, string tableName)
        {
            if (!root.TryGetProperty(tableName, out var table) || table.ValueKind != JsonValueKind.Object)
            {
                return null;
            }

            if (!table.TryGetProperty("columns", out var columnsElement) || columnsElement.ValueKind != JsonValueKind.Array)
            {
                return null;
            }

            if (!table.TryGetProperty("data", out var dataElement) || dataElement.ValueKind != JsonValueKind.Array)
            {
                return null;
            }

            var columns = new List<string>(columnsElement.GetArrayLength());
            foreach (var column in columnsElement.EnumerateArray())
            {
                var name = column.GetString();
                columns.Add(name ?? string.Empty);
            }

            var rows = new List<IReadOnlyList<string?>>(dataElement.GetArrayLength());
            foreach (var rowElement in dataElement.EnumerateArray())
            {
                if (rowElement.ValueKind != JsonValueKind.Array)
                {
                    continue;
                }

                var cells = new string?[rowElement.GetArrayLength()];
                var i = 0;
                foreach (var cell in rowElement.EnumerateArray())
                {
                    cells[i++] = ReadCell(cell);
                }

                rows.Add(cells);
            }

            return new MoexTable(columns, rows);
        }

        private static void AppendOptionRows(
            ICollection<MoexOptionRow> rows,
            MoexTable? table,
            string fallbackOptionType,
            string? fallbackAssetCode,
            DateTime? fallbackExpiration,
            int? fallbackLotSize,
            decimal? fallbackUnderlyingPrice)
        {
            if (table == null || table.Rows.Count == 0)
            {
                return;
            }

            var columnIndex = BuildColumnIndex(table.Columns);
            var secidIndex = GetColumnIndex(columnIndex, "SECID", "secid");
            if (!secidIndex.HasValue)
            {
                return;
            }

            var shortnameIndex = GetColumnIndex(columnIndex, "SHORTNAME", "shortname");
            var assetIndex = GetColumnIndex(columnIndex, "ASSETCODE", "UNDERLYINGASSET", "assetcode");
            var optionTypeIndex = GetColumnIndex(columnIndex, "OPTIONTYPE", "optiontype");
            var strikeIndex = GetColumnIndex(columnIndex, "STRIKE", "strike");
            var boardIdIndex = GetColumnIndex(columnIndex, "BOARDID", "boardid");
            var theorPriceIndex = GetColumnIndex(columnIndex, "THEORPRICE", "theorprice");
            var volatIndex = GetColumnIndex(columnIndex, "VOLAT", "volat");
            var lastIndex = GetColumnIndex(columnIndex, "LAST", "last");
            var bidIndex = GetColumnIndex(columnIndex, "BID", "bid");
            var offerIndex = GetColumnIndex(columnIndex, "OFFER", "offer");
            var volTodayIndex = GetColumnIndex(columnIndex, "VOLTODAY", "voltoday");
            var openPositionIndex = GetColumnIndex(columnIndex, "OPENPOSITION", "openposition");
            var expirationIndex = GetColumnIndex(columnIndex, "EXPIRATIONDATE", "LASTDELDATE", "LASTTRADINGDATE", "LASTTRADEDATE");
            var lotSizeIndex = GetColumnIndex(columnIndex, "LOTSIZE", "lotsize");
            var underlyingPriceIndex = GetColumnIndex(columnIndex, "UNDERLYINGSETTLEPRICE", "UNDERLYINGPRICE", "SETTLEPRICE");

            foreach (var row in table.Rows)
            {
                var secid = ReadString(row, secidIndex.Value);
                if (string.IsNullOrWhiteSpace(secid))
                {
                    continue;
                }

                var shortname = ReadString(row, shortnameIndex);
                var assetCode = NormalizeCode(ReadString(row, assetIndex)) ?? fallbackAssetCode;
                var optionType = ReadString(row, optionTypeIndex);
                if (string.IsNullOrWhiteSpace(optionType))
                {
                    optionType = fallbackOptionType;
                }

                var strike = ReadDecimal(row, strikeIndex);
                var boardId = ReadString(row, boardIdIndex);
                var theorPrice = ReadDecimal(row, theorPriceIndex);
                var volat = ReadDecimal(row, volatIndex);
                var last = ReadDecimal(row, lastIndex);
                var bid = ReadDecimal(row, bidIndex);
                var offer = ReadDecimal(row, offerIndex);
                var volToday = ReadLong(row, volTodayIndex);
                var openPosition = ReadLong(row, openPositionIndex);
                var expiration = ReadDate(row, expirationIndex) ?? fallbackExpiration;
                var lotSize = ReadInt(row, lotSizeIndex) ?? fallbackLotSize;
                var underlyingPrice = ReadDecimal(row, underlyingPriceIndex) ?? fallbackUnderlyingPrice;

                rows.Add(new MoexOptionRow(
                    NormalizeCode(secid) ?? secid,
                    shortname,
                    assetCode,
                    optionType,
                    strike,
                    expiration,
                    lotSize,
                    boardId,
                    theorPrice,
                    volat,
                    last,
                    bid,
                    offer,
                    volToday,
                    openPosition,
                    underlyingPrice));
            }
        }

        private static Dictionary<string, OptionBoardSnapshot> BuildOptionBoardLookup(MoexTable? table)
        {
            var result = new Dictionary<string, OptionBoardSnapshot>(StringComparer.OrdinalIgnoreCase);
            if (table == null || table.Rows.Count == 0)
            {
                return result;
            }

            var columnIndex = BuildColumnIndex(table.Columns);
            var secidIndex = GetColumnIndex(columnIndex, "SECID", "secid");
            if (!secidIndex.HasValue)
            {
                return result;
            }

            var shortnameIndex = GetColumnIndex(columnIndex, "SHORTNAME", "shortname");
            var assetIndex = GetColumnIndex(columnIndex, "ASSETCODE", "UNDERLYINGASSET", "assetcode");
            var optionTypeIndex = GetColumnIndex(columnIndex, "OPTIONTYPE", "optiontype");
            var strikeIndex = GetColumnIndex(columnIndex, "STRIKE", "strike");
            var expirationIndex = GetColumnIndex(columnIndex, "EXPIRATIONDATE", "LASTDELDATE", "LASTTRADINGDATE", "LASTTRADEDATE");
            var lotSizeIndex = GetColumnIndex(columnIndex, "LOTSIZE", "lotsize");

            foreach (var row in table.Rows)
            {
                var secid = ReadString(row, secidIndex.Value);
                if (string.IsNullOrWhiteSpace(secid))
                {
                    continue;
                }

                var normalizedSecid = NormalizeCode(secid) ?? secid;
                result[normalizedSecid] = new OptionBoardSnapshot(
                    Shortname: ReadString(row, shortnameIndex),
                    AssetCode: NormalizeCode(ReadString(row, assetIndex)),
                    OptionType: ReadString(row, optionTypeIndex),
                    Strike: ReadDecimal(row, strikeIndex),
                    ExpirationDate: ReadDate(row, expirationIndex),
                    LotSize: ReadInt(row, lotSizeIndex));
            }

            return result;
        }

        private static string? ReadCell(JsonElement element)
        {
            return element.ValueKind switch
            {
                JsonValueKind.String => element.GetString(),
                JsonValueKind.Number => element.GetRawText(),
                JsonValueKind.True => "true",
                JsonValueKind.False => "false",
                JsonValueKind.Null => null,
                JsonValueKind.Undefined => null,
                _ => element.GetRawText()
            };
        }

        private static Dictionary<string, int> BuildColumnIndex(IReadOnlyList<string> columns)
        {
            var index = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
            for (var i = 0; i < columns.Count; i++)
            {
                var name = columns[i];
                if (!string.IsNullOrWhiteSpace(name))
                {
                    index[name] = i;
                }
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

        private static string? ReadString(IReadOnlyList<string?>? row, int index)
        {
            if (row == null)
            {
                return null;
            }

            if (index < 0 || index >= row.Count)
            {
                return null;
            }

            return row[index];
        }

        private static string? ReadString(IReadOnlyList<string?>? row, int? index)
        {
            if (!index.HasValue)
            {
                return null;
            }

            return ReadString(row, index.Value);
        }

        private static int? ReadInt(IReadOnlyList<string?>? row, int? index)
        {
            var str = ReadString(row, index);
            if (string.IsNullOrWhiteSpace(str))
            {
                return null;
            }

            if (int.TryParse(str, NumberStyles.Integer, CultureInfo.InvariantCulture, out var i))
            {
                return i;
            }

            if (long.TryParse(str, NumberStyles.Integer, CultureInfo.InvariantCulture, out var l))
            {
                if (l >= int.MinValue && l <= int.MaxValue)
                {
                    return (int)l;
                }
            }

            if (decimal.TryParse(str, NumberStyles.Any, CultureInfo.InvariantCulture, out var dec))
            {
                var l2 = (long)dec;
                if (l2 >= int.MinValue && l2 <= int.MaxValue)
                {
                    return (int)l2;
                }
            }

            return null;
        }

        private static long? ReadLong(IReadOnlyList<string?>? row, int? index)
        {
            var str = ReadString(row, index);
            if (string.IsNullOrWhiteSpace(str))
            {
                return null;
            }

            if (long.TryParse(str, NumberStyles.Integer, CultureInfo.InvariantCulture, out var l))
            {
                return l;
            }

            if (decimal.TryParse(str, NumberStyles.Any, CultureInfo.InvariantCulture, out var dec) ||
                decimal.TryParse(str, NumberStyles.Any, CultureInfo.GetCultureInfo("ru-RU"), out dec))
            {
                if (dec <= long.MaxValue && dec >= long.MinValue)
                {
                    return (long)dec;
                }
            }

            return null;
        }

        private static decimal? ReadDecimal(IReadOnlyList<string?>? row, int? index)
        {
            var str = ReadString(row, index);
            if (string.IsNullOrWhiteSpace(str))
            {
                return null;
            }

            if (decimal.TryParse(str, NumberStyles.Any, CultureInfo.InvariantCulture, out var dec))
            {
                return dec;
            }

            if (decimal.TryParse(str, NumberStyles.Any, CultureInfo.GetCultureInfo("ru-RU"), out dec))
            {
                return dec;
            }

            return null;
        }

        private static bool? ReadBool(IReadOnlyList<string?>? row, int? index)
        {
            var str = ReadString(row, index);
            if (string.IsNullOrWhiteSpace(str))
            {
                return null;
            }

            if (bool.TryParse(str, out var b))
            {
                return b;
            }

            if (decimal.TryParse(str, NumberStyles.Any, CultureInfo.InvariantCulture, out var dec) ||
                decimal.TryParse(str, NumberStyles.Any, CultureInfo.GetCultureInfo("ru-RU"), out dec))
            {
                return dec != 0;
            }

            return null;
        }

        private static DateTime? ReadDate(IReadOnlyList<string?>? row, int? index)
        {
            var str = ReadString(row, index);
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

        private static string BuildColumns(IEnumerable<string> columns)
        {
            var joined = string.Join(",", columns);
            return Uri.EscapeDataString(joined);
        }

        private static Dictionary<string, IReadOnlyList<string?>> BuildSecidRowMap(
            MoexTable? table,
            out Dictionary<string, int> columnIndex)
        {
            columnIndex = table == null ? new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase) : BuildColumnIndex(table.Columns);

            var result = new Dictionary<string, IReadOnlyList<string?>>(StringComparer.OrdinalIgnoreCase);
            if (table == null || table.Rows.Count == 0)
            {
                return result;
            }

            var secidIndex = GetColumnIndex(columnIndex, "SECID", "secid");
            if (!secidIndex.HasValue)
            {
                return result;
            }

            foreach (var row in table.Rows)
            {
                var secid = ReadString(row, secidIndex.Value);
                if (string.IsNullOrWhiteSpace(secid))
                {
                    continue;
                }

                var normalized = NormalizeCode(secid) ?? secid;
                result[normalized] = row;
            }

            return result;
        }

        private static decimal? FirstNonNull(params decimal?[] values)
        {
            foreach (var value in values)
            {
                if (value.HasValue)
                {
                    return value;
                }
            }

            return null;
        }

        private sealed class MoexTable
        {
            public MoexTable(IReadOnlyList<string> columns, IReadOnlyList<IReadOnlyList<string?>> rows)
            {
                Columns = columns;
                Rows = rows;
            }

            public IReadOnlyList<string> Columns { get; }
            public IReadOnlyList<IReadOnlyList<string?>> Rows { get; }
        }

        private sealed record OptionBoardSnapshot(
            string? Shortname,
            string? AssetCode,
            string? OptionType,
            decimal? Strike,
            DateTime? ExpirationDate,
            int? LotSize);
    }
}
