using Newtonsoft.Json.Linq;
using StockChart.Model;
using System.Text.RegularExpressions;

namespace StockChart.Repository.Services
{
    public class BatchImportOpenPositionsServiceNew
    {
        private readonly StockProcContext _context;
        private readonly HttpClient _httpClient;
        private bool _isRunning = false;
        private List<string> _processedContracts = new List<string>();

        /*
        public BatchImportOpenPositionsServiceNew(StockProcContext context, HttpClient httpClient)
        {
            _context = context;
            _httpClient = httpClient;
        }
        */

        public BatchImportOpenPositionsServiceNew()
        {
            _context = new StockProcContext();
            _httpClient = new HttpClient();
        }
        public bool IsRunning => _isRunning;
        public List<string> ProcessedContracts => _processedContracts;

        public async Task StartDownloadAndImportAsync()
        {
            if (_isRunning) return;

            _isRunning = true;
            _processedContracts.Clear(); // Очищаем список обработанных контрактов перед новым запуском
            var allContracts = GetAllContracts();

            var ttt = DateTime.Now;
              for (var d = new DateTime(2025, 12, 18); ttt - d > TimeSpan.FromDays(1); d += TimeSpan.FromDays(1))
            foreach (var contractName in allContracts)
            {
                try
                {
                    await DownloadAndImportContractDataAsync(contractName,d);
                }
                catch (Exception ex)
                {
                }
                _processedContracts.Add(contractName); // Добавляем контракт в список обработанных
            }

            _isRunning = false;
        }

        public async Task DownloadAndImportContractsAsync()
        {
            // Получаем все контракты из базы
            var allContracts = GetAllContracts();

            // Для каждого контракта запускаем процесс скачивания данных
            foreach (var contractName in allContracts)
            {
                await DownloadAndImportContractDataAsync(contractName);
            }
        }

        // Метод для скачивания и обработки данных по контракту
        private async Task DownloadAndImportContractDataAsync(string contractName, DateTime? d = null)
        {
            DateTime currentDate = d ??  DateTime.Now;
            bool dataChanged = true;

            // Обрабатываем данные по дням, начиная с текущей даты
            while (dataChanged)
            {
                // Пропускаем выходные
                if (currentDate.DayOfWeek == DayOfWeek.Saturday || currentDate.DayOfWeek == DayOfWeek.Sunday)
                {
                    currentDate = currentDate.AddDays(-1);
                    continue;
                }

                // Скачиваем данные с сервера
                var contractEntries = await DownloadContractDataAsync(contractName, currentDate);
                if (contractEntries == null || contractEntries.Count == 0)
                {
                    Console.WriteLine($"No data for {contractName} on {currentDate:dd.MM.yyyy}. Skipping.");
                    currentDate = currentDate.AddDays(-1);
                    continue;
                }

                // Берем дату из содержимого данных
                DateTime contractDate = DateTime.ParseExact(contractEntries[0].Date, "dd.MM.yyyy", System.Globalization.CultureInfo.InvariantCulture);

                // Проверяем, есть ли данные по этой дате в базе
                var existingOpenPosition = _context.OpenPositions
                    .FirstOrDefault(op => op.ContractName == contractName && op.Date == contractDate);

                if (existingOpenPosition != null)
                {
                    // Если данные есть, проверяем, изменились ли они
                    dataChanged = HasDataChanged(existingOpenPosition, contractEntries);
                    if (!dataChanged)
                    {
                        Console.WriteLine($"Data for {contractName} on {contractDate:dd.MM.yyyy} is up to date. Stopping download.");
                        break; // Прерываем скачивание для этого контракта
                    }
                    else
                    {
                        // Обновляем данные
                        UpdateExistingOpenPosition(existingOpenPosition, contractEntries);
                        Console.WriteLine($"Data for {contractName} on {contractDate:dd.MM.yyyy} has changed. Updating.");
                    }
                }
                else
                {
                    // Если данных нет, добавляем новые
                    var newOpenPosition = CreateNewOpenPosition(contractName, contractEntries);
                    _context.OpenPositions.Add(newOpenPosition);
                    Console.WriteLine($"New data for {contractName} on {contractDate:dd.MM.yyyy} added.");
                }

                // Сохраняем изменения в базе
                await _context.SaveChangesAsync();

                // Переходим на предыдущий день
                currentDate = currentDate.AddDays(-1);
            }
        }

        // Метод для скачивания данных по контракту и дате
        private async Task<List<ContractEntry>> DownloadContractDataAsync(string contractName, DateTime date)
        {
            string dateIso = date.ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture);

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

