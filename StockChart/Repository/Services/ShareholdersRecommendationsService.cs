using System.IO;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using StockChart.Model;
using StockChart.Repository.Interfaces;

namespace StockChart.Repository.Services
{
    public class ShareholdersRecommendationsService : IShareholdersRecommendationsService
    {
        private static readonly TimeSpan ImportInterval = TimeSpan.FromHours(24);
        private static readonly JsonSerializerOptions JsonOptions = new()
        {
            PropertyNameCaseInsensitive = true,
            NumberHandling = JsonNumberHandling.AllowReadingFromString
        };

        private readonly ApplicationDbContext _dbContext;
        private readonly ILogger<ShareholdersRecommendationsService> _logger;

        public ShareholdersRecommendationsService(
            ApplicationDbContext dbContext,
            ILogger<ShareholdersRecommendationsService> logger)
        {
            _dbContext = dbContext;
            _logger = logger;
        }

        public async Task<ShareholdersStructureDto> GetShareholdersAsync(string ticker, CancellationToken cancellationToken = default)
        {
            var normalized = NormalizeTicker(ticker);
            var (primaryDictionary, alternateDictionary) = await FindDictionariesAsync(normalized, cancellationToken);
            var titleFallback = BuildShareholdersTitle(primaryDictionary ?? alternateDictionary, normalized);

            if (primaryDictionary == null && alternateDictionary == null)
            {
                return new ShareholdersStructureDto
                {
                    Title = titleFallback
                };
            }

            ShareholderSnapshot? snapshot = null;
            Dictionary? snapshotDictionary = null;

            if (primaryDictionary != null)
            {
                snapshot = await GetLatestShareholderSnapshotAsync(primaryDictionary.Id, cancellationToken);
                snapshotDictionary = primaryDictionary;
            }

            if (snapshot == null && alternateDictionary != null && alternateDictionary.Id != primaryDictionary?.Id)
            {
                snapshot = await GetLatestShareholderSnapshotAsync(alternateDictionary.Id, cancellationToken);
                snapshotDictionary = alternateDictionary;
            }

            if (snapshot == null)
            {
                return new ShareholdersStructureDto
                {
                    Title = titleFallback
                };
            }

            var entries = await _dbContext.ShareholderEntries
                .AsNoTracking()
                .Where(e => e.SnapshotId == snapshot.Id)
                .OrderBy(e => e.SortOrder)
                .ThenBy(e => e.Id)
                .Select(e => new ShareholderDto
                {
                    Name = e.Name,
                    SharePercentage = e.SharePercentage
                })
                .ToListAsync(cancellationToken);

            return new ShareholdersStructureDto
            {
                Title = string.IsNullOrWhiteSpace(snapshot.Title)
                    ? BuildShareholdersTitle(snapshotDictionary, normalized)
                    : snapshot.Title,
                LastUpdateDate = snapshot.LastUpdateDate,
                Shareholders = entries
            };
        }

