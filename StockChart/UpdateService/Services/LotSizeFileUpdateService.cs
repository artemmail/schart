using System.Globalization;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using StockChart.Model;

namespace StockChart.UpdateService.Services;

public sealed class LotSizeFileUpdateService
{
    private readonly IDbContextFactory<ApplicationDbContext> _contextFactory;
    private readonly ILogger<LotSizeFileUpdateService> _logger;
    private readonly LotSizeFileOptions _options;

    public LotSizeFileUpdateService(
        IDbContextFactory<ApplicationDbContext> contextFactory,
        IOptions<LotSizeFileOptions> options,
        ILogger<LotSizeFileUpdateService> logger)
    {
        _contextFactory = contextFactory;
        _logger = logger;
        _options = options.Value;
    }

    public async Task UpdateDataAsync(CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(_options.FolderPath))
        {
            _logger.LogWarning("LotSize update folder path is empty.");
            return;
        }

        if (!Directory.Exists(_options.FolderPath))
        {
            _logger.LogWarning("LotSize update folder not found: {Path}", _options.FolderPath);
            return;
        }

        var filePattern = string.IsNullOrWhiteSpace(_options.FilePattern) ? "*lot_size.txt" : _options.FilePattern;
        var files = Directory.GetFiles(_options.FolderPath, filePattern);
        if (files.Length == 0)
        {
            return;
        }

        var latestFile = files.OrderByDescending(x => x).First();

        try
        {
            await LoadAsync(latestFile, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "LotSize update failed for file {File}", latestFile);
        }

        foreach (var file in files)
        {
            try
            {
                File.Delete(file);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to delete lot size file {File}", file);
            }
        }
    }

    private DateTime ConvertToDate(int dateInt)
    {
        var year = dateInt / 10000;
        var month = (dateInt / 100) % 100;
        var day = dateInt % 100;

        return new DateTime(year, month, day);
    }

    private bool IsValidDate(int dateInt)
    {
        var year = dateInt / 10000;
        var month = (dateInt / 100) % 100;
        var day = dateInt % 100;

        if (year < 2000 || year > 2040)
        {
            return false;
        }

        if (month < 1 || month > 12)
        {
            return false;
        }

        if (day < 1 || day > 31)
        {
            return false;
        }

        try
        {
            _ = new DateTime(year, month, day);
            return true;
        }
        catch
        {
            return false;
        }
    }

    private async Task LoadAsync(string fileName, CancellationToken cancellationToken)
    {
        var quickDict = LoadDictionary(fileName);
        var updatedList = new List<Dictionary>();

        await using var dbContext = await _contextFactory.CreateDbContextAsync(cancellationToken);
        var dictionaries = await dbContext.Dictionaries.ToArrayAsync(cancellationToken);
        var classes = await dbContext.Classes.ToDictionaryAsync(x => x.Name, x => x, cancellationToken);

        foreach (var dict in dictionaries)
        {
            if (!quickDict.TryGetValue(dict.Securityid, out var lotInfo))
            {
                continue;
            }

            dict.Minstep = lotInfo.MinPriceStep;
            dict.ClassName = lotInfo.ClassCode;
            dict.Shortname = lotInfo.ShortName;
            dict.Fullname = lotInfo.Name;
            dict.Scale = lotInfo.Scale;
            dict.Currency = lotInfo.FaceUnit;
            dict.Isin = lotInfo.IsinCode;

            if (IsValidDate(lotInfo.MatDate))
            {
                dict.ToDate = ConvertToDate(lotInfo.MatDate);
            }

            dict.Lotsize = lotInfo.LotSize;

            if (classes.TryGetValue(dict.ClassName, out var classInfo))
            {
                dict.ClassId = classInfo.Id;
            }

            updatedList.Add(dict);
        }

        if (updatedList.Count == 0)
        {
            return;
        }

        dbContext.UpdateRange(updatedList);
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private Dictionary<string, QuickDictionary> LoadDictionary(string fileName)
    {
        Encoding.RegisterProvider(CodePagesEncodingProvider.Instance);
        var encoding = Encoding.GetEncoding(1251);

        var lines = File.ReadAllLines(fileName, encoding)
            .Skip(1)
            .Where(line => !line.Contains("face_value"))
            .ToArray();

        return lines
            .Select(line => new QuickDictionary(line.Split(';')))
            .Where(IsValidQuickDictionary)
            .ToDictionary(x => x.Code, x => x);
    }

    private bool IsValidQuickDictionary(QuickDictionary qd)
    {
        if (qd.Code.Contains(".US") || qd.Code.Contains(".SPB"))
        {
            return false;
        }

        var invalidClassCodes = new[] { "RTSIDX", "EQRP_INFO", "SMAL", "SBPND", "BEST" };
        if (invalidClassCodes.Any(code => qd.ClassCode.Contains(code)))
        {
            return false;
        }

        if (qd.ClassName.Contains("SPB:") || qd.ClassName.Contains("Повышенный инвестиционный"))
        {
            return false;
        }

        if (qd.ClassCode.Length == 4 && "YED".Contains(qd.ClassCode.Last()))
        {
            return false;
        }

        return true;
    }

    private sealed class QuickDictionary
    {
        public string Code { get; }
        public string Name { get; }
        public string ShortName { get; }
        public string ClassCode { get; }
        public string ClassName { get; }
        public decimal FaceValue { get; }
        public string FaceUnit { get; }
        public int Scale { get; }
        public int MatDate { get; }
        public string IsinCode { get; }
        public int LotSize { get; }
        public decimal MinPriceStep { get; }

        public QuickDictionary(string[] values)
        {
            if (values == null || values.Length < 12)
            {
                throw new ArgumentException("Input array must have at least 12 elements", nameof(values));
            }

            Code = values[0];
            Name = values[1];
            ShortName = values[2];
            ClassCode = values[3];
            ClassName = values[4];
            FaceValue = decimal.Parse(values[5], CultureInfo.InvariantCulture);
            FaceUnit = values[6];
            Scale = int.Parse(values[7], CultureInfo.InvariantCulture);
            MatDate = int.Parse(values[8], CultureInfo.InvariantCulture);
            IsinCode = values[9];
            LotSize = (int)decimal.Parse(values[10], CultureInfo.InvariantCulture);
            MinPriceStep = decimal.Parse(values[11], CultureInfo.InvariantCulture);
        }
    }
}