                HttpResponseMessage response = await _httpClient.SendAsync(req);
                if (!response.IsSuccessStatusCode)
                {
                    Console.WriteLine($"Failed to download data for {contractName} on {date:dd.MM.yyyy}: {response.StatusCode}");
                    return null;
                }

                string responseData = await response.Content.ReadAsStringAsync();

                var arr = Newtonsoft.Json.Linq.JArray.Parse(responseData);
                Newtonsoft.Json.Linq.JObject openObj = null;

                foreach (var t in arr)
                {
                    if (t is Newtonsoft.Json.Linq.JObject o && o.Property("openpositions") != null)
                    {
                        openObj = o;
                        break;
                    }
                }

                if (openObj == null || openObj["openpositions"] == null || openObj["openpositions"].Type != Newtonsoft.Json.Linq.JTokenType.Array)
                    return null;

                var rows = (Newtonsoft.Json.Linq.JArray)openObj["openpositions"];
                if (rows.Count == 0)
                    return null;

                string ddMMyyyy = date.ToString("dd.MM.yyyy", System.Globalization.CultureInfo.InvariantCulture);
                var firstTradeDate = rows[0]?["tradedate"]?.ToString(); // <-- без CultureInfo
                if (!string.IsNullOrWhiteSpace(firstTradeDate))
                {
                    if (DateTime.TryParseExact(firstTradeDate, "yyyy-MM-dd",
                        System.Globalization.CultureInfo.InvariantCulture,
                        System.Globalization.DateTimeStyles.None,
                        out var dt))
                    {
                        ddMMyyyy = dt.ToString("dd.MM.yyyy", System.Globalization.CultureInfo.InvariantCulture);
                    }
                }

                string ToIntString(Newtonsoft.Json.Linq.JToken tok)
                {
                    if (tok == null || tok.Type == Newtonsoft.Json.Linq.JTokenType.Null) return "0";

                    if (tok.Type == Newtonsoft.Json.Linq.JTokenType.Integer)
                    {
                        // <-- без JToken.ToString(CultureInfo)
                        var l = tok.Value<long>();
                        return l.ToString(System.Globalization.CultureInfo.InvariantCulture);
                    }

                    if (tok.Type == Newtonsoft.Json.Linq.JTokenType.Float)
                    {
                        var d = tok.Value<double>();
                        var l = (long)Math.Round(d, MidpointRounding.AwayFromZero);
                        return l.ToString(System.Globalization.CultureInfo.InvariantCulture);
                    }

                    // fallback: строка -> double -> long
                    var s = tok.ToString(); // <-- без CultureInfo
                    if (double.TryParse(s.Replace(',', '.'),
                        System.Globalization.NumberStyles.Any,
                        System.Globalization.CultureInfo.InvariantCulture,
                        out var dv))
                    {
                        var l = (long)Math.Round(dv, MidpointRounding.AwayFromZero);
                        return l.ToString(System.Globalization.CultureInfo.InvariantCulture);
                    }

                    return "0";
                }

                string ToFloatString(Newtonsoft.Json.Linq.JToken tok)
                {
                    if (tok == null || tok.Type == Newtonsoft.Json.Linq.JTokenType.Null) return "0";

                    if (tok.Type == Newtonsoft.Json.Linq.JTokenType.Integer)
                    {
                        var l = tok.Value<long>();
                        return l.ToString(System.Globalization.CultureInfo.InvariantCulture);
                    }

                    if (tok.Type == Newtonsoft.Json.Linq.JTokenType.Float)
                    {
                        var d = tok.Value<double>();
                        return d.ToString("0.##", System.Globalization.CultureInfo.InvariantCulture);
                    }

                    var s = tok.ToString(); // <-- без CultureInfo
                    if (double.TryParse(s.Replace(',', '.'),
                        System.Globalization.NumberStyles.Any,
                        System.Globalization.CultureInfo.InvariantCulture,
                        out var dv))
                    {
                        return dv.ToString("0.##", System.Globalization.CultureInfo.InvariantCulture);
                    }

                    return "0";
                }
                static string ToDdMmYyyy(string tradedate)
                {
                    if (string.IsNullOrWhiteSpace(tradedate))
                        return null;

                    if (DateTime.TryParseExact(
                            tradedate.Trim(),
                            "yyyy-MM-dd",
                            System.Globalization.CultureInfo.InvariantCulture,
                            System.Globalization.DateTimeStyles.None,
                            out var dt))
                    {
                        return dt.ToString("dd.MM.yyyy", System.Globalization.CultureInfo.InvariantCulture);
                    }

                    // fallback на случай, если прилетит иной формат
                    if (DateTime.TryParse(
                            tradedate.Trim(),
                            System.Globalization.CultureInfo.InvariantCulture,
                            System.Globalization.DateTimeStyles.None,
                            out dt))
                    {
                        return dt.ToString("dd.MM.yyyy", System.Globalization.CultureInfo.InvariantCulture);
                    }

                    // если совсем не распарсилось — вернём как есть (лучше, чем null)
                    return tradedate.Trim();
                }

