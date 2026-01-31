using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
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
            var url =
                $"https://iss.moex.com/iss/statistics/engines/futures/markets/options/assets/{Uri.EscapeDataString(asset)}/optionboard.json?iss.meta=off&iss.only=call,put,asset";

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

            var rows = new List<MoexOptionRow>();
            AppendOptionRows(rows, ReadTable(doc.RootElement, "call"), "C", assetCode, expiration, lotSize, underlyingPrice);
            AppendOptionRows(rows, ReadTable(doc.RootElement, "put"), "P", assetCode, expiration, lotSize, underlyingPrice);

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

        private static string? ReadString(IReadOnlyList<string?> row, int index)
        {
            if (index < 0 || index >= row.Count)
            {
                return null;
            }

            return row[index];
        }

        private static string? ReadString(IReadOnlyList<string?> row, int? index)
        {
            if (!index.HasValue)
            {
                return null;
            }

            return ReadString(row, index.Value);
        }

        private static int? ReadInt(IReadOnlyList<string?> row, int? index)
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

        private static long? ReadLong(IReadOnlyList<string?> row, int? index)
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

        private static decimal? ReadDecimal(IReadOnlyList<string?> row, int? index)
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

        private static DateTime? ReadDate(IReadOnlyList<string?> row, int? index)
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
    }
}
