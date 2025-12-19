using Microsoft.AspNetCore.Mvc;
using StockChart.Repository;
using System.Globalization;
using System.IO.Compression;
using System.Text;
using static StockProcContext;

[ApiController]
[Route("api/[controller]")]
public class FeedController : Controller
{
    private readonly StockProcContext _dbContext;
    private readonly ITickersRepository _tikrep;
    private readonly ILogger<FeedController> _logger;

    public FeedController(StockProcContext dbContext, ITickersRepository tikrep, ILogger<FeedController> logger)
    {
        _dbContext = dbContext;
        _tikrep = tikrep;
        _logger = logger;
    }

    private async Task<IEnumerable<tickersResult>> GetTickerDataAsync(string ticker, string date)
    {
        if (!DateTime.TryParse(date, out var startDateTime))
        {
            throw new ArgumentException("Invalid date format", nameof(date));
        }

        var endDateTime = startDateTime.AddDays(1);
        return await _dbContext.tickersAsync(ticker, startDateTime, endDateTime);
    }


    private string BuildCsvContent(IEnumerable<tickersResult> data, string dateFormat = null, bool appendSemicolonAtEnd = false)
    {
        var csvLines = data.Select(v =>
        {
            var tradeDate = dateFormat != null ? v.TradeDate.ToString(dateFormat) : v.TradeDate.ToString();
            return $"{v.Number};{tradeDate};{v.Price.ToString(CultureInfo.InvariantCulture)};" +
                   $"{v.Quantity};{v.Direction};{v.Volume};{v.OI};{v.TradeDate.Millisecond}";
        });

        var csvContent = string.Join(";\n", csvLines);
        if (appendSemicolonAtEnd)
        {
            csvContent += ";\n";
        }

        return csvContent;
    }

    private FileContentResult CreateFileResult(string content, string contentType, string fileName)
    {
        var bytes = Encoding.ASCII.GetBytes(content);
        return File(bytes, contentType, fileName);
    }

    private FileContentResult CreateZippedFileResult(string content, string fileName)
    {
        var bytes = Encoding.ASCII.GetBytes(content);
        using var outputStream = new MemoryStream();
        using (var gzip = new GZipStream(outputStream, CompressionMode.Compress, true))
        {
            gzip.Write(bytes, 0, bytes.Length);
        }
        return File(outputStream.ToArray(), "application/gzip", fileName);
    }

    private void LogRequest(string ticker, string date)
    {
        _logger.LogInformation("Ticker: {Ticker}, Date: {Date}, Time: {Time}", ticker ?? "null", date ?? "", DateTime.Now);
    }

    private string GenerateFileName(string ticker, string date)
    {
        return $"{ticker}_{DateTime.Parse(date):yyyyMMdd}.csv";
    }

    [HttpGet("GetCSV")]
    [DateAccessFilter(DateParameterName = "date")]
    [DbDownload]
    public async Task<FileContentResult> GetCSV(string ticker, string date)
    {
        LogRequest(ticker, date);

        var data = await GetTickerDataAsync(ticker, date);
        var dateFormat = "yyyy-MM-ddTHH:mm:ss.fff"; // Include milliseconds
        var csvContent = BuildCsvContent(data, dateFormat);
        var fileName = GenerateFileName(ticker, date);

        return CreateFileResult(csvContent, "text/plain", fileName);
    }

    [HttpGet("GetCSVZIP")]
    [DateAccessFilter(DateParameterName = "date")]
    [DbDownload]
    public async Task<FileContentResult> GetCSVZIP(string ticker, string date)
    {
        LogRequest(ticker, date);

        var data = await GetTickerDataAsync(ticker, date);
        var csvContent = BuildCsvContent(data);
        var fileName = GenerateFileName(ticker, date) + ".zip";

        return CreateZippedFileResult(csvContent, fileName);
    }

    [HttpGet("ticks/{ticker}/{date}")]
    [DbDownload]
    [DateAccessFilter(DateParameterName = "date")]
    public async Task<FileContentResult> Ticks(string ticker, string date)
    {
        LogRequest(ticker, date);

        var data = await GetTickerDataAsync(ticker, date);
        var csvContent = BuildCsvContent(data, "yyyy-MM-ddTHH:mm:ss");
        var fileName = GenerateFileName(ticker, date);

        return CreateFileResult(csvContent, "text/plain", fileName);
    }

    [HttpGet("MX")]
    [DateAccessFilter(DateParameterName = "date")]
    [DbDownload]
    public async Task<FileContentResult> MX(string ticker, string date)
    {
        var data = await GetTickerDataAsync(ticker, date);
        var csvContent = BuildCsvContent(data, "yyyy-MM-ddTHH:mm:ss", appendSemicolonAtEnd: true);
        var fileName = GenerateFileName(ticker, date);

        return CreateFileResult(csvContent, "text/plain", fileName);
    }

    private string fileNameFromDate(string ticker, DateTime date)
    {
        return $"{ticker}_{date:yyyyMMdd}.csv";
    }

    [HttpGet]
    [Route("GetDates")]
    [DbDownload]
    public async Task<object> GetDates(string ticker)
    {
        var dates = await _dbContext.tickersdatesAsync(ticker);
        var res = dates.Select(c => new
        {
            text = fileNameFromDate(ticker, c.period),
            url = $"/feed/GetCSV?ticker={ticker}&date={c.period:dd.MM.yyyy}"
        }).ToList();
        return res;
    }

    [HttpGet("dates/{ticker}")]
    [DbDownload]

    public async Task<object> GetTicksDates(string ticker)
    {
        var dates = await _dbContext.tickersdatesAsync(ticker);
        var res = dates.Select(c => new
        {
            text = fileNameFromDate(ticker, c.period),
            url = $"/feed/ticks/{ticker}/{c.period:dd.MM.yyyy}"
        }).ToList();
        return res;
    }

}
