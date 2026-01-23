using System.Globalization;
using System.IO;
using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using StockChart.Model;
using StockChart.Repository.Interfaces;
using DictionaryEntity = StockChart.Model.Dictionary;

namespace StockChart.Repository.Services
{
    public class DividendsMoexService : IDividendsMoexService
    {
        private static readonly TimeSpan UpdateInterval = TimeSpan.FromHours(24);
        private readonly ApplicationDbContext _dbContext;
        private readonly HttpClient _httpClient;
        private readonly ILogger<DividendsMoexService> _logger;
        private readonly IShareholdersRecommendationsService _shareholdersRecommendationsService;
        private readonly IFinancialStatementsService _financialStatementsService;

        public DividendsMoexService(
            ApplicationDbContext dbContext,
            HttpClient httpClient,
            ILogger<DividendsMoexService> logger,
            IShareholdersRecommendationsService shareholdersRecommendationsService,
            IFinancialStatementsService financialStatementsService)
        {
            _dbContext = dbContext;
            _httpClient = httpClient;
            _logger = logger;
            _shareholdersRecommendationsService = shareholdersRecommendationsService;
            _financialStatementsService = financialStatementsService;
        }

        public async Task<DividendsResponse> GetDividendsAsync(string ticker, CancellationToken cancellationToken = default)
        {
            var normalizedTicker = (ticker ?? string.Empty).Trim().ToUpperInvariant();
            if (string.IsNullOrWhiteSpace(normalizedTicker))
            {
                return new DividendsResponse
                {
                    Title = "Дивиденды",
                    Description = "нет информации"
                };
            }

            var dictionary = await _dbContext.Dictionaries
                .AsNoTracking()
                .FirstOrDefaultAsync(d => d.Securityid.ToUpper() == normalizedTicker, cancellationToken);

            if (dictionary == null)
            {
                return new DividendsResponse
                {
                    Ticker = normalizedTicker,
                    Title = $"Дивиденды {normalizedTicker}",
                    Description = "нет информации"
                };
            }

            var dividends = await _dbContext.DividendsMoex
                .AsNoTracking()
                .Where(d => d.DictionaryId == dictionary.Id)
                .OrderByDescending(d => d.Datetime)
                .Select(d => new DividendDto
                {
                    BuyBefore = d.Datetime.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                    RecordDate = d.Datetime.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                    Dividend = d.Value,
                    Yield = string.Empty
                })
                .ToListAsync(cancellationToken);

            return new DividendsResponse
            {
                Ticker = dictionary.Securityid,
                Title = $"Дивиденды {dictionary.Shortname ?? dictionary.Securityid}",
                Description = string.IsNullOrWhiteSpace(dictionary.Fullname)
                    ? dictionary.Shortname ?? dictionary.Securityid
                    : dictionary.Fullname,
                Dividends = dividends
            };
        }