        public async Task<RecommendationDto> GetRecommendationsAsync(string ticker, CancellationToken cancellationToken = default)
        {
            var normalized = NormalizeTicker(ticker);
            var (primaryDictionary, alternateDictionary) = await FindDictionariesAsync(normalized, cancellationToken);

            if (primaryDictionary == null && alternateDictionary == null)
            {
                return new RecommendationDto();
            }

            RecommendationSnapshot? snapshot = null;

            if (primaryDictionary != null)
            {
                snapshot = await GetLatestRecommendationSnapshotAsync(primaryDictionary.Id, cancellationToken);
            }

            if (snapshot == null && alternateDictionary != null && alternateDictionary.Id != primaryDictionary?.Id)
            {
                snapshot = await GetLatestRecommendationSnapshotAsync(alternateDictionary.Id, cancellationToken);
            }

            if (snapshot == null)
            {
                return new RecommendationDto();
            }

            var reasons = await _dbContext.RecommendationReasons
                .AsNoTracking()
                .Where(r => r.SnapshotId == snapshot.Id)
                .OrderBy(r => r.SortOrder)
                .ThenBy(r => r.Id)
                .Select(r => new { r.Direction, r.Text })
                .ToListAsync(cancellationToken);

            var up = reasons
                .Where(r => r.Direction == RecommendationDirection.Up && !string.IsNullOrWhiteSpace(r.Text))
                .Select(r => r.Text)
                .ToList();

            var down = reasons
                .Where(r => r.Direction == RecommendationDirection.Down && !string.IsNullOrWhiteSpace(r.Text))
                .Select(r => r.Text)
                .ToList();

            return new RecommendationDto
            {
                ReasonsUp = up,
                ReasonsDown = down
            };
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
                _logger.LogWarning("Папка импорта не найдена: {Path}", resolvedPath);
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
                .ToDictionaryAsync(d => d.Securityid.ToUpper(), cancellationToken);

            if (dictionaries.Count == 0)
            {
                return 0;
            }

            var importedAt = now;
            var shareholderSnapshots = new List<ShareholderSnapshot>();
            var recommendationSnapshots = new List<RecommendationSnapshot>();
            var added = 0;

            foreach (var dir in tickerDirs)
            {
                var ticker = new DirectoryInfo(dir).Name.Trim().ToUpperInvariant();
                if (string.IsNullOrWhiteSpace(ticker))
                {
                    continue;
                }

                if (!dictionaries.TryGetValue(ticker, out var dictionary))
                {
                    _logger.LogWarning("Тикер {Ticker} не найден в Dictionary, импорт пропущен", ticker);
                    continue;
                }

                var shareholdersPath = Path.Combine(dir, "shareholders.json");
                if (File.Exists(shareholdersPath))
                {
                    var shareholdersModel = await LoadShareholdersAsync(shareholdersPath, cancellationToken);
                    if (shareholdersModel != null)
                    {
                        var snapshot = new ShareholderSnapshot
                        {
                            DictionaryId = dictionary.Id,
                            ImportedAt = importedAt,
                            Title = shareholdersModel.Title,
                            LastUpdateDate = shareholdersModel.LastUpdateDate
                        };

                        if (shareholdersModel.Shareholders != null)
                        {
                            var order = 0;
                            foreach (var item in shareholdersModel.Shareholders)
                            {
                                if (item == null || string.IsNullOrWhiteSpace(item.Name))
                                {
                                    continue;
                                }

                                order++;
                                snapshot.Shareholders.Add(new ShareholderEntry
                                {
                                    Name = item.Name.Trim(),
                                    SharePercentage = item.SharePercentage ?? 0m,
                                    SortOrder = order
                                });
                            }
                        }

                        shareholderSnapshots.Add(snapshot);
                        added += 1 + snapshot.Shareholders.Count;
                    }
                }

                var recommendationPath = Path.Combine(dir, "recomendation.json");
                if (File.Exists(recommendationPath))
                {
                    var recommendationModel = await LoadRecommendationsAsync(recommendationPath, cancellationToken);
                    if (recommendationModel != null)
                    {
                        var snapshot = new RecommendationSnapshot
                        {
                            DictionaryId = dictionary.Id,
                            ImportedAt = importedAt
                        };

                        var order = 0;
                        if (recommendationModel.ReasonsUp != null)
                        {
                            foreach (var reason in recommendationModel.ReasonsUp)
                            {
                                if (string.IsNullOrWhiteSpace(reason))
                                {
                                    continue;
                                }

                                order++;
                                snapshot.Reasons.Add(new RecommendationReason
                                {
                                    Direction = RecommendationDirection.Up,
                                    Text = reason.Trim(),
                                    SortOrder = order
                                });
                            }
                        }

                        if (recommendationModel.ReasonsDown != null)
                        {
                            foreach (var reason in recommendationModel.ReasonsDown)
                            {
                                if (string.IsNullOrWhiteSpace(reason))
                                {
                                    continue;
                                }

                                order++;
                                snapshot.Reasons.Add(new RecommendationReason
                                {
                                    Direction = RecommendationDirection.Down,
                                    Text = reason.Trim(),
                                    SortOrder = order
                                });
                            }
                        }

                        recommendationSnapshots.Add(snapshot);
                        added += 1 + snapshot.Reasons.Count;
                    }
                }
            }

            if (shareholderSnapshots.Count == 0 && recommendationSnapshots.Count == 0)
            {
                return 0;
            }

            if (shareholderSnapshots.Count > 0)
            {
                _dbContext.ShareholderSnapshots.AddRange(shareholderSnapshots);
            }

            if (recommendationSnapshots.Count > 0)
            {
                _dbContext.RecommendationSnapshots.AddRange(recommendationSnapshots);
            }

            if (_dbContext.ChangeTracker.HasChanges())
            {
                await _dbContext.SaveChangesAsync(cancellationToken);
            }

            return added;
        }

