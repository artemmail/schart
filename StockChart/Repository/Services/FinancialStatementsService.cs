using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Net;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.VisualBasic.FileIO;
using StockChart.Model;
using StockChart.Repository.Interfaces;
using DictionaryEntity = StockChart.Model.Dictionary;

namespace StockChart.Repository.Services
{
    public class FinancialStatementsService : IFinancialStatementsService
    {
        private static readonly TimeSpan ImportInterval = TimeSpan.FromHours(24);
        private static readonly string[] Standards = { "RSBU", "MSFO" };
        private static readonly string[] Periods = { "y", "q" };
        private const string ReportLinksFolderName = "report_links";
        private const string ReportUrlField = "report_url";
        private const string PresentationUrlField = "presentation_url";
        private const string QuarterlyMsfoFolderName = "Квартальные отчеты МСФО";
        private const string QuarterlyRsbuFolderName = "Квартальные отчеты РСБУ";
        private const string AnnualMsfoFolderName = "Годовые отчеты МСФО";
        private const string AnnualRsbuFolderName = "Годовые отчеты РСБУ";
        private const string AnnualPresentationsFolderName = "Годовые презентации";
        private static readonly JsonSerializerOptions JsonOptions = new()
        {
            PropertyNameCaseInsensitive = true
        };

        private readonly ApplicationDbContext _dbContext;
        private readonly ILogger<FinancialStatementsService> _logger;

        public FinancialStatementsService(
            ApplicationDbContext dbContext,
            ILogger<FinancialStatementsService> logger)
        {
            _dbContext = dbContext;
            _logger = logger;
        }

        public async Task<IReadOnlyList<FinancialStatementEntryDto>> GetStatementsAsync(
            string ticker,
            string standard,
            string period,
            string mode,
            CancellationToken cancellationToken = default)
        {
            var normalizedTicker = NormalizeTicker(ticker);
            if (string.IsNullOrWhiteSpace(normalizedTicker))
            {
                return Array.Empty<FinancialStatementEntryDto>();
            }

            var normalizedStandard = NormalizeStandard(standard);
            var normalizedPeriod = NormalizePeriod(period);
            var normalizedMode = NormalizeMode(mode);

            var (primaryDictionary, alternateDictionary) = await FindDictionariesAsync(normalizedTicker, cancellationToken);
            if (primaryDictionary == null && alternateDictionary == null)
            {
                return Array.Empty<FinancialStatementEntryDto>();
            }

            var useNumeric = string.Equals(normalizedMode, "ext", StringComparison.OrdinalIgnoreCase);

            List<FinancialStatementEntryDto> entries = new();
            if (primaryDictionary != null)
            {
                entries = await LoadEntriesAsync(primaryDictionary.Id, normalizedStandard, normalizedPeriod, useNumeric, cancellationToken);
            }

            if (entries.Count == 0 && alternateDictionary != null && alternateDictionary.Id != primaryDictionary?.Id)
            {
                entries = await LoadEntriesAsync(alternateDictionary.Id, normalizedStandard, normalizedPeriod, useNumeric, cancellationToken);
            }

            return entries;
        }

        public async Task<int> ImportFromFolderAsync(string folderPath, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(folderPath))
            {
                return 0;
            }

            var resolvedPath = ResolveFolderPath(folderPath);
            if (!Directory.Exists(resolvedPath))
            {
                _logger.LogWarning("Папка импорта отчетности не найдена: {Path}", resolvedPath);
                return 0;
            }

            var lastImport = await GetLastImportDateAsync(cancellationToken);
            var now = DateTime.Now;
            if (lastImport.HasValue && now - lastImport.Value < ImportInterval)
            {
                return 0;
            }

            var tickerDirs = Directory.GetDirectories(resolvedPath);
            if (tickerDirs.Length == 0)
            {
                return 0;
            }

            var tickers = tickerDirs
                .Select(d => new DirectoryInfo(d).Name.Trim().ToUpperInvariant())
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
                .ToDictionaryAsync(d => d.Securityid.ToUpperInvariant(), cancellationToken);

            if (dictionaries.Count == 0)
            {
                return 0;
            }

            var importedAt = now;
            var entriesToAdd = new List<FinancialStatementEntry>();
            var added = 0;

            HashSet<string>? existingDictionaryCodes = null;
            var dictionaryAdditions = new List<FinancialStatementDictionary>();