                ContractEntry MakeEntry(Newtonsoft.Json.Linq.JToken r, bool allowFloat)
                {
                    return new ContractEntry
                    {
                        Date = ToDdMmYyyy(r["tradedate"]?.ToString()),
                        PhysicalLong = allowFloat ? ToFloatString(r["long_fiz"]) : ToIntString(r["long_fiz"]),
                        PhysicalShort = allowFloat ? ToFloatString(r["short_fiz"]) : ToIntString(r["short_fiz"]),
                        JuridicalLong = allowFloat ? ToFloatString(r["long_jur"]) : ToIntString(r["long_jur"]),
                        JuridicalShort = allowFloat ? ToFloatString(r["short_jur"]) : ToIntString(r["short_jur"]),
                        Summary = allowFloat ? ToFloatString(r["total"]) : ToIntString(r["total"]),
                    };
                }

                ContractEntry daily = null;
                ContractEntry deltaAbs = null;
                ContractEntry deltaPct = null;
                ContractEntry people = null;

                foreach (var r in rows)
                {
                    var title = (r?["title"]?.ToString() ?? "").Trim().ToLowerInvariant();

                    if (daily == null && title.Contains("кол-во контрактов"))
                        daily = MakeEntry(r, allowFloat: false);
                    else if (deltaAbs == null && title.Contains("изменение к пред") && title.Contains("шт"))
                        deltaAbs = MakeEntry(r, allowFloat: false);
                    else if (deltaPct == null && title.Contains("изменение к пред") && title.Contains("%"))
                        deltaPct = MakeEntry(r, allowFloat: true);
                    else if (people == null && title.Contains("кол-во лиц"))
                        people = MakeEntry(r, allowFloat: false);
                }

                daily ??= new ContractEntry { Date = ddMMyyyy, PhysicalLong = "0", PhysicalShort = "0", JuridicalLong = "0", JuridicalShort = "0", Summary = "0" };
                deltaAbs ??= new ContractEntry { Date = ddMMyyyy, PhysicalLong = "0", PhysicalShort = "0", JuridicalLong = "0", JuridicalShort = "0", Summary = "0" };
                deltaPct ??= new ContractEntry { Date = ddMMyyyy, PhysicalLong = "0", PhysicalShort = "0", JuridicalLong = "0", JuridicalShort = "0", Summary = "0" };
                people ??= new ContractEntry { Date = ddMMyyyy, PhysicalLong = "0", PhysicalShort = "0", JuridicalLong = "0", JuridicalShort = "0", Summary = "0" };

                var result = new List<ContractEntry> { daily, deltaAbs, deltaPct, people };

