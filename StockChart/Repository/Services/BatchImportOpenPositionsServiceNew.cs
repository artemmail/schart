using Microsoft.EntityFrameworkCore;
using StockChart.Model;
using StockChart.Repository.Moex;
using System.Globalization;
using System.Linq;

namespace StockChart.Repository.Services
{
    public class BatchImportOpenPositionsServiceNew
    {
        private readonly IDbContextFactory<ApplicationDbContext> _contextFactory;
        private readonly HttpClient _httpClient;
        private bool _isRunning;
        private readonly List<string> _processedContracts = new();

        public BatchImportOpenPositionsServiceNew(IDbContextFactory<ApplicationDbContext> contextFactory, HttpClient httpClient)
        {
            _contextFactory = contextFactory;
            _httpClient = httpClient;
        }

        public BatchImportOpenPositionsServiceNew()
        {
            _contextFactory = new DefaultContextFactory();
            _httpClient = new HttpClient();
        }

        public bool IsRunning => _isRunning;
        public List<string> ProcessedContracts => _processedContracts;

        public async Task StartDownloadAndImportAsync()
        {
            if (_isRunning) return;

            _isRunning = true;
            _processedContracts.Clear();

            var allContracts = GetAllContracts();
            var start = new DateTime(2025, 12, 18);
            var end = DateTime.Today;

            for (var d = start; d <= end; d = d.AddDays(1))
            {
                foreach (var contractName in allContracts)
                {
                    try
                    {
                        await DownloadAndImportContractDataAsync(contractName, d);
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Import error for {contractName} at {d:dd.MM.yyyy}: {ex.Message}");
                    }

                    _processedContracts.Add(contractName);
                }
            }

            _isRunning = false;
        }

        public async Task DownloadAndImportContractsAsync()
        {
            var allContracts = GetAllContracts();

            foreach (var contractName in allContracts)
                await DownloadAndImportContractDataAsync(contractName);
        }

        private async Task DownloadAndImportContractDataAsync(string contractName, DateTime? d = null)
        {
            var currentDate = (d ?? DateTime.Today).Date;
            bool dataChanged = true;
            using var context = _contextFactory.CreateDbContext();

            while (dataChanged)
            {
                if (currentDate.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday)
                {
                    currentDate = currentDate.AddDays(-1);
                    continue;
                }

                var data = await DownloadContractDataAsync(contractName, currentDate);
                if (data == null)
                {
                    Console.WriteLine($"No data for {contractName} on {currentDate:dd.MM.yyyy}. Skipping.");
                    currentDate = currentDate.AddDays(-1);
                    continue;
                }

                var contractDate = data.Value.TradeDate.Date;

                var existing = await context.OpenPositions
                    .FirstOrDefaultAsync(op => op.ContractName == contractName && op.Date == contractDate);

                if (existing != null)
                {
                    dataChanged = HasDataChanged(existing, data.Value);
                    if (!dataChanged)
                    {
                        Console.WriteLine($"Data for {contractName} on {contractDate:dd.MM.yyyy} is up to date. Stopping download.");
                        break;
                    }

                    UpdateExistingOpenPosition(existing, data.Value);
                    Console.WriteLine($"Data for {contractName} on {contractDate:dd.MM.yyyy} has changed. Updating.");
                }
                else
                {
                    var created = CreateNewOpenPosition(contractName, data.Value);
                    context.OpenPositions.Add(created);
                    Console.WriteLine($"New data for {contractName} on {contractDate:dd.MM.yyyy} added.");
                }

                await context.SaveChangesAsync();

                currentDate = currentDate.AddDays(-1);
            }
        }