            foreach (var dir in tickerDirs)
            {
                var ticker = new DirectoryInfo(dir).Name.Trim().ToUpperInvariant();
                if (string.IsNullOrWhiteSpace(ticker))
                {
                    continue;
                }

                dictionaries.TryGetValue(ticker, out var dictionary);
                if (dictionary == null)
                {
                    _logger.LogWarning("Тикер {Ticker} не найден в Dictionary, импорт отчетности пропущен", ticker);
                }

                foreach (var standard in Standards)
                {
                    foreach (var period in Periods)
                    {
                        var periodFolder = Path.Combine(dir, standard, period);
                        if (!Directory.Exists(periodFolder))
                        {
                            continue;
                        }

                        var dicPath = Path.Combine(periodFolder, "dic.json");
                        DictionaryValueLookup? dictionaryLookup = null;
                        if (File.Exists(dicPath))
                        {
                            var dictionaryData = await LoadDictionaryAsync(dicPath, cancellationToken);
                            if (dictionaryData.Count > 0)
                            {
                                existingDictionaryCodes ??= await LoadExistingDictionaryCodesAsync(cancellationToken);
                                MergeDictionary(dictionaryData, existingDictionaryCodes, dictionaryAdditions);
                                dictionaryLookup = BuildDictionaryLookup(dictionaryData);
                            }
                        }

                        if (dictionary == null)
                        {
                            continue;
                        }

                        var dataPath = Path.Combine(periodFolder, "data.csv");
                        if (!File.Exists(dataPath))
                        {
                            continue;
                        }

                        var items = await LoadStatementItemsFromCsvAsync(dataPath, dictionaryLookup, cancellationToken);
                        if (items.Count == 0)
                        {
                            continue;
                        }

                        var csvYears = new HashSet<string>(items.Select(i => i.Year), StringComparer.OrdinalIgnoreCase);
                        var csvKeys = new HashSet<string>(
                            items.Select(i => BuildEntryKey(i.Name, i.Year)),
                            StringComparer.OrdinalIgnoreCase);

                        if (csvYears.Count > 0)
                        {
                            var reportLinksRoot = Path.Combine(dir, ReportLinksFolderName);
                            var supplementalItems = await LoadSupplementalItemsFromReportLinksAsync(
                                reportLinksRoot,
                                standard,
                                period,
                                csvYears,
                                csvKeys,
                                items.Count,
                                cancellationToken);
                            if (supplementalItems.Count > 0)
                            {
                                items.AddRange(supplementalItems);
                            }
                        }

                        var existingKeys = await LoadExistingEntryKeysAsync(dictionary.Id, standard, period, cancellationToken);
                        var ltrEntries = await LoadExistingLtrEntriesAsync(dictionary.Id, standard, period, cancellationToken);
                        var processedKeys = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                        foreach (var item in items)
                        {
                            var key = BuildEntryKey(item.Name, item.Year);
                            if (!processedKeys.Add(key))
                            {
                                continue;
                            }

                            if (IsLtrYear(item.Year) && ltrEntries.TryGetValue(key, out var existingEntry))
                            {
                                existingEntry.ValueRaw = item.ValueRaw;
                                existingEntry.ValueNum = item.ValueNum;
                                existingEntry.SortOrder = item.SortOrder;
                                existingEntry.ImportedAt = importedAt;
                                continue;
                            }

                            if (!existingKeys.Add(key))
                            {
                                continue;
                            }

                            entriesToAdd.Add(new FinancialStatementEntry
                            {
                                DictionaryId = dictionary.Id,
                                Standard = standard,
                                Period = period,
                                Name = item.Name,
                                Year = item.Year,
                                ValueRaw = item.ValueRaw,
                                ValueNum = item.ValueNum,
                                SortOrder = item.SortOrder,
                                ImportedAt = importedAt
                            });
                            added++;
                        }
                    }
                }
            }

            if (dictionaryAdditions.Count > 0)
            {
                _dbContext.FinancialStatementDictionaries.AddRange(dictionaryAdditions);
            }

            if (entriesToAdd.Count > 0)
            {
                _dbContext.FinancialStatementEntries.AddRange(entriesToAdd);
            }

            try
            {
                if (_dbContext.ChangeTracker.HasChanges())
                {
                    await _dbContext.SaveChangesAsync(cancellationToken);
                }
            }
            catch(Exception we)
            {

            }

            return added;
        }

        private async Task<DateTime?> GetLastImportDateAsync(CancellationToken cancellationToken)
        {
            return await _dbContext.FinancialStatementEntries
                .AsNoTracking()
                .OrderByDescending(e => e.ImportedAt)
                .Select(e => (DateTime?)e.ImportedAt)
                .FirstOrDefaultAsync(cancellationToken);
        }

