using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace StockChart.Repository.Services;

public sealed class YooMoneyTokenConfigStoreMain
{
    private const string TokenDumpFileName = "yoomoney-token.txt";
    private const string TokenDumpInfoFileName = "yoomoney-token-info.json";

    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<YooMoneyTokenConfigStoreMain> _logger;

    public YooMoneyTokenConfigStoreMain(
        IWebHostEnvironment environment,
        ILogger<YooMoneyTokenConfigStoreMain> logger)
    {
        _environment = environment;
        _logger = logger;
    }

    public async Task SaveBearerAsync(string bearer, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(bearer))
        {
            throw new ArgumentException("YooMoney bearer token is empty.", nameof(bearer));
        }

        foreach (var path in GetCandidatePaths().Distinct(StringComparer.OrdinalIgnoreCase))
        {
            if (!File.Exists(path))
            {
                _logger.LogWarning("Skip YooMoney token save: config file not found at {Path}", path);
                continue;
            }

            var tokenChanged = await SaveBearerToFileAsync(path, bearer, cancellationToken);
            var directoryPath = Path.GetDirectoryName(path) ?? _environment.ContentRootPath;
            var tokenDumpPath = Path.Combine(directoryPath, TokenDumpFileName);
            var tokenDumpInfoPath = Path.Combine(directoryPath, TokenDumpInfoFileName);

            await SaveDiagnosticTokenAsync(tokenDumpPath, bearer, cancellationToken);
            await SaveDiagnosticInfoAsync(
                tokenDumpInfoPath,
                path,
                tokenDumpPath,
                tokenChanged,
                bearer,
                cancellationToken);

            _logger.LogInformation(
                "YooMoney bearer token saved to {Path}. tokenChanged={TokenChanged}. tokenDump={TokenDumpPath}",
                path,
                tokenChanged,
                tokenDumpPath);
        }
    }

    private IEnumerable<string> GetCandidatePaths()
    {
        var contentRoot = _environment.ContentRootPath;
        yield return Path.Combine(contentRoot, "appsettings.json");
        yield return Path.Combine(contentRoot, "UpdateService", "appsettings.json");
    }

    private static async Task<bool> SaveBearerToFileAsync(
        string path,
        string bearer,
        CancellationToken cancellationToken)
    {
        var raw = await File.ReadAllTextAsync(path, cancellationToken);
        var root = JObject.Parse(raw);
        var yooMoney = root["YooMoney"] as JObject ?? new JObject();
        var previousBearer = yooMoney["Bearer"]?.ToString();
        var tokenChanged = !string.Equals(previousBearer, bearer, StringComparison.Ordinal);

        root["YooMoney"] = yooMoney;
        yooMoney["Bearer"] = bearer;

        await File.WriteAllTextAsync(
            path,
            root.ToString(Formatting.Indented) + Environment.NewLine,
            cancellationToken);

        return tokenChanged;
    }

    private static async Task SaveDiagnosticTokenAsync(
        string path,
        string bearer,
        CancellationToken cancellationToken)
    {
        var directoryPath = Path.GetDirectoryName(path);
        if (!string.IsNullOrWhiteSpace(directoryPath))
        {
            Directory.CreateDirectory(directoryPath);
        }

        await File.WriteAllTextAsync(
            path,
            bearer + Environment.NewLine,
            cancellationToken);
    }

    private static async Task SaveDiagnosticInfoAsync(
        string path,
        string configPath,
        string tokenDumpPath,
        bool tokenChanged,
        string bearer,
        CancellationToken cancellationToken)
    {
        var directoryPath = Path.GetDirectoryName(path);
        if (!string.IsNullOrWhiteSpace(directoryPath))
        {
            Directory.CreateDirectory(directoryPath);
        }

        var root = new JObject
        {
            ["savedAtUtc"] = DateTime.UtcNow.ToString("O"),
            ["configPath"] = configPath,
            ["tokenDumpPath"] = tokenDumpPath,
            ["tokenChanged"] = tokenChanged,
            ["tokenLength"] = bearer.Length
        };

        await File.WriteAllTextAsync(
            path,
            root.ToString(Formatting.Indented) + Environment.NewLine,
            cancellationToken);
    }
}
