using System.Globalization;
using System.Net.Http;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using HtmlAgilityPack;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;




public class FinancialDataService
{
    private readonly HttpClient _httpClient;

    public ShareholdersStructure ParseHtml(string html)
    {
        var structure = new ShareholdersStructure();

        // Парсинг заголовка диаграммы
        var titlePattern = @"title:\s*'(.*?)'";
        var titleMatch = Regex.Match(html, titlePattern);
        if (titleMatch.Success)
        {
            structure.Title = titleMatch.Groups[1].Value;
        }

        // Парсинг данных акционеров
        var shareholdersPattern = @"var\s+aShareholders\s*=\s*(\[\[.*?\]\]);";
        var shareholdersMatch = Regex.Match(html, shareholdersPattern);
        if (shareholdersMatch.Success)
        {
            var shareholdersArray = shareholdersMatch.Groups[1].Value;

            // Убираем символы Unicode
            shareholdersArray = Regex.Unescape(shareholdersArray);

            // Парсинг массива данных
            var dataPattern = @"\[(.*?)\]";
            var dataMatches = Regex.Matches(shareholdersArray, dataPattern);

            // Обработка первого элемента (названия колонок)
            if (dataMatches.Count > 0)
            {
                var columnNames = dataMatches[0].Groups[1].Value;
                // structure.ColumnNames = new List<string>(columnNames.Replace("\"", "").Split(','));
            }

            // Обработка остальных элементов (данные акционеров)
            for (int i = 1; i < dataMatches.Count; i++)
            {
                var shareholderData = dataMatches[i].Groups[1].Value;
                var parts = shareholderData.Replace("\"", "").Split(',');

                if (parts.Length == 2 && double.TryParse(parts[1], out double percentage))
                {
                    structure.Shareholders.Add(new Shareholder
                    {
                        Name = parts[0],
                        SharePercentage = percentage
                    });
                }
            }
        }

        var datePattern = @"Дата последнего обновления этой структуры:\s*(\d{2}\.\d{2}\.\d{4})";
        var dateMatch = Regex.Match(html, datePattern);
        if (dateMatch.Success)
        {
            // Преобразуем дату в формат DateTime
            structure.LastUpdateDate = DateTime.ParseExact(dateMatch.Groups[1].Value, "dd.MM.yyyy", CultureInfo.InvariantCulture);
        }

        return structure;
    }


    public DiagramDataResult ParseDiagramData(string html)
    {

        var match = Regex.Match(html, @"var aYearData\s*=\s*({.*?});", RegexOptions.Singleline);

        if (!match.Success)
        {
            throw new Exception("Year diagram data not found in HTML.");
        }

        // Извлекаем содержимое переменной aYearData
        string yearDataJson = match.Groups[1].Value;


        var match1 = Regex.Match(html, @"var aQuarterData\s*=\s*({.*?});", RegexOptions.Singleline);

        if (!match1.Success)
        {
            throw new Exception("Year diagram data not found in HTML.");
        }

        // Извлекаем содержимое переменной aYearData
        string quarDataJson = match1.Groups[1].Value;

        // Десериализуем JSON-объект в C# класс
        var YearData = JsonConvert.DeserializeObject<DiagramData>(yearDataJson);
        var QuarterData = JsonConvert.DeserializeObject<DiagramData>(quarDataJson);

        return new DiagramDataResult { QuarterData= QuarterData, YearData = YearData};
    }