        public async Task<int> UpdateDueDividendsAsync(CancellationToken cancellationToken = default)
        {
            var now = DateTime.Now;

            /*
            try
            {
                await _shareholdersRecommendationsService.ImportFromFolderAsync("c:/zip/", cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка при импорте структуры акционеров и рекомендаций");
            }*/

            /*
            try
            {
                await _financialStatementsService.ImportFromFolderAsync("c:/zip/", cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка при импорте отчетности РСБУ/МСФО");
            }*/

            /*
            try
            {
                var seedPath = Path.Combine(Directory.GetCurrentDirectory(),
                    "C:\\sc\\schart\\Angular\\mat\\src\\assets\\dividends.json");
                await ImportDividendsFromJsonAsync(seedPath, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка при импорте дивидендов из файла");
            }
            */
            var lastUpdate = await _dbContext.DividendsMoexUpdateLogs
                .AsNoTracking()
                .OrderByDescending(l => l.UpdatedAt)
                .Select(l => (DateTime?)l.UpdatedAt)
                .FirstOrDefaultAsync(cancellationToken);

            if (lastUpdate.HasValue && now - lastUpdate.Value < UpdateInterval)
            {
                return 0;
            }

            var recentDates = await _dbContext.DayCandles
                .AsNoTracking()
                .Join(_dbContext.Dictionaries.AsNoTracking(),
                    candle => candle.Id,
                    dict => dict.Id,
                    (candle, dict) => new { candle.Period, dict.Market, dict.Securityid })
                .Where(x => x.Market == 0 && !x.Securityid.Contains("-RX"))
                .Select(x => x.Period)
                .Distinct()
                .OrderByDescending(x => x)
                .Take(2)
                .ToListAsync(cancellationToken);

            if (recentDates.Count == 0)
            {
                return 0;
            }

            var dictionaryIds = await _dbContext.DayCandles
                .AsNoTracking()
                .Join(_dbContext.Dictionaries.AsNoTracking(),
                    candle => candle.Id,
                    dict => dict.Id,
                    (candle, dict) => new { candle.Id, candle.Period, dict.Market, dict.Securityid })
                .Where(x => x.Market == 0 && !x.Securityid.Contains("-RX") && recentDates.Contains(x.Period))
                .Select(x => x.Id)
                .Distinct()
                .ToListAsync(cancellationToken);

            if (dictionaryIds.Count == 0)
            {
                return 0;
            }

            var dictionaries = await _dbContext.Dictionaries
                .AsNoTracking()
                .Where(d => dictionaryIds.Contains(d.Id))
                .ToDictionaryAsync(d => d.Id, cancellationToken);

            var updatedCount = 0;
            var succTickers = new List<string>();
            var failedTickers = new List<string>();

            foreach (var dictionaryId in dictionaryIds)
            {
                if (!dictionaries.TryGetValue(dictionaryId, out var dictionary))
                {
                    continue;
                }

                try
                {
                    var updateResult = await UpdateDividendsForDictionaryAsync(dictionary, cancellationToken);
                    if (!updateResult.Success)
                    {
                        failedTickers.Add(dictionary.Securityid ?? dictionary.Id.ToString(CultureInfo.InvariantCulture));
                        _logger.LogWarning("Не удалось скачать дивиденды для {Ticker}, пропуск", dictionary.Securityid);
                        continue;
                    }

                    if (updateResult.Added > 0)
                    {
                        updatedCount += updateResult.Added;
                    }

                    if (_dbContext.ChangeTracker.HasChanges())
                    {
                        await _dbContext.SaveChangesAsync(cancellationToken);
                    }

                    succTickers.Add(dictionary.Securityid ?? dictionary.Id.ToString(CultureInfo.InvariantCulture));
                }
                catch (Exception ex)
                {
                    failedTickers.Add(dictionary.Securityid ?? dictionary.Id.ToString(CultureInfo.InvariantCulture));
                    _dbContext.ChangeTracker.Clear();
                    _logger.LogError(ex, "Ошибка при обновлении дивидендов {Ticker}", dictionary.Securityid);
                }
            }

            if (succTickers.Count > 0 || failedTickers.Count > 0)
            {
                _dbContext.DividendsMoexUpdateLogs.Add(new DividendsMoexUpdateLog
                {
                    UpdatedAt = now,
                    Succ = succTickers.Count == 0 ? null : string.Join(",", succTickers),
                    Failed = failedTickers.Count == 0 ? null : string.Join(",", failedTickers)
                });

                if (_dbContext.ChangeTracker.HasChanges())
                {
                    await _dbContext.SaveChangesAsync(cancellationToken);
                }
            }

            return updatedCount;
        }