        private async Task<OpenPositionsImportData?> DownloadContractDataAsync(string contractName, DateTime date)
        {
            string dateIso = date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
            string cols = Uri.EscapeDataString("title,long_fiz,short_fiz,long_jur,short_jur,total");

            string requestUrl =
                $"https://web.moex.com/moex-web-iss-api/api/v1/open-position/F/{Uri.EscapeDataString(contractName)}" +
                $"?lang=ru&iss.meta=off&iss.json=extended" +
                $"&openpositions.columns={cols}" +
                $"&limit=20&dir=asc" +
                $"&date={Uri.EscapeDataString(dateIso)}" +
                $"&asset={Uri.EscapeDataString(contractName)}";

            try
            {
                using var req = new HttpRequestMessage(HttpMethod.Get, requestUrl);
                req.Headers.TryAddWithoutValidation("User-Agent",
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36");
                req.Headers.TryAddWithoutValidation("Accept", "application/json,text/plain,*/*");

                using var response = await _httpClient.SendAsync(req);
                if (!response.IsSuccessStatusCode)
                {
                    Console.WriteLine($"Failed to download data for {contractName} on {date:dd.MM.yyyy}: {response.StatusCode}");
                    return null;
                }

                await using var stream = await response.Content.ReadAsStreamAsync();
                var envelopes = MoexOpenPositionsDeserializer.Deserialize(stream);
                if (envelopes == null || envelopes.Count == 0)
                    return null;

                var rows = envelopes.FirstOrDefault(x => x.Openpositions != null && x.Openpositions.Count > 0)?.Openpositions;
                if (rows == null || rows.Count == 0)
                    return null;

                var tradeDate = date.Date;

                long d_pl = 0, d_ps = 0, d_jl = 0, d_js = 0;
                long da_pl = 0, da_ps = 0, da_jl = 0, da_js = 0;
                long p_pl = 0, p_ps = 0, p_jl = 0, p_js = 0;

                foreach (var r in rows)
                {
                    if (!string.IsNullOrWhiteSpace(r.TradeDate) &&
                        DateTime.TryParseExact(r.TradeDate.Trim(), "yyyy-MM-dd", CultureInfo.InvariantCulture,
                            DateTimeStyles.None, out var dt))
                    {
                        tradeDate = dt.Date;
                    }

                    var title = (r.Title ?? string.Empty).Trim().ToLowerInvariant();

                    if (title.Contains("кол-во контрактов"))
                    {
                        d_pl = r.LongFiz; d_ps = r.ShortFiz; d_jl = r.LongJur; d_js = r.ShortJur;
                    }
                    else if (title.Contains("изменение к пред") && title.Contains("шт"))
                    {
                        da_pl = r.LongFiz; da_ps = r.ShortFiz; da_jl = r.LongJur; da_js = r.ShortJur;
                    }
                    else if (title.Contains("кол-во лиц"))
                    {
                        p_pl = r.LongFiz; p_ps = r.ShortFiz; p_jl = r.LongJur; p_js = r.ShortJur;
                    }
                }

                return new OpenPositionsImportData(
                    TradeDate: tradeDate,
                    PhysicalLong: d_pl,
                    PhysicalShort: d_ps,
                    JuridicalLong: d_jl,
                    JuridicalShort: d_js,
                    PhysicalLongDelta: da_pl,
                    PhysicalShortDelta: da_ps,
                    JuridicalLongDelta: da_jl,
                    JuridicalShortDelta: da_js,
                    PhysicalLongCount: ToSafeInt(p_pl),
                    PhysicalShortCount: ToSafeInt(p_ps),
                    JuridicalLongCount: ToSafeInt(p_jl),
                    JuridicalShortCount: ToSafeInt(p_js)
                );
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error downloading data for {contractName} on {date:dd.MM.yyyy}: {ex.Message}");
                return null;
            }
        }

        public List<string> GetAllContracts()
        {
            using var context = _contextFactory.CreateDbContext();
            return GetAllContracts(context);
        }

        private static int ToSafeInt(long v)
        {
            if (v <= 0) return 0;
            if (v >= int.MaxValue) return int.MaxValue;
            return (int)v;
        }

        private bool HasDataChanged(OpenPosition existing, OpenPositionsImportData d)
        {
            return existing.JuridicalLong != d.JuridicalLong ||
                   existing.JuridicalShort != d.JuridicalShort ||
                   existing.PhysicalLong != d.PhysicalLong ||
                   existing.PhysicalShort != d.PhysicalShort ||
                   existing.JuridicalLongDelta != d.JuridicalLongDelta ||
                   existing.JuridicalShortDelta != d.JuridicalShortDelta ||
                   existing.PhysicalLongDelta != d.PhysicalLongDelta ||
                   existing.PhysicalShortDelta != d.PhysicalShortDelta ||
                   existing.JuridicalLongCount != d.JuridicalLongCount ||
                   existing.JuridicalShortCount != d.JuridicalShortCount ||
                   existing.PhysicalLongCount != d.PhysicalLongCount ||
                   existing.PhysicalShortCount != d.PhysicalShortCount;
        }

        private OpenPosition CreateNewOpenPosition(string contractName, OpenPositionsImportData d)
        {
            return new OpenPosition
            {
                Date = d.TradeDate,
                JuridicalLong = d.JuridicalLong,
                JuridicalShort = d.JuridicalShort,
                PhysicalLong = d.PhysicalLong,
                PhysicalShort = d.PhysicalShort,
                JuridicalLongDelta = d.JuridicalLongDelta,
                JuridicalShortDelta = d.JuridicalShortDelta,
                PhysicalLongDelta = d.PhysicalLongDelta,
                PhysicalShortDelta = d.PhysicalShortDelta,
                JuridicalLongCount = d.JuridicalLongCount,
                JuridicalShortCount = d.JuridicalShortCount,
                PhysicalLongCount = d.PhysicalLongCount,
                PhysicalShortCount = d.PhysicalShortCount,
                ContractName = contractName
            };
        }

        private void UpdateExistingOpenPosition(OpenPosition existing, OpenPositionsImportData d)
        {
            existing.Date = d.TradeDate;
            existing.JuridicalLong = d.JuridicalLong;
            existing.JuridicalShort = d.JuridicalShort;
            existing.PhysicalLong = d.PhysicalLong;
            existing.PhysicalShort = d.PhysicalShort;
            existing.JuridicalLongDelta = d.JuridicalLongDelta;
            existing.JuridicalShortDelta = d.JuridicalShortDelta;
            existing.PhysicalLongDelta = d.PhysicalLongDelta;
            existing.PhysicalShortDelta = d.PhysicalShortDelta;
            existing.JuridicalLongCount = d.JuridicalLongCount;
            existing.JuridicalShortCount = d.JuridicalShortCount;
            existing.PhysicalLongCount = d.PhysicalLongCount;
            existing.PhysicalShortCount = d.PhysicalShortCount;
        }

        private static List<string> GetAllContracts(ApplicationDbContext context)
        {
            return context.OpenPositions
                .Select(op => op.ContractName)
                .Distinct()
                .OrderBy(x => x)
                .ToList();
        }

        private sealed class DefaultContextFactory : IDbContextFactory<ApplicationDbContext>
        {
            public ApplicationDbContext CreateDbContext()
            {
                return new ApplicationDbContext();
            }
        }
    }
}