    public FinancialDataService(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task DownloadImages2(string[] tickers)
    {
        string baseUrl = "https://smart-lab.ru/forum/";

        foreach (var ticker in tickers)
        {
            try
            {

                string imageUrl = $"https://finrange.com/storage/companies/logo/svg/MOEX_{ticker}.svg";






                // Загружаем изображение
                var imageBytes = await _httpClient.GetByteArrayAsync(imageUrl);

                // Сохраняем изображение на диск
                var filePath = Path.Combine("C:/log", $"{ticker}.svg");
                await File.WriteAllBytesAsync(filePath, imageBytes);
            }
            catch (Exception e) { 
              Console.WriteLine(ticker);
            }
        }

    }

                public async Task DownloadImages(string[] tickers)
    {
        string baseUrl = "https://smart-lab.ru/forum/";

        foreach (var ticker in tickers)
        {
            try
            {



                // Формируем URL для каждой страницы тикера
                string url = $"{baseUrl}{ticker}";

                // Загружаем HTML-страницу
                var html = await _httpClient.GetStringAsync(url);

                // Парсим HTML с помощью HtmlAgilityPack
                var htmlDoc = new HtmlDocument();
                htmlDoc.LoadHtml(html);

                // Ищем div с нужным классом
                var imageDiv = htmlDoc.DocumentNode.SelectSingleNode("//div[@align='center' and contains(@class, 'logo_place')]//img");

                if (imageDiv != null)
                {
                    // Получаем URL изображения
                    var imageUrl = imageDiv.GetAttributeValue("src", null);
                    if (imageUrl != null)
                    {
                        // Формируем полный URL изображения
                        if (!imageUrl.StartsWith("http"))
                        {
                            imageUrl = "https://smart-lab.ru" + imageUrl;
                        }

                        // Загружаем изображение
                        var imageBytes = await _httpClient.GetByteArrayAsync(imageUrl);

                        // Сохраняем изображение на диск
                        var filePath = Path.Combine("C:/log", $"{ticker}.webp");
                        await File.WriteAllBytesAsync(filePath, imageBytes);

                        Console.WriteLine($"Изображение для {ticker} сохранено по пути: {filePath}");
                    }
                    else
                    {
                        Console.WriteLine($"Не удалось найти URL изображения для {ticker}");
                    }
                }
                else
                {
                    Console.WriteLine($"Не удалось найти div с изображением для {ticker}");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Ошибка при обработке {ticker}: {ex.Message}");
            }
        }
    }

    private List<string> ParseRowCells(HtmlNode row)
    {
        var cells = row.SelectNodes(".//td");
        var result = new List<string>();

        foreach (var cell in cells)
        {
            var anchors = cell.SelectNodes(".//a[@href]");
            if (anchors != null)
            {
                foreach (var anchor in anchors)
                {
                    var hrefValue = anchor.GetAttributeValue("href", string.Empty);
                    if (!string.IsNullOrEmpty(hrefValue))
                    {
                        result.Add(hrefValue);
                    }
                }
            }
            else
            {
                var innerText = cell.InnerText.Trim().Replace("\t", "");
                result.Add(innerText);
            }
        }

        return result;
    }



    public async Task<ShareholdersStructure> FetchSostav(string companyId)
    {
        var url = $"https://smart-lab.ru/q/{companyId}/shareholders/";
        var response = await _httpClient.GetStringAsync(url);
        return ParseHtml(response);
    }


    public List<object> ConvertDiagramToAnonymous(Diagram diagram, string name)
    {
        var res = new List<object>();

        for (int i = 0; i < diagram.Categories.Count; i++)
        {
            string category = diagram.Categories[i];

            
                res.Add(new
                {
                    name = name,
                    year = diagram.Categories[i],
                    value = diagram.Data[i].Y
                });
            
        }

        return res;
    }

    public List<string> GetJsonKeys(string ticker, string otch)
    {
        // Формирование пути к файлу
        string path = $@"C:\stock\8.0\Angular\mat\src\assets\shares\{ticker}\{otch}\y\dic.json";

        if (!File.Exists(path))
        {
            throw new FileNotFoundException($"Файл не найден по пути: {path}");
        }

        // Чтение содержимого JSON-файла
        string jsonString = File.ReadAllText(path);

        // Десериализация JSON-файла в словарь
        var jsonData = JsonConvert.DeserializeObject<Dictionary<string, string>>(jsonString);

        if (jsonData == null)
        {
            throw new Exception("Не удалось десериализовать JSON-файл.");
        }

        // Возврат массива ключей
        return new List<string>(jsonData.Keys);
    }

    public async Task<DiagramDataResult> FetchSostav1(string companyId,string indicator, string otch)
    {

        var url = $"https://smart-lab.ru/q/{companyId}/{otch}/{indicator}/";
        var response = await _httpClient.GetStringAsync(url);
        return  ParseDiagramData(response);
    }



    public async Task<string> FetchRecommendations(string companyId)
    {
        var url = $"https://smart-lab.ru/q/{companyId}/f/y/MSFO";
        var response = await _httpClient.GetStringAsync(url);

        var document = new HtmlDocument();
        document.LoadHtml(response);

        var reasonsUpNodes = document.DocumentNode.SelectNodes("//div[@class='reasons-up']//ul[@class='list-reasons']//li");
        var reasonsDownNodes = document.DocumentNode.SelectNodes("//div[@class='reasons-down']//ul[@class='list-reasons2']//li");

        var reasonsUp = reasonsUpNodes?.Select(node => node.InnerText.Trim()).ToList() ?? new List<string>();
        var reasonsDown = reasonsDownNodes?.Select(node => node.InnerText.Trim()).ToList() ?? new List<string>();

        var result = new { ReasonsUp = reasonsUp, ReasonsDown = reasonsDown };
        return JsonConvert.SerializeObject(result, Formatting.Indented);
    }





    public async Task<List<FinancialReport>> FetchFinancialDataAsync(string companyId, string per = "y", string otch = "MSFO")
    {
        var url = $"https://smart-lab.ru/q/{companyId}/f/{per}/{otch}/";
        var response = await _httpClient.GetStringAsync(url);

        var doc = new HtmlDocument();
        doc.LoadHtml(response);

        var table = doc.DocumentNode.SelectSingleNode("//table");
        if (table == null) return null;

        var headerRow = table.SelectNodes(".//tr").FirstOrDefault(x => x.OuterHtml.Contains("header_row"));
        var rows = table.SelectNodes(".//tr").Where(x => x.OuterHtml.StartsWith("<tr field")).ToArray();

        var years = ParseRowCells(headerRow);

        var reports = new List<FinancialReport>();

        foreach (var row in rows)
        {
            var name = row.Attributes[0].Value;
            if (!name.Contains("smartlab"))
            {
                var caption = row.SelectNodes(".//th").First().InnerText.Trim().Replace("\t", "").Replace("\u00A0", "");
                var values = ParseRowCells(row);

                for (int i = 0; i < years.Count; i++)
                {
                    if (!string.IsNullOrWhiteSpace(years[i]))
                    {
                        reports.Add(new FinancialReport
                        {
                            Year = years[i],
                            Metrics = new Dictionary<string, string> { { name, values[i] } }
                        });
                    }
                }
            }
        }

        SaveFinancialData(reports, companyId, per, otch);
        return reports;
    }

    private void SaveFinancialData(List<FinancialReport> reports, string companyId, string per, string otch)
    {
        string baseDirectory = "c:/zip/";
        string targetDirectory = Path.Combine(baseDirectory, companyId.ToString(), otch, per.ToString());

        Directory.CreateDirectory(targetDirectory);

        string resultFilePath = Path.Combine(targetDirectory, "data.json");
        string dicFilePath = Path.Combine(targetDirectory, "dic.json");

        File.WriteAllText(resultFilePath, JsonConvert.SerializeObject(reports));
        File.WriteAllText(dicFilePath, JsonConvert.SerializeObject(reports.ToDictionary(r => r.Year, r => r.Metrics)));
    }
}