        private async Task<DividendUpdateResult> UpdateDividendsForDictionaryAsync(DictionaryEntity dictionary, CancellationToken cancellationToken)
        {
            var moexRows = await DownloadMoexDividendsAsync(dictionary.Securityid, cancellationToken);
            if (moexRows == null)
            {
                return DividendUpdateResult.Failed;
            }

            if (moexRows.Count == 0)
            {
                return DividendUpdateResult.Empty;
            }

            var existingDates = await _dbContext.DividendsMoex
                .AsNoTracking()
                .Where(d => d.DictionaryId == dictionary.Id)
                .Select(d => d.Datetime)
                .ToListAsync(cancellationToken);

            var existingDateSet = new HashSet<DateTime>(existingDates.Select(d => d.Date));
            var toAdd = new List<DividendsMoex>();

            foreach (var row in moexRows)
            {
                if (existingDateSet.Contains(row.Date))
                {
                    continue;
                }

                toAdd.Add(new DividendsMoex
                {
                    DictionaryId = dictionary.Id,
                    Datetime = row.Date,
                    Value = row.Value
                });
            }

            if (toAdd.Count > 0)
            {
                _dbContext.DividendsMoex.AddRange(toAdd);
            }

            return new DividendUpdateResult(true, toAdd.Count);
        }