        private async Task<List<FinancialStatementEntryDto>> LoadEntriesAsync(
            int dictionaryId,
            string standard,
            string period,
            bool useNumeric,
            CancellationToken cancellationToken)
        {
            var query = _dbContext.FinancialStatementEntries
                .AsNoTracking()
                .Where(e => e.DictionaryId == dictionaryId && e.Standard == standard && e.Period == period);

            if (useNumeric)
            {
                query = query.Where(e => e.ValueNum != null);
            }

            var rows = await query
                .OrderBy(e => e.SortOrder)
                .ThenBy(e => e.Id)
                .ToListAsync(cancellationToken);

            var filteredRows = rows
                .Where(e => !IsSmartlabPresenceRow(e.Name))
                .ToList();

            var recentYears = SelectRecentYears(filteredRows.Select(e => e.Year), 8);

            return filteredRows
                .Select(e => new
                {
                    Entry = e,
                    NormalizedYear = NormalizeYear(e.Year) ?? e.Year
                })
                .Where(e =>
                {
                    if (IsLtrYear(e.NormalizedYear))
                    {
                        return true;
                    }

                    return recentYears.Contains(e.NormalizedYear);
                })
                .OrderBy(e => GetPriorityRank(e.Entry.Name))
                .ThenBy(e => e.Entry.SortOrder)
                .ThenBy(e => e.Entry.Id)
                .Select(e => new FinancialStatementEntryDto
                {
                    Name = e.Entry.Name,
                    Year = e.NormalizedYear,
                    Value = useNumeric
                        ? (e.Entry.ValueNum.HasValue ? e.Entry.ValueNum.Value.ToString(CultureInfo.InvariantCulture) : null)
                        : e.Entry.ValueRaw
                })
                .ToList();
        }

        private async Task<HashSet<string>> LoadExistingEntryKeysAsync(
            int dictionaryId,
            string standard,
            string period,
            CancellationToken cancellationToken)
        {
            var keys = await _dbContext.FinancialStatementEntries
                .AsNoTracking()
                .Where(e => e.DictionaryId == dictionaryId && e.Standard == standard && e.Period == period)
                .Select(e => new { e.Name, e.Year })
                .ToListAsync(cancellationToken);

            var result = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (var key in keys)
            {
                var normalizedYear = NormalizeYear(key.Year) ?? key.Year;
                result.Add(BuildEntryKey(key.Name, normalizedYear));
            }

            return result;
        }

        private static string BuildEntryKey(string name, string year)
        {
            return $"{name}||{year}";
        }

        private async Task<Dictionary<string, FinancialStatementEntry>> LoadExistingLtrEntriesAsync(
            int dictionaryId,
            string standard,
            string period,
            CancellationToken cancellationToken)
        {
            var entries = await _dbContext.FinancialStatementEntries
                .Where(e => e.DictionaryId == dictionaryId
                    && e.Standard == standard
                    && e.Period == period
                    && (e.Year == "LTR" || e.Year == "LTM"))
                .ToListAsync(cancellationToken);

            var result = new Dictionary<string, FinancialStatementEntry>(StringComparer.OrdinalIgnoreCase);
            foreach (var entry in entries)
            {
                var normalizedYear = NormalizeYear(entry.Year) ?? entry.Year;
                if (!IsLtrYear(normalizedYear))
                {
                    continue;
                }

                var key = BuildEntryKey(entry.Name, normalizedYear);
                result[key] = entry;
            }

            return result;
        }

        private async Task<HashSet<string>> LoadExistingDictionaryCodesAsync(CancellationToken cancellationToken)
        {
            var codes = await _dbContext.FinancialStatementDictionaries
                .AsNoTracking()
                .Select(d => d.Code)
                .ToListAsync(cancellationToken);

            return new HashSet<string>(codes, StringComparer.OrdinalIgnoreCase);
        }

        private async Task<Dictionary<string, string>> LoadDictionaryAsync(
            string path,
            CancellationToken cancellationToken)
        {
            try
            {
                var json = await File.ReadAllTextAsync(path, cancellationToken);
                return JsonSerializer.Deserialize<Dictionary<string, string>>(json, JsonOptions)
                    ?? new Dictionary<string, string>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка чтения dic.json: {Path}", path);
                return new Dictionary<string, string>();
            }
        }