        private async Task<DateTime?> GetLastImportDateAsync(CancellationToken cancellationToken)
        {
            var lastShareImport = await _dbContext.ShareholderSnapshots
                .AsNoTracking()
                .OrderByDescending(s => s.ImportedAt)
                .Select(s => (DateTime?)s.ImportedAt)
                .FirstOrDefaultAsync(cancellationToken);

            var lastRecommendationImport = await _dbContext.RecommendationSnapshots
                .AsNoTracking()
                .OrderByDescending(s => s.ImportedAt)
                .Select(s => (DateTime?)s.ImportedAt)
                .FirstOrDefaultAsync(cancellationToken);

            if (!lastShareImport.HasValue)
            {
                return lastRecommendationImport;
            }

            if (!lastRecommendationImport.HasValue)
            {
                return lastShareImport;
            }

            return lastShareImport > lastRecommendationImport ? lastShareImport : lastRecommendationImport;
        }

        private async Task<ShareholdersImportModel?> LoadShareholdersAsync(string path, CancellationToken cancellationToken)
        {
            try
            {
                var json = await File.ReadAllTextAsync(path, cancellationToken);
                return JsonSerializer.Deserialize<ShareholdersImportModel>(json, JsonOptions);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка чтения shareholders.json: {Path}", path);
                return null;
            }
        }

        private async Task<RecommendationImportModel?> LoadRecommendationsAsync(string path, CancellationToken cancellationToken)
        {
            try
            {
                var json = await File.ReadAllTextAsync(path, cancellationToken);
                return JsonSerializer.Deserialize<RecommendationImportModel>(json, JsonOptions);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка чтения recomendation.json: {Path}", path);
                return null;
            }
        }

        private async Task<(Dictionary? Primary, Dictionary? Alternate)> FindDictionariesAsync(string ticker, CancellationToken cancellationToken)
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

        private Task<ShareholderSnapshot?> GetLatestShareholderSnapshotAsync(int dictionaryId, CancellationToken cancellationToken)
        {
            return _dbContext.ShareholderSnapshots
                .AsNoTracking()
                .Where(s => s.DictionaryId == dictionaryId)
                .OrderByDescending(s => s.ImportedAt)
                .FirstOrDefaultAsync(cancellationToken);
        }

        private Task<RecommendationSnapshot?> GetLatestRecommendationSnapshotAsync(int dictionaryId, CancellationToken cancellationToken)
        {
            return _dbContext.RecommendationSnapshots
                .AsNoTracking()
                .Where(s => s.DictionaryId == dictionaryId)
                .OrderByDescending(s => s.ImportedAt)
                .FirstOrDefaultAsync(cancellationToken);
        }

        private static string NormalizeTicker(string ticker)
        {
            return (ticker ?? string.Empty).Trim().ToUpperInvariant();
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

        private static string BuildShareholdersTitle(Dictionary? dictionary, string fallbackTicker)
        {
            var name = dictionary?.Shortname;
            if (!string.IsNullOrWhiteSpace(name))
            {
                return $"Структура акционеров {name}".Trim();
            }

            var ticker = dictionary?.Securityid ?? fallbackTicker;
            return string.IsNullOrWhiteSpace(ticker)
                ? "Структура акционеров"
                : $"Структура акционеров {ticker}".Trim();
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

        private sealed class ShareholdersImportModel
        {
            public string? Title { get; set; }
            public DateTime? LastUpdateDate { get; set; }
            public List<ShareholderImportItem>? Shareholders { get; set; }
        }

        private sealed class ShareholderImportItem
        {
            public string? Name { get; set; }
            public decimal? SharePercentage { get; set; }
        }

        private sealed class RecommendationImportModel
        {
            public List<string>? ReasonsUp { get; set; }
            public List<string>? ReasonsDown { get; set; }
        }
    }
}