                return result.Select(x => RemoveSpacesFromEntry(x)).ToList();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error downloading data for {contractName} on {date:dd.MM.yyyy}: {ex.Message}");
                return null;
            }
        }


        // Метод для получения всех контрактов
        public List<string> GetAllContracts()
        {
            return _context.OpenPositions
                .Select(op => op.ContractName)
                .Distinct()
                .OrderBy(x => x)
                .ToList();
        }

        // Метод для проверки изменения данных
        private bool HasDataChanged(OpenPosition existingOpenPosition, List<ContractEntry> contractEntries)
        {
            // Сравниваем поля
            var dailyData = contractEntries[0];
            var deltaData = contractEntries[1];
            var peopleData = contractEntries[3];

            return existingOpenPosition.JuridicalLong != long.Parse(dailyData.JuridicalLong) ||
                   existingOpenPosition.JuridicalShort != long.Parse(dailyData.JuridicalShort) ||
                   existingOpenPosition.PhysicalLong != long.Parse(dailyData.PhysicalLong) ||
                   existingOpenPosition.PhysicalShort != long.Parse(dailyData.PhysicalShort) ||
                   existingOpenPosition.JuridicalLongDelta != long.Parse(deltaData.JuridicalLong) ||
                   existingOpenPosition.JuridicalShortDelta != long.Parse(deltaData.JuridicalShort) ||
                   existingOpenPosition.PhysicalLongDelta != long.Parse(deltaData.PhysicalLong) ||
                   existingOpenPosition.PhysicalShortDelta != long.Parse(deltaData.PhysicalShort) ||
                   existingOpenPosition.JuridicalLongCount != int.Parse(peopleData.JuridicalLong) ||
                   existingOpenPosition.JuridicalShortCount != int.Parse(peopleData.JuridicalShort) ||
                   existingOpenPosition.PhysicalLongCount != int.Parse(peopleData.PhysicalLong) ||
                   existingOpenPosition.PhysicalShortCount != int.Parse(peopleData.PhysicalShort);
        }

        // Метод для создания новой записи OpenPosition
        private OpenPosition CreateNewOpenPosition(string contractName, List<ContractEntry> contractEntries)
        {
            var dailyData = contractEntries[0];
            var deltaData = contractEntries[1];
            var peopleData = contractEntries[3];

            return new OpenPosition
            {
                Date = DateTime.ParseExact(dailyData.Date, "dd.MM.yyyy", System.Globalization.CultureInfo.InvariantCulture),
                JuridicalLong = long.Parse(dailyData.JuridicalLong),
                JuridicalShort = long.Parse(dailyData.JuridicalShort),
                PhysicalLong = long.Parse(dailyData.PhysicalLong),
                PhysicalShort = long.Parse(dailyData.PhysicalShort),

                JuridicalLongDelta = long.Parse(deltaData.JuridicalLong),
                JuridicalShortDelta = long.Parse(deltaData.JuridicalShort),
                PhysicalLongDelta = long.Parse(deltaData.PhysicalLong),
                PhysicalShortDelta = long.Parse(deltaData.PhysicalShort),

                JuridicalLongCount = int.Parse(peopleData.JuridicalLong),
                JuridicalShortCount = int.Parse(peopleData.JuridicalShort),
                PhysicalLongCount = int.Parse(peopleData.PhysicalLong),
                PhysicalShortCount = int.Parse(peopleData.PhysicalShort),

                ContractName = contractName
            };
        }

        // Обновление существующих данных
        private void UpdateExistingOpenPosition(OpenPosition existingOpenPosition, List<ContractEntry> contractEntries)
        {
            var dailyData = contractEntries[0];
            var deltaData = contractEntries[1];
            var peopleData = contractEntries[3];

            existingOpenPosition.JuridicalLong = long.Parse(dailyData.JuridicalLong);
            existingOpenPosition.JuridicalShort = long.Parse(dailyData.JuridicalShort);
            existingOpenPosition.PhysicalLong = long.Parse(dailyData.PhysicalLong);
            existingOpenPosition.PhysicalShort = long.Parse(dailyData.PhysicalShort);

            existingOpenPosition.JuridicalLongDelta = long.Parse(deltaData.JuridicalLong);
            existingOpenPosition.JuridicalShortDelta = long.Parse(deltaData.JuridicalShort);
            existingOpenPosition.PhysicalLongDelta = long.Parse(deltaData.PhysicalLong);
            existingOpenPosition.PhysicalShortDelta = long.Parse(deltaData.PhysicalShort);

            existingOpenPosition.JuridicalLongCount = int.Parse(peopleData.JuridicalLong);
            existingOpenPosition.JuridicalShortCount = int.Parse(peopleData.JuridicalShort);
            existingOpenPosition.PhysicalLongCount = int.Parse(peopleData.PhysicalLong);
            existingOpenPosition.PhysicalShortCount = int.Parse(peopleData.PhysicalShort);
        }

        private ContractEntry RemoveSpacesFromEntry(ContractEntry entry)
        {
            return new ContractEntry
            {
                Date = entry.Date?.Trim(),
                JuridicalLong = RemoveInvalidCharacters(entry.JuridicalLong),
                JuridicalShort = RemoveInvalidCharacters(entry.JuridicalShort),
                PhysicalLong = RemoveInvalidCharacters(entry.PhysicalLong),
                PhysicalShort = RemoveInvalidCharacters(entry.PhysicalShort),
                Summary = RemoveInvalidCharacters(entry.Summary) // Если необходимо
            };
        }

        // Функция для удаления всех символов, кроме цифр, запятых, точек и дефисов
        private string RemoveInvalidCharacters(string input)
        {
            if (string.IsNullOrEmpty(input))
                return input;

            // Оставляем только цифры, запятые, точки и дефисы
            //     return Regex.Replace(input, @"[^0-9.,-]", "");
            return Regex.Replace(input, @"[^0-9-]", "");
        }
    }
}

