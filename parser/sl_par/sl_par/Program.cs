
using Newtonsoft.Json;
using System.ComponentModel.Design;
using System.Runtime.ConstrainedExecution;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;



var parseResult = CliParser.Parse(args);

if (parseResult.Error != null)
{
    Console.WriteLine(parseResult.Error);
    CliHelp.Print(parseResult.Options?.Mode);
    return;
}

if (parseResult.ShowHelp || parseResult.Options == null)
{
    CliHelp.Print(parseResult.Options?.Mode);
    return;
}

var options = parseResult.Options;
ApplyDefaults(options);

using var httpClient = new HttpClient();
var service = new FinancialDataService(httpClient);

switch (options.Mode)
{
    case AppMode.Financial:
        await RunFinancialAsync(service, options);
        break;
    case AppMode.ReportLinks:
        await RunReportLinksAsync(service, options);
        break;
    case AppMode.Diagrams:
        await RunDiagramsAsync(service, options);
        break;
    case AppMode.Shareholders:
        await RunShareholdersAsync(service, options);
        break;
    case AppMode.Logos:
        await RunLogosAsync(service, options);
        break;
    case AppMode.Finam:
        RunFinam(options);
        break;
    case AppMode.Dividends:
        await RunDividendsAsync(service, options);
        break;
}

static void ApplyDefaults(CliOptions options)
{
    var useAllTickers = options.Tickers.Count == 0 ||
                        options.Tickers.Any(t => t.Equals("all", StringComparison.OrdinalIgnoreCase) || t == "*");

    if (useAllTickers)
    {
        options.Tickers.Clear();
        options.Tickers.AddRange(DefaultTickers.Items);
    }

    var normalized = options.Tickers
        .Select(t => t.Trim())
        .Where(t => !string.IsNullOrWhiteSpace(t))
        .Select(t => t.ToUpperInvariant())
        .Distinct(StringComparer.OrdinalIgnoreCase)
        .ToList();

    options.Tickers.Clear();
    options.Tickers.AddRange(normalized);

    if (options.Periods.Count == 0 && options.Mode == AppMode.Financial)
    {
        options.Periods.AddRange(new[] { "y", "q" });
    }

    if (options.ReportTypes.Count == 0)
    {
        switch (options.Mode)
        {
            case AppMode.Financial:
                options.ReportTypes.AddRange(new[] { "MSFO", "RSBU" });
                break;
            case AppMode.Diagrams:
                options.ReportTypes.Add("RSBU");
                break;
        }
    }
}

static async Task RunFinancialAsync(FinancialDataService service, CliOptions options)
{
    foreach (var ticker in options.Tickers)
    {
        foreach (var reportType in options.ReportTypes)
        {
            foreach (var period in options.Periods)
            {
                var result = await service.FetchFinancialDataAsync(ticker, period, reportType);
                service.SaveFinancialData(result, ticker, period, reportType, options.OutputRoot);

                if (ShouldDownloadFinancialCsv(reportType, period))
                {
                    try
                    {
                        await service.DownloadFinancialCsvAsync(ticker, period, reportType, options.OutputRoot);
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Ошибка скачивания CSV для {ticker} {reportType} {period}: {ex.Message}");
                    }
                }
                await Task.Delay(options.SleepMs);
            }
        }

        try
        {
            await DownloadReportLinksAsync(service, options, ticker);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Ошибка скачивания ссылок на отчетность для {ticker}: {ex.Message}");
        }

        await Task.Delay(options.SleepMs);
    }
}

static bool ShouldDownloadFinancialCsv(string reportType, string period)
{
    if (string.IsNullOrWhiteSpace(reportType) || string.IsNullOrWhiteSpace(period))
    {
        return false;
    }

    var isReport = reportType.Equals("MSFO", StringComparison.OrdinalIgnoreCase) ||
                   reportType.Equals("RSBU", StringComparison.OrdinalIgnoreCase);
    var isPeriod = period.Equals("y", StringComparison.OrdinalIgnoreCase) ||
                   period.Equals("q", StringComparison.OrdinalIgnoreCase);
    return isReport && isPeriod;
}

static async Task RunReportLinksAsync(FinancialDataService service, CliOptions options)
{
    foreach (var ticker in options.Tickers)
    {
        try
        {
            await DownloadReportLinksAsync(service, options, ticker);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Ошибка скачивания ссылок на отчетность для {ticker}: {ex.Message}");
        }

        await Task.Delay(options.SleepMs);
    }
}