        private void MergeDictionary(
            Dictionary<string, string> data,
            HashSet<string> existingCodes,
            List<FinancialStatementDictionary> additions)
        {
            foreach (var item in data)
            {
                var code = (item.Key ?? string.Empty).Trim();
                if (string.IsNullOrWhiteSpace(code))
                {
                    continue;
                }

                if (existingCodes.Contains(code))
                {
                    continue;
                }

                var value = NormalizeLabel(item.Value);
                if (string.IsNullOrWhiteSpace(value))
                {
                    continue;
                }
                additions.Add(new FinancialStatementDictionary
                {
                    Code = code,
                    Value = value
                });
                existingCodes.Add(code);
            }
        }

        private async Task<List<StatementImportItem>> LoadStatementItemsFromCsvAsync(
            string path,
            DictionaryValueLookup? dictionaryLookup,
            CancellationToken cancellationToken)
        {
            try
            {
                var result = new List<StatementImportItem>();
                using var stream = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.ReadWrite);
                using var parser = new TextFieldParser(stream, Encoding.UTF8);
                parser.TextFieldType = FieldType.Delimited;
                parser.SetDelimiters(";");
                parser.HasFieldsEnclosedInQuotes = true;

                if (parser.EndOfData)
                {
                    return result;
                }

                var header = parser.ReadFields();
                if (header == null || header.Length <= 1)
                {
                    return result;
                }

                var normalizedYears = new string?[header.Length];
                normalizedYears[0] = null;
                for (var i = 1; i < header.Length; i++)
                {
                    normalizedYears[i] = NormalizeYear(header[i]);
                }

                var order = 0;
                while (!parser.EndOfData)
                {
                    cancellationToken.ThrowIfCancellationRequested();

                    var fields = parser.ReadFields() ?? Array.Empty<string>();
                    if (fields.Length == 0)
                    {
                        continue;
                    }

                    if (fields.Length < header.Length)
                    {
                        Array.Resize(ref fields, header.Length);
                    }

                    var label = NormalizeLabel(fields[0]);
                    if (string.IsNullOrWhiteSpace(label))
                    {
                        continue;
                    }

                    var name = ResolveDictionaryName(label, dictionaryLookup);
                    for (var i = 1; i < header.Length; i++)
                    {
                        var year = normalizedYears[i];
                        if (string.IsNullOrWhiteSpace(year))
                        {
                            continue;
                        }

                        var rawValue = NormalizeRawValue(fields[i]);
                        var valueNum = TryParseNumeric(rawValue);

                        order++;
                        result.Add(new StatementImportItem(
                            name,
                            year,
                            rawValue,
                            valueNum,
                            order));
                    }
                }

                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка чтения data.csv: {Path}", path);
                return new List<StatementImportItem>();
            }
        }

        private async Task<List<StatementImportItem>> LoadSupplementalItemsFromReportLinksAsync(
            string reportLinksRoot,
            string standard,
            string period,
            HashSet<string> allowedYears,
            HashSet<string> existingKeys,
            int startingOrder,
            CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(reportLinksRoot) || !Directory.Exists(reportLinksRoot))
            {
                return new List<StatementImportItem>();
            }

            var order = startingOrder;
            var result = new List<StatementImportItem>();

            var reportFolder = GetReportLinksFolderName(standard, period);
            if (!string.IsNullOrWhiteSpace(reportFolder))
            {
                var reportPath = Path.Combine(reportLinksRoot, reportFolder, "links.csv");
                order = await AppendReportLinkItemsAsync(
                    reportPath,
                    ReportUrlField,
                    allowedYears,
                    existingKeys,
                    order,
                    result,
                    cancellationToken);
            }

            if (string.Equals(period, "y", StringComparison.OrdinalIgnoreCase))
            {
                var presentationPath = Path.Combine(reportLinksRoot, AnnualPresentationsFolderName, "links.csv");
                order = await AppendReportLinkItemsAsync(
                    presentationPath,
                    PresentationUrlField,
                    allowedYears,
                    existingKeys,
                    order,
                    result,
                    cancellationToken);
            }

            return result;
        }

        private async Task<int> AppendReportLinkItemsAsync(
            string path,
            string entryName,
            HashSet<string> allowedYears,
            HashSet<string> existingKeys,
            int order,
            List<StatementImportItem> result,
            CancellationToken cancellationToken)
        {
            if (!File.Exists(path))
            {
                return order;
            }

            try
            {
                using var stream = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.ReadWrite);
                using var parser = new TextFieldParser(stream, Encoding.UTF8);
                parser.TextFieldType = FieldType.Delimited;
                parser.SetDelimiters(",");
                parser.HasFieldsEnclosedInQuotes = true;

                if (parser.EndOfData)
                {
                    return order;
                }

                var header = parser.ReadFields();
                if (header is { Length: >= 2 }
                    && string.Equals(header[0]?.Trim(), "label", StringComparison.OrdinalIgnoreCase)
                    && string.Equals(header[1]?.Trim(), "url", StringComparison.OrdinalIgnoreCase))
                {
                    // Header row consumed.
                }
                else if (header is { Length: >= 2 })
                {
                    order = AppendReportLinkRow(header, entryName, allowedYears, existingKeys, order, result);
                }

                while (!parser.EndOfData)
                {
                    cancellationToken.ThrowIfCancellationRequested();

                    var fields = parser.ReadFields() ?? Array.Empty<string>();
                    if (fields.Length < 2)
                    {
                        continue;
                    }

                    order = AppendReportLinkRow(fields, entryName, allowedYears, existingKeys, order, result);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка чтения links.csv: {Path}", path);
            }

            return order;
        }

        private int AppendReportLinkRow(
            string[] fields,
            string entryName,
            HashSet<string> allowedYears,
            HashSet<string> existingKeys,
            int order,
            List<StatementImportItem> result)
        {
            var label = NormalizeLabel(fields[0]);
            if (string.IsNullOrWhiteSpace(label))
            {
                return order;
            }

            var urlField = fields.Length == 2 ? fields[1] : string.Join(",", fields.Skip(1));
            var rawValue = NormalizeRawValue(urlField);
            if (string.IsNullOrWhiteSpace(rawValue))
            {
                return order;
            }

            var year = NormalizeReportLinkYear(label);
            if (string.IsNullOrWhiteSpace(year) || !allowedYears.Contains(year))
            {
                return order;
            }

            var key = BuildEntryKey(entryName, year);
            if (!existingKeys.Add(key))
            {
                return order;
            }

            order++;
            result.Add(new StatementImportItem(
                entryName,
                year,
                rawValue,
                TryParseNumeric(rawValue),
                order));

            return order;
        }

        private static string? NormalizeReportLinkYear(string? label)
        {
            if (string.IsNullOrWhiteSpace(label))
            {
                return null;
            }

            var normalized = NormalizeLabel(label);
            if (string.IsNullOrWhiteSpace(normalized))
            {
                return null;
            }

            normalized = normalized
                .Replace('К', 'Q')
                .Replace('к', 'Q')
                .Replace('K', 'Q')
                .Replace('k', 'Q');

            return NormalizeYear(normalized);
        }

        private static string? GetReportLinksFolderName(string standard, string period)
        {
            if (string.IsNullOrWhiteSpace(standard) || string.IsNullOrWhiteSpace(period))
            {
                return null;
            }

            var normalizedStandard = standard.Trim().ToUpperInvariant();
            var normalizedPeriod = period.Trim().ToLowerInvariant();

            if (normalizedPeriod == "q")
            {
                if (normalizedStandard == "MSFO")
                {
                    return QuarterlyMsfoFolderName;
                }

                if (normalizedStandard == "RSBU")
                {
                    return QuarterlyRsbuFolderName;
                }

                return null;
            }

            if (normalizedPeriod == "y")
            {
                if (normalizedStandard == "MSFO")
                {
                    return AnnualMsfoFolderName;
                }

                if (normalizedStandard == "RSBU")
                {
                    return AnnualRsbuFolderName;
                }

                return null;
            }

            return null;
        }

        private static string? NormalizeRawValue(string? value)
        {
            if (value == null)
            {
                return null;
            }

            var decoded = WebUtility.HtmlDecode(value) ?? string.Empty;
            decoded = decoded.Replace('\u00A0', ' ');
            return decoded.Trim();
        }

        private static decimal? TryParseNumeric(string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return null;
            }

            var cleaned = new string(value.Where(c => !char.IsWhiteSpace(c)).ToArray());
            if (string.IsNullOrWhiteSpace(cleaned))
            {
                return null;
            }

            cleaned = cleaned.Replace("%", string.Empty).Replace(',', '.');
            if (string.IsNullOrWhiteSpace(cleaned))
            {
                return null;
            }

            if (cleaned == "-" || cleaned == "—")
            {
                return null;
            }

            if (decimal.TryParse(cleaned, NumberStyles.Any, CultureInfo.InvariantCulture, out var parsed))
            {
                return parsed;
            }

            return null;
        }

        private static string? NormalizeYear(string? year)
        {
            if (string.IsNullOrWhiteSpace(year))
            {
                return null;
            }

            var decoded = NormalizeLabel(year);
            if (string.IsNullOrWhiteSpace(decoded))
            {
                return null;
            }

            var compact = new string(decoded.Where(c => !char.IsWhiteSpace(c)).ToArray());
            if (string.IsNullOrWhiteSpace(compact))
            {
                return null;
            }

            if (Regex.IsMatch(compact, "^\\d{4}$"))
            {
                return compact;
            }

            if (Regex.IsMatch(compact, "^\\d{4}Q[1-4]$", RegexOptions.IgnoreCase))
            {
                return compact.ToUpperInvariant();
            }

            var upper = compact.ToUpperInvariant();
            if (upper.Contains("LTR") || upper.Contains("LTM"))
            {
                return "LTR";
            }

            return null;
        }

        private static bool IsLtrYear(string? year)
        {
            return string.Equals(year, "LTR", StringComparison.OrdinalIgnoreCase);
        }

        private static HashSet<string> SelectRecentYears(IEnumerable<string> years, int limit)
        {
            var candidates = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
            foreach (var year in years)
            {
                var normalized = NormalizeYear(year) ?? year;
                if (string.IsNullOrWhiteSpace(normalized) || IsLtrYear(normalized))
                {
                    continue;
                }

                if (!TryGetYearSortKey(normalized, out var key))
                {
                    continue;
                }

                if (!candidates.TryGetValue(normalized, out var existing) || key > existing)
                {
                    candidates[normalized] = key;
                }
            }

            if (candidates.Count == 0)
            {
                return new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            }

            var ordered = candidates
                .OrderBy(pair => pair.Value)
                .Select(pair => pair.Key)
                .ToList();

            var skip = Math.Max(0, ordered.Count - limit);
            return new HashSet<string>(ordered.Skip(skip), StringComparer.OrdinalIgnoreCase);
        }

        private static bool TryGetYearSortKey(string year, out int key)
        {
            key = 0;
            if (string.IsNullOrWhiteSpace(year))
            {
                return false;
            }

            var normalized = NormalizeYear(year) ?? year;
            if (string.IsNullOrWhiteSpace(normalized) || IsLtrYear(normalized))
            {
                return false;
            }

            if (Regex.IsMatch(normalized, "^\\d{4}$") && int.TryParse(normalized, out var yearValue))
            {
                key = yearValue * 10 + 9;
                return true;
            }

            var match = Regex.Match(normalized, "^(\\d{4})Q([1-4])$", RegexOptions.IgnoreCase);
            if (match.Success
                && int.TryParse(match.Groups[1].Value, out var quarterYear)
                && int.TryParse(match.Groups[2].Value, out var quarter))
            {
                key = quarterYear * 10 + quarter;
                return true;
            }

            return false;
        }

        private static bool IsSmartlabPresenceRow(string? name)
        {
            if (string.IsNullOrWhiteSpace(name))
            {
                return false;
            }

            var normalized = NormalizeLabel(name);
            if (string.IsNullOrWhiteSpace(normalized))
            {
                return false;
            }

            if (IsSmartlabPresenceText(normalized))
            {
                return true;
            }

            var decoded = TryUrlDecode(normalized);
            return !string.IsNullOrWhiteSpace(decoded) && IsSmartlabPresenceText(decoded);
        }

        private static int GetPriorityRank(string? name)
        {
            if (string.IsNullOrWhiteSpace(name))
            {
                return 4;
            }

            var normalized = NormalizeLabel(name);
            if (string.IsNullOrWhiteSpace(normalized))
            {
                return 4;
            }

            if (IsDateRowName(normalized))
            {
                return 0;
            }

            if (IsCurrencyRowName(normalized))
            {
                return 1;
            }

            if (IsReportUrlRowName(normalized))
            {
                return 2;
            }

            if (IsPresentationUrlRowName(normalized))
            {
                return 3;
            }

            return 4;
        }

        private static bool IsDateRowName(string value)
        {
            return IsCompactMatch(value, "date", "датаотчета");
        }

        private static bool IsCurrencyRowName(string value)
        {
            return IsCompactMatch(value, "currency", "валютаотчета");
        }

        private static bool IsReportUrlRowName(string value)
        {
            return IsCompactMatch(value, "reporturl", "финансовыйотчет");
        }

        private static bool IsPresentationUrlRowName(string value)
        {
            return IsCompactMatch(value, "presentationurl", "презентация");
        }

        private static bool IsCompactMatch(string value, params string[] targets)
        {
            var compact = NormalizeCompact(value);
            if (string.IsNullOrWhiteSpace(compact))
            {
                return false;
            }

            foreach (var target in targets)
            {
                if (string.Equals(compact, target, StringComparison.OrdinalIgnoreCase))
                {
                    return true;
                }
            }

            return false;
        }

        private static bool IsSmartlabPresenceText(string value)
        {
            var hasSmartlab = value.IndexOf("смартлаб", StringComparison.OrdinalIgnoreCase) >= 0
                || value.IndexOf("smartlab", StringComparison.OrdinalIgnoreCase) >= 0;
            var hasPresence = value.IndexOf("присутств", StringComparison.OrdinalIgnoreCase) >= 0
                || value.IndexOf("presence", StringComparison.OrdinalIgnoreCase) >= 0;
            return hasSmartlab && hasPresence;
        }

        private static string? TryUrlDecode(string value)
        {
            try
            {
                return Uri.UnescapeDataString(value);
            }
            catch
            {
                return null;
            }
        }

        private static DictionaryValueLookup BuildDictionaryLookup(Dictionary<string, string> data)
        {
            var lookup = new DictionaryValueLookup();
            foreach (var item in data)
            {
                var code = (item.Key ?? string.Empty).Trim();
                if (string.IsNullOrWhiteSpace(code))
                {
                    continue;
                }

                var value = NormalizeLabel(item.Value);
                if (string.IsNullOrWhiteSpace(value))
                {
                    continue;
                }

                AddLookup(lookup.Exact, lookup.AmbiguousExact, value, code);
                var compact = NormalizeCompact(value);
                AddLookup(lookup.Compact, lookup.AmbiguousCompact, compact, code);
                var stem = NormalizeWordStem(value);
                AddLookup(lookup.Stem, lookup.AmbiguousStem, stem, code);
            }

            return lookup;
        }

        private static void AddLookup(
            Dictionary<string, string> map,
            HashSet<string> ambiguous,
            string key,
            string code)
        {
            if (string.IsNullOrWhiteSpace(key))
            {
                return;
            }

            if (ambiguous.Contains(key))
            {
                return;
            }

            if (map.TryGetValue(key, out var existing))
            {
                if (!string.Equals(existing, code, StringComparison.OrdinalIgnoreCase))
                {
                    map.Remove(key);
                    ambiguous.Add(key);
                }

                return;
            }

            map[key] = code;
        }

        private static string ResolveDictionaryName(string label, DictionaryValueLookup? lookup)
        {
            if (lookup == null)
            {
                return label;
            }

            if (lookup.Exact.TryGetValue(label, out var code))
            {
                return code;
            }

            var compact = NormalizeCompact(label);
            if (!string.IsNullOrWhiteSpace(compact) && lookup.Compact.TryGetValue(compact, out code))
            {
                return code;
            }

            var stem = NormalizeWordStem(label);
            if (!string.IsNullOrWhiteSpace(stem) && lookup.Stem.TryGetValue(stem, out code))
            {
                return code;
            }

            return label;
        }

        private static string NormalizeLabel(string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return string.Empty;
            }

            var decoded = WebUtility.HtmlDecode(value) ?? string.Empty;
            decoded = decoded.Replace('\u00A0', ' ').Replace('\uFEFF', ' ').Trim();
            if (string.IsNullOrWhiteSpace(decoded))
            {
                return string.Empty;
            }

            decoded = StripOuterQuotes(decoded);
            decoded = CollapseWhitespace(decoded);
            return decoded.Trim();
        }

        private static string StripOuterQuotes(string value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return value;
            }

            var trimmed = value.Trim();
            if (trimmed.Length < 2)
            {
                return trimmed;
            }

            if ((trimmed.StartsWith("\"", StringComparison.Ordinal) && trimmed.EndsWith("\"", StringComparison.Ordinal))
                || (trimmed.StartsWith("'", StringComparison.Ordinal) && trimmed.EndsWith("'", StringComparison.Ordinal)))
            {
                trimmed = trimmed.Substring(1, trimmed.Length - 2);
            }

            return trimmed.Replace("\"\"", "\"", StringComparison.Ordinal);
        }

        private static string CollapseWhitespace(string value)
        {
            if (string.IsNullOrEmpty(value))
            {
                return value;
            }

            var builder = new StringBuilder(value.Length);
            var previousSpace = false;
            foreach (var ch in value)
            {
                if (char.IsWhiteSpace(ch))
                {
                    if (!previousSpace)
                    {
                        builder.Append(' ');
                        previousSpace = true;
                    }

                    continue;
                }

                builder.Append(ch);
                previousSpace = false;
            }

            return builder.ToString();
        }

        private static string NormalizeCompact(string value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return string.Empty;
            }

            var builder = new StringBuilder(value.Length);
            foreach (var ch in value)
            {
                if (char.IsLetterOrDigit(ch))
                {
                    builder.Append(char.ToLowerInvariant(ch));
                }
            }

            return builder.ToString();
        }

        private static string NormalizeWordStem(string value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return string.Empty;
            }

            const int stemLength = 4;
            var builder = new StringBuilder(value.Length);
            var index = 0;
            while (index < value.Length)
            {
                while (index < value.Length && !char.IsLetterOrDigit(value[index]))
                {
                    index++;
                }

                if (index >= value.Length)
                {
                    break;
                }

                var start = index;
                while (index < value.Length && char.IsLetterOrDigit(value[index]))
                {
                    index++;
                }

                var token = value.Substring(start, index - start);
                if (token.Length > stemLength)
                {
                    token = token.Substring(0, stemLength);
                }

                builder.Append(token.ToLowerInvariant());
            }

            return builder.ToString();
        }

        private async Task<(DictionaryEntity? Primary, DictionaryEntity? Alternate)> FindDictionariesAsync(
            string ticker,
            CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(ticker))
            {
                return (null, null);
            }

            var primary = await _dbContext.Dictionaries
                .AsNoTracking()
                .FirstOrDefaultAsync(d => d.Securityid == ticker, cancellationToken);

            var altTicker = GetAlternateTicker(ticker);
            if (string.IsNullOrWhiteSpace(altTicker))
            {
                return (primary, null);
            }

            var alternate = await _dbContext.Dictionaries
                .AsNoTracking()
                .FirstOrDefaultAsync(d => d.Securityid == altTicker, cancellationToken);

            return (primary, alternate);
        }

        private static string NormalizeTicker(string ticker)
        {
            return (ticker ?? string.Empty).Trim().ToUpperInvariant();
        }

        private static string NormalizeStandard(string standard)
        {
            if (string.IsNullOrWhiteSpace(standard))
            {
                return "MSFO";
            }

            return standard.Trim().ToUpperInvariant();
        }

        private static string NormalizePeriod(string period)
        {
            if (string.IsNullOrWhiteSpace(period))
            {
                return "y";
            }

            return period.Trim().ToLowerInvariant();
        }

        private static string NormalizeMode(string mode)
        {
            if (string.IsNullOrWhiteSpace(mode))
            {
                return "raw";
            }

            var normalized = mode.Trim().ToLowerInvariant();
            return normalized == "ext" || normalized == "raw" ? normalized : "raw";
        }

        private static string? GetAlternateTicker(string ticker)
        {
            if (string.IsNullOrWhiteSpace(ticker))
            {
                return null;
            }

            return ticker.EndsWith("P", StringComparison.OrdinalIgnoreCase)
                ? ticker.Substring(0, ticker.Length - 1)
                : $"{ticker}P";
        }

        private static string ResolveFolderPath(string folderPath)
        {
            if (Path.IsPathRooted(folderPath))
            {
                return folderPath;
            }

            var current = Path.Combine(Directory.GetCurrentDirectory(), folderPath);
            if (Directory.Exists(current))
            {
                return current;
            }

            var parent = Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), "..", folderPath));
            return parent;
        }

        private sealed record StatementImportItem(
            string Name,
            string Year,
            string? ValueRaw,
            decimal? ValueNum,
            int SortOrder);

        private sealed class DictionaryValueLookup
        {
            public Dictionary<string, string> Exact { get; } = new(StringComparer.OrdinalIgnoreCase);
            public Dictionary<string, string> Compact { get; } = new(StringComparer.OrdinalIgnoreCase);
            public Dictionary<string, string> Stem { get; } = new(StringComparer.OrdinalIgnoreCase);
            public HashSet<string> AmbiguousExact { get; } = new(StringComparer.OrdinalIgnoreCase);
            public HashSet<string> AmbiguousCompact { get; } = new(StringComparer.OrdinalIgnoreCase);
            public HashSet<string> AmbiguousStem { get; } = new(StringComparer.OrdinalIgnoreCase);
        }
    }
}