        private async Task<List<MoexDividendRow>?> DownloadMoexDividendsAsync(string ticker, CancellationToken cancellationToken)
        {
            try
            {
                var url = $"https://iss.moex.com/iss/securities/{Uri.EscapeDataString(ticker)}/dividends.json";

                using var request = new HttpRequestMessage(HttpMethod.Get, url);
                request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
                request.Headers.UserAgent.ParseAdd("StockChart/1.0");

                using var response = await _httpClient.SendAsync(request, cancellationToken);
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("MOEX dividends request failed for {Ticker} with status {StatusCode}", ticker, response.StatusCode);
                    return null;
                }

                var content = await response.Content.ReadAsStringAsync(cancellationToken);

                using var doc = JsonDocument.Parse(content);
                if (!doc.RootElement.TryGetProperty("dividends", out var dividendsElement))
                {
                    return null;
                }

                if (!dividendsElement.TryGetProperty("columns", out var columnsElement) ||
                    columnsElement.ValueKind != JsonValueKind.Array)
                {
                    return null;
                }

                if (!dividendsElement.TryGetProperty("data", out var dataElement) ||
                    dataElement.ValueKind != JsonValueKind.Array)
                {
                    return null;
                }

                var columnIndex = new System.Collections.Generic.Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
                var index = 0;
                foreach (var column in columnsElement.EnumerateArray())
                {
                    var name = column.GetString();
                    if (!string.IsNullOrWhiteSpace(name))
                    {
                        columnIndex[name] = index;
                    }
                    index++;
                }

                if (!columnIndex.TryGetValue("registryclosedate", out var dateIndex) ||
                    !columnIndex.TryGetValue("value", out var valueIndex))
                {
                    return null;
                }

                var rows = new List<MoexDividendRow>();
                var seenDates = new HashSet<DateTime>();

                foreach (var row in dataElement.EnumerateArray())
                {
                    if (row.ValueKind != JsonValueKind.Array)
                    {
                        continue;
                    }

                    var date = ParseMoexDate(row, dateIndex);
                    var value = ParseMoexDecimal(row, valueIndex);

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
            catch (JsonException ex)
            {
                _logger.LogError(ex, "Ошибка парсинга JSON дивидендов MOEX для {Ticker}", ticker);
                return null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка при скачивании дивидендов MOEX для {Ticker}", ticker);
                return null;
            }
        }

        private static DateTime? ParseMoexDate(JsonElement row, int index)
        {
            if (row.GetArrayLength() <= index)
            {
                return null;
            }

            var element = row[index];
            if (element.ValueKind == JsonValueKind.String)
            {
                var str = element.GetString();
                if (string.IsNullOrWhiteSpace(str))
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

        private static decimal? ParseMoexDecimal(JsonElement row, int index)
        {
            if (row.GetArrayLength() <= index)
            {
                return null;
            }

            var element = row[index];
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

        private async Task<int> ImportDividendsFromJsonAsync(string filePath, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(filePath))
            {
                return 0;
            }

            if (!File.Exists(filePath))
            {
                _logger.LogWarning("Файл дивидендов не найден: {Path}", filePath);
                return 0;
            }

            string json;
            try
            {
                json = await File.ReadAllTextAsync(filePath, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка чтения файла дивидендов {Path}", filePath);
                return 0;
            }

            List<SampleDividendsEntry>? entries;
            try
            {
                entries = JsonSerializer.Deserialize<List<SampleDividendsEntry>>(json,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            }
            catch (JsonException ex)
            {
                _logger.LogError(ex, "Ошибка парсинга файла дивидендов {Path}", filePath);
                return 0;
            }

            if (entries == null || entries.Count == 0)
            {
                return 0;
            }

            var tickers = entries
                .Select(e => e.Ticker?.Trim().ToUpperInvariant())
                .Where(t => !string.IsNullOrWhiteSpace(t))
                .Distinct()
                .ToList();

            if (tickers.Count == 0)
            {
                return 0;
            }

            var dictionaries = await _dbContext.Dictionaries
                .AsNoTracking()
                .Where(d => tickers.Contains(d.Securityid))
                .ToDictionaryAsync(d => d.Securityid.ToUpper(), cancellationToken);

            if (dictionaries.Count == 0)
            {
                return 0;
            }

            var dictionaryIds = dictionaries.Values.Select(d => d.Id).Distinct().ToList();
            var existing = await _dbContext.DividendsMoex
                .AsNoTracking()
                .Where(d => dictionaryIds.Contains(d.DictionaryId))
                .Select(d => new { d.DictionaryId, d.Datetime })
                .ToListAsync(cancellationToken);

            var existingSet = new HashSet<(int DictionaryId, DateTime Date)>(
                existing.Select(e => (e.DictionaryId, e.Datetime.Date)));

            var toAdd = new List<DividendsMoex>();

            foreach (var entry in entries)
            {
                var ticker = entry.Ticker?.Trim().ToUpperInvariant();
                if (string.IsNullOrWhiteSpace(ticker))
                {
                    continue;
                }

                if (!dictionaries.TryGetValue(ticker, out var dictionary))
                {
                    continue;
                }

                if (entry.Dividends == null || entry.Dividends.Count == 0)
                {
                    continue;
                }

                foreach (var dividend in entry.Dividends)
                {
                    if (!TryParseRecordDate(dividend.RecordDate, out var recordDate))
                    {
                        continue;
                    }

                    var value = ParseSampleDividendValue(dividend.Dividend);
                    if (!value.HasValue)
                    {
                        continue;
                    }

                    var date = recordDate.Date;
                    var key = (dictionary.Id, date);
                    if (!existingSet.Add(key))
                    {
                        continue;
                    }

                    toAdd.Add(new DividendsMoex
                    {
                        DictionaryId = dictionary.Id,
                        Datetime = date,
                        Value = value.Value
                    });
                }
            }

            if (toAdd.Count == 0)
            {
                return 0;
            }

            _dbContext.DividendsMoex.AddRange(toAdd);
            await _dbContext.SaveChangesAsync(cancellationToken);

            return toAdd.Count;
        }

        private static bool TryParseRecordDate(string? recordDate, out DateTime date)
        {
            if (string.IsNullOrWhiteSpace(recordDate))
            {
                date = default;
                return false;
            }

            if (DateTime.TryParseExact(recordDate,
                    "yyyy-MM-dd",
                    CultureInfo.InvariantCulture,
                    DateTimeStyles.None,
                    out date))
            {
                return true;
            }

            return DateTime.TryParse(recordDate, CultureInfo.InvariantCulture, DateTimeStyles.None, out date);
        }

        private static decimal? ParseSampleDividendValue(JsonElement element)
        {
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

        private sealed record MoexDividendRow(DateTime Date, decimal Value);

        private readonly record struct DividendUpdateResult(bool Success, int Added)
        {
            public static DividendUpdateResult Failed => new(false, 0);
            public static DividendUpdateResult Empty => new(true, 0);
        }

        private sealed record SampleDividendsEntry
        {
            public string? Ticker { get; init; }
            public List<SampleDividendItem>? Dividends { get; init; }
        }

        private sealed record SampleDividendItem
        {
            public string? RecordDate { get; init; }
            public JsonElement Dividend { get; init; }
        }
    }
}