static async Task DownloadReportLinksAsync(FinancialDataService service, CliOptions options, string ticker)
{
    var sections = await service.FetchReportLinksAsync(ticker);
    service.SaveReportLinksCsv(sections, ticker, options.OutputRoot);
}

static async Task RunDiagramsAsync(FinancialDataService service, CliOptions options)
{
    var reportType = options.ReportTypes.First();

    foreach (var ticker in options.Tickers)
    {
        IReadOnlyList<string> indicators;
        try
        {
            indicators = options.Indicators.Count > 0
                ? options.Indicators
                : IndicatorDictionaryReader.ReadKeys(options.DictionaryRoot, ticker, reportType, options.DictionaryPeriod);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Ошибка чтения dic.json для {ticker}: {ex.Message}");
            continue;
        }

        var yearPoints = new List<DiagramMetricValue>();
        var quarterPoints = new List<DiagramMetricValue>();
        var errors = new List<string>();

        foreach (var indicator in indicators)
        {
            try
            {
                var parsed = await service.FetchDiagramDataAsync(ticker, indicator, reportType);
                yearPoints.AddRange(service.ConvertDiagramToPoints(parsed.YearData.Diagram, indicator));
                quarterPoints.AddRange(service.ConvertDiagramToPoints(parsed.QuarterData.Diagram, indicator));
            }
            catch
            {
                errors.Add(indicator);
            }

            await Task.Delay(options.SleepMs);
        }

        var yearDirectory = Path.Combine(options.OutputRoot, ticker, reportType, "y");
        var quarterDirectory = Path.Combine(options.OutputRoot, ticker, reportType, "q");

        WriteJson(Path.Combine(yearDirectory, "data.json"), yearPoints);
        WriteJson(Path.Combine(yearDirectory, "non.json"), errors);
        WriteJson(Path.Combine(quarterDirectory, "data.json"), quarterPoints);
        WriteJson(Path.Combine(quarterDirectory, "non.json"), errors);
    }
}

static async Task RunShareholdersAsync(FinancialDataService service, CliOptions options)
{
    foreach (var ticker in options.Tickers)
    {
        try
        {
            var data = await service.FetchShareholdersAsync(ticker);
            var outputPath = Path.Combine(options.OutputRoot, ticker, "shareholders.json");
            WriteJson(outputPath, data);
            await Task.Delay(options.SleepMs);
        }
        catch (Exception e)
        {

        }
    }
}

static async Task RunLogosAsync(FinancialDataService service, CliOptions options)
{
    if (options.LogoFormat == LogoFormat.Svg)
    {
        await service.DownloadLogoSvgAsync(options.Tickers, options.LogosOutputDir);
        return;
    }

    await service.DownloadLogoWebpAsync(options.Tickers, options.LogosOutputDir);
}

static void RunFinam(CliOptions options)
{
    var parser = new FinamBatchParser();
    var result = parser.Run(options.FinamInputDir, options.FinamOutputDir, options.FinamLegendPath, options.FinamTableIndex);

    Console.WriteLine($"Обработано файлов: {result.ProcessedCount}");
    if (result.FailedFiles.Count > 0)
    {
        Console.WriteLine("Ошибки:");
        foreach (var failure in result.FailedFiles)
        {
            Console.WriteLine($"  {failure}");
        }
    }
}

static async Task RunDividendsAsync(FinancialDataService service, CliOptions options)
{
    var errors = new List<string>();

    foreach (var ticker in options.Tickers)
    {
        try
        {
            var page = await service.FetchFinamDividendsAsync(ticker);
            var outputPath = Path.Combine(options.OutputRoot, ticker, "dividends.json");
            WriteJson(outputPath, page);
        }
        catch (Exception ex)
        {
            errors.Add($"{ticker}: {ex.Message}");
        }

        await Task.Delay(options.SleepMs);
    }

    if (errors.Count > 0)
    {
        Console.WriteLine("Ошибки:");
        foreach (var error in errors)
        {
            Console.WriteLine($"  {error}");
        }
    }
}

static void WriteJson(string path, object data)
{
    var directory = Path.GetDirectoryName(path);
    if (!string.IsNullOrWhiteSpace(directory))
    {
        Directory.CreateDirectory(directory);
    }

    File.WriteAllText(path, JsonConvert.SerializeObject(data, Formatting.Indented));
}
