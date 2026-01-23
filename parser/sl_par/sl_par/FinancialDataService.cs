using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using HtmlAgilityPack;
using Newtonsoft.Json;

/// <summary>
/// Smart-Lab data service for financial tables, diagrams, and shareholders data.
/// </summary>
public class FinancialDataService
{
    private readonly HttpClient _httpClient;

    /// <summary>
    /// Creates a new Smart-Lab data service.
    /// </summary>
    public FinancialDataService(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    /// <summary>
    /// Downloads and parses a financial report table from Smart-Lab.
    /// </summary>
    public async Task<FinancialDataResult> FetchFinancialDataAsync(string companyId, string period = "y", string reportType = "MSFO")
    {
        var url = $"https://smart-lab.ru/q/{companyId}/f/{period}/{reportType}/";
        var response = await _httpClient.GetStringAsync(url);

        var doc = new HtmlDocument();
        doc.LoadHtml(response);

        var recommendations = TryParseRecommendations(doc, out var parsedRecommendations)
            ? parsedRecommendations
            : null;

        var table = doc.DocumentNode.SelectSingleNode("//table");
        if (table == null)
        {
            return new FinancialDataResult
            {
                Recommendations = recommendations
            };
        }

        var rowNodes = table.SelectNodes(".//tr");
        if (rowNodes == null)
        {
            return new FinancialDataResult
            {
                Recommendations = recommendations
            };
        }

        var headerRow = rowNodes.FirstOrDefault(x => x.OuterHtml.Contains("header_row"));
        if (headerRow == null)
        {
            return new FinancialDataResult
            {
                Recommendations = recommendations
            };
        }

        var years = ParseRowCells(headerRow);
        var rows = rowNodes.Where(x => x.OuterHtml.StartsWith("<tr field")).ToArray();

        var values = new List<FinancialMetricValue>();
        var captions = new Dictionary<string, string>();

        foreach (var row in rows)
        {
            var name = row.Attributes[0].Value;
            if (name.Contains("smartlab"))
            {
                continue;
            }

            var caption = row.SelectNodes(".//th")?.FirstOrDefault()?.InnerText
                .Trim()
                .Replace("\t", "")
                .Replace("\u00A0", "");
            if (!string.IsNullOrWhiteSpace(caption))
            {
                captions[name] = caption;
            }

            var rowValues = ParseRowCells(row);

            for (int i = 0; i < years.Count && i < rowValues.Count; i++)
            {
                var year = years[i].Trim().Replace("\t", "").Replace("\u00A0", "").Replace("&nbsp;", "");
                if (string.IsNullOrWhiteSpace(year))
                {
                    continue;
                }

                values.Add(new FinancialMetricValue
                {
                    Name = name,
                    Year = year,
                    Value = rowValues[i]
                });
            }
        }

        return new FinancialDataResult(values, captions)
        {
            Recommendations = recommendations
        };
    }

    /// <summary>
    /// Writes financial data to the standard output folder structure.
    /// </summary>
    public void SaveFinancialData(FinancialDataResult result, string companyId, string period, string reportType, string outputRoot)
    {
        var targetDirectory = Path.Combine(outputRoot, companyId, reportType, period);
        Directory.CreateDirectory(targetDirectory);

        var resultFilePath = Path.Combine(targetDirectory, "data.json");
        var dicFilePath = Path.Combine(targetDirectory, "dic.json");

        File.WriteAllText(resultFilePath, JsonConvert.SerializeObject(result.Values, Formatting.Indented));
        File.WriteAllText(dicFilePath, JsonConvert.SerializeObject(result.Captions, Formatting.Indented));

        if (result.Recommendations != null)
        {
            var recommendationsPath = Path.Combine(outputRoot, companyId, "recomendation.json");
            Directory.CreateDirectory(Path.Combine(outputRoot, companyId));
            File.WriteAllText(recommendationsPath, JsonConvert.SerializeObject(result.Recommendations, Formatting.Indented));
        }
    }

    /// <summary>
    /// Downloads CSV export for the financial report table and saves it alongside JSON files.
    /// </summary>
    public async Task DownloadFinancialCsvAsync(string companyId, string period, string reportType, string outputRoot)
    {
        var targetDirectory = Path.Combine(outputRoot, companyId, reportType, period);
        Directory.CreateDirectory(targetDirectory);

        var url = $"https://smart-lab.ru/q/{companyId}/f/{period}/{reportType}/download/";
        using var response = await _httpClient.GetAsync(url);
        response.EnsureSuccessStatusCode();

        var csvBytes = await response.Content.ReadAsByteArrayAsync();
        var csvPath = Path.Combine(targetDirectory, "data.csv");
        await File.WriteAllBytesAsync(csvPath, csvBytes);
    }

    /// <summary>
    /// Downloads report links from the Smart-Lab financial reports page.
    /// </summary>
    public async Task<IReadOnlyList<ReportLinksSection>> FetchReportLinksAsync(string companyId)
    {
        var url = $"https://smart-lab.ru/q/{companyId}/f/l/";
        var response = await _httpClient.GetStringAsync(url);
        return ParseReportLinksHtml(response, url);
    }

    /// <summary>
    /// Writes report links into CSV files grouped by section.
    /// </summary>
    public void SaveReportLinksCsv(IEnumerable<ReportLinksSection> sections, string companyId, string outputRoot)
    {
        if (sections == null)
        {
            return;
        }

        var rootDirectory = Path.Combine(outputRoot, companyId, "report_links");
        Directory.CreateDirectory(rootDirectory);

        foreach (var section in sections)
        {
            if (section == null)
            {
                continue;
            }

            var title = section.Title?.Trim();
            if (string.IsNullOrWhiteSpace(title))
            {
                title = "section";
            }

            var folderName = SanitizePathSegment(title);
            if (string.IsNullOrWhiteSpace(folderName))
            {
                folderName = "section";
            }

            var targetDirectory = Path.Combine(rootDirectory, folderName);
            Directory.CreateDirectory(targetDirectory);

            var csvPath = Path.Combine(targetDirectory, "links.csv");
            File.WriteAllText(csvPath, BuildReportLinksCsv(section.Links));
        }
    }

    /// <summary>
    /// Downloads and parses the shareholders structure page.
    /// </summary>
    public async Task<ShareholdersStructure> FetchShareholdersAsync(string companyId)
    {
        var url = $"https://smart-lab.ru/q/{companyId}/shareholders/";
        var response = await _httpClient.GetStringAsync(url);
        return ParseShareholdersHtml(response);
    }

    /// <summary>
    /// Downloads and parses Finam dividends page for a ticker.
    /// </summary>
    public async Task<FinamDividendsPage> FetchFinamDividendsAsync(string ticker)
    {
        var normalizedTicker = ticker?.Trim().ToLowerInvariant() ?? string.Empty;
        var url = $"https://www.finam.ru/quote/moex/{normalizedTicker}/dividends/";

        using var request = new HttpRequestMessage(HttpMethod.Get, url);
        request.Headers.TryAddWithoutValidation(
            "User-Agent",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36");

        using var response = await _httpClient.SendAsync(request);
        response.EnsureSuccessStatusCode();

        var html = await response.Content.ReadAsStringAsync();

        var parser = new FinamDividendsParser();
        if (!parser.TryParseHtml(html, normalizedTicker, out var page, out var error))
        {
            throw new Exception(error);
        }

        return page;
    }

    /// <summary>
    /// Downloads and parses year/quarter diagram data for an indicator.
    /// </summary>
    public async Task<DiagramDataResult> FetchDiagramDataAsync(string companyId, string indicator, string reportType)
    {
        var url = $"https://smart-lab.ru/q/{companyId}/{reportType}/{indicator}/";
        var response = await _httpClient.GetStringAsync(url);
        return ParseDiagramData(response);
    }

    /// <summary>
    /// Converts diagram data to a list of points for JSON output.
    /// </summary>
    public IReadOnlyList<DiagramMetricValue> ConvertDiagramToPoints(Diagram diagram, string name)
    {
        var points = new List<DiagramMetricValue>();
        if (diagram?.Categories == null || diagram.Data == null)
        {
            return points;
        }

        for (int i = 0; i < diagram.Categories.Count && i < diagram.Data.Count; i++)
        {
            points.Add(new DiagramMetricValue
            {
                Name = name,
                Year = diagram.Categories[i],
                Value = diagram.Data[i].Y
            });
        }

        return points;
    }

    /// <summary>
    /// Downloads company logos in WebP format from Smart-Lab pages.
    /// </summary>
    public async Task DownloadLogoWebpAsync(IEnumerable<string> tickers, string outputDirectory)
    {
        Directory.CreateDirectory(outputDirectory);
        string baseUrl = "https://smart-lab.ru/forum/";

        foreach (var ticker in tickers)
        {
            try
            {
                var html = await _httpClient.GetStringAsync($"{baseUrl}{ticker}");
                var htmlDoc = new HtmlDocument();
                htmlDoc.LoadHtml(html);

                var imageDiv = htmlDoc.DocumentNode.SelectSingleNode("//div[@align='center' and contains(@class, 'logo_place')]//img");
                var imageUrl = imageDiv?.GetAttributeValue("src", null);

                if (string.IsNullOrWhiteSpace(imageUrl))
                {
                    Console.WriteLine($"Не удалось найти изображение для {ticker}");
                    continue;
                }

                if (!imageUrl.StartsWith("http", StringComparison.OrdinalIgnoreCase))
                {
                    imageUrl = "https://smart-lab.ru" + imageUrl;
                }

                var imageBytes = await _httpClient.GetByteArrayAsync(imageUrl);
                var filePath = Path.Combine(outputDirectory, $"{ticker}.webp");
                await File.WriteAllBytesAsync(filePath, imageBytes);

                Console.WriteLine($"Изображение для {ticker} сохранено: {filePath}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Ошибка при обработке {ticker}: {ex.Message}");
            }
        }
    }

    /// <summary>
    /// Downloads company logos in SVG format from Finrange.
    /// </summary>
    public async Task DownloadLogoSvgAsync(IEnumerable<string> tickers, string outputDirectory)
    {
        Directory.CreateDirectory(outputDirectory);

        foreach (var ticker in tickers)
        {
            try
            {
                string imageUrl = $"https://finrange.com/storage/companies/logo/svg/MOEX_{ticker}.svg";
                var imageBytes = await _httpClient.GetByteArrayAsync(imageUrl);
                var filePath = Path.Combine(outputDirectory, $"{ticker}.svg");
                await File.WriteAllBytesAsync(filePath, imageBytes);
            }
            catch
            {
                Console.WriteLine(ticker);
            }
        }
    }

    private static ShareholdersStructure ParseShareholdersHtml(string html)
    {
        var structure = new ShareholdersStructure();

        var titleMatch = Regex.Match(html, @"title:\s*'(.*?)'");
        if (titleMatch.Success)
        {
            structure.Title = titleMatch.Groups[1].Value;
        }

        var shareholdersMatch = Regex.Match(
            html,
            @"var\s+aShareholders\s*=\s*(\[\[.*?\]\]);",
            RegexOptions.Singleline);
        if (shareholdersMatch.Success)
        {
            var shareholdersArray = Regex.Unescape(shareholdersMatch.Groups[1].Value);
            var dataMatches = Regex.Matches(shareholdersArray, @"\[(.*?)\]");

            for (int i = 1; i < dataMatches.Count; i++)
            {
                var shareholderData = dataMatches[i].Groups[1].Value;
                var parts = shareholderData.Replace("\"", "").Split(',');

                if (parts.Length == 2)
                {
                    var name = parts[0].Trim();
                    var valueText = parts[1].Trim();

                    if (double.TryParse(valueText, NumberStyles.Float, CultureInfo.InvariantCulture, out double percentage) ||
                        double.TryParse(valueText, NumberStyles.Float, CultureInfo.CurrentCulture, out percentage))
                    {
                        structure.Shareholders.Add(new Shareholder
                        {
                            Name = name,
                            SharePercentage = percentage
                        });
                    }
                }
            }
        }

        var dateMatch = Regex.Match(html, @"Дата последнего обновления этой структуры:\s*(\d{2}\.\d{2}\.\d{4})");
        if (dateMatch.Success)
        {
            structure.LastUpdateDate = DateTime.ParseExact(dateMatch.Groups[1].Value, "dd.MM.yyyy", CultureInfo.InvariantCulture);
        }

        return structure;
    }

    private static DiagramDataResult ParseDiagramData(string html)
    {
        var yearMatch = Regex.Match(html, @"var aYearData\s*=\s*({.*?});", RegexOptions.Singleline);
        if (!yearMatch.Success)
        {
            throw new Exception("Year diagram data not found in HTML.");
        }

        var quarterMatch = Regex.Match(html, @"var aQuarterData\s*=\s*({.*?});", RegexOptions.Singleline);
        if (!quarterMatch.Success)
        {
            throw new Exception("Quarter diagram data not found in HTML.");
        }

        var yearData = JsonConvert.DeserializeObject<DiagramData>(yearMatch.Groups[1].Value);
        var quarterData = JsonConvert.DeserializeObject<DiagramData>(quarterMatch.Groups[1].Value);

        return new DiagramDataResult { QuarterData = quarterData, YearData = yearData };
    }

    private static List<string> ParseRowCells(HtmlNode row)
    {
        var cells = row.SelectNodes(".//th|.//td");
        var result = new List<string>();

        if (cells == null)
        {
            return result;
        }

        foreach (var cell in cells)
        {
            var anchors = cell.SelectNodes(".//a[@href]");
            var foundLinks = false;

            if (anchors != null)
            {
                foreach (var anchor in anchors)
                {
                    var hrefValue = anchor.GetAttributeValue("href", string.Empty);
                    if (!string.IsNullOrEmpty(hrefValue))
                    {
                        result.Add(hrefValue);
                        foundLinks = true;
                    }
                }
            }

            if (!foundLinks)
            {
                var innerText = cell.InnerText.Trim().Replace("\t", "");
                result.Add(innerText);
            }
        }

        return result;
    }

    private static IReadOnlyList<ReportLinksSection> ParseReportLinksHtml(string html, string baseUrl)
    {
        var document = new HtmlDocument();
        document.LoadHtml(html);

        var columns = document.DocumentNode.SelectNodes("//div[contains(@class, 'externals_col')]");
        if (columns == null)
        {
            return Array.Empty<ReportLinksSection>();
        }

        var sections = new Dictionary<string, ReportLinksSection>(StringComparer.OrdinalIgnoreCase);
        var unnamedIndex = 1;

        foreach (var column in columns)
        {
            var headingNode = column.SelectSingleNode(".//h2") ?? column.SelectSingleNode(".//h3");
            var title = HtmlEntity.DeEntitize(headingNode?.InnerText ?? string.Empty).Trim();
            if (string.IsNullOrWhiteSpace(title))
            {
                title = $"section_{unnamedIndex++}";
            }

            if (!sections.TryGetValue(title, out var section))
            {
                section = new ReportLinksSection { Title = title };
                sections[title] = section;
            }

            var anchors = column.SelectNodes(".//table//a[@href]");
            if (anchors == null)
            {
                continue;
            }

            foreach (var anchor in anchors)
            {
                var href = HtmlEntity.DeEntitize(anchor.GetAttributeValue("href", string.Empty)).Trim();
                if (string.IsNullOrWhiteSpace(href))
                {
                    continue;
                }

                var label = HtmlEntity.DeEntitize(anchor.InnerText ?? string.Empty).Trim();
                if (string.IsNullOrWhiteSpace(label))
                {
                    label = HtmlEntity.DeEntitize(anchor.ParentNode?.InnerText ?? string.Empty).Trim();
                }

                var url = NormalizeUrl(href, baseUrl);
                section.Links.Add(new ReportLinkEntry
                {
                    Label = label,
                    Url = url
                });
            }
        }

        return sections.Values.ToList();
    }

    private static string NormalizeUrl(string href, string baseUrl)
    {
        if (Uri.TryCreate(href, UriKind.Absolute, out var absolute))
        {
            return absolute.ToString();
        }

        if (Uri.TryCreate(new Uri(baseUrl), href, out var combined))
        {
            return combined.ToString();
        }

        return href;
    }

    private static string SanitizePathSegment(string value)
    {
        var invalidChars = Path.GetInvalidFileNameChars();
        var cleaned = new string(value.Select(ch => invalidChars.Contains(ch) ? '_' : ch).ToArray());
        cleaned = Regex.Replace(cleaned, @"\s+", " ").Trim().TrimEnd('.');
        return cleaned;
    }

    private static string BuildReportLinksCsv(IReadOnlyList<ReportLinkEntry>? links)
    {
        var builder = new StringBuilder();
        builder.AppendLine("label,url");

        if (links == null)
        {
            return builder.ToString();
        }

        foreach (var link in links)
        {
            builder.Append(EscapeCsv(link?.Label ?? string.Empty));
            builder.Append(',');
            builder.AppendLine(EscapeCsv(link?.Url ?? string.Empty));
        }

        return builder.ToString();
    }

    private static string EscapeCsv(string value)
    {
        if (string.IsNullOrEmpty(value))
        {
            return string.Empty;
        }

        var escaped = value.Replace("\"", "\"\"");
        var needsQuotes = escaped.Contains(',') || escaped.Contains('"') || escaped.Contains('\n') || escaped.Contains('\r');
        return needsQuotes ? $"\"{escaped}\"" : escaped;
    }

    private static bool TryParseRecommendations(HtmlDocument document, out Recommendations? recommendations)
    {
        var reasonsUpContainer = document.DocumentNode.SelectSingleNode("//div[contains(@class, 'reasons-up')]");
        var reasonsDownContainer = document.DocumentNode.SelectSingleNode("//div[contains(@class, 'reasons-down')]");

        if (reasonsUpContainer == null && reasonsDownContainer == null)
        {
            recommendations = null;
            return false;
        }

        var reasonsUpNodes = reasonsUpContainer?.SelectNodes(".//ul[contains(@class, 'list-reasons')]//li");
        var reasonsDownNodes = reasonsDownContainer?.SelectNodes(".//ul[contains(@class, 'list-reasons2')]//li");

        recommendations = new Recommendations
        {
            ReasonsUp = reasonsUpNodes?.Select(node => node.InnerText.Trim()).ToList() ?? new List<string>(),
            ReasonsDown = reasonsDownNodes?.Select(node => node.InnerText.Trim()).ToList() ?? new List<string>()
        };

        return true;
    }
}
