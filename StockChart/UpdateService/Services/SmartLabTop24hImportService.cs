using System.Text;
using System.Text.RegularExpressions;
using HtmlAgilityPack;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Webp;
using StockChart.Model;

namespace StockChart.UpdateService.Services;

public sealed class SmartLabImportSummary
{
    public int TopLinksFound { get; set; }
    public int CreatedTopics { get; set; }
    public int SkippedAlreadyImported { get; set; }
    public int Failed { get; set; }
}

public sealed class SmartLabTop24hImportService
{
    private const string YandexIndexNowBaseUrl = "https://yandex.com/indexnow";
    private const string YandexIndexNowKey = "f59e3d2c25e394fb";
    private const int WebpLossyQuality = 60;

    private sealed record ParsedArticle(string Title, string ContentHtml);

    private static readonly HashSet<string> ImageExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".svg"
    };

    private static readonly Dictionary<char, string> TransliterationMap = new()
    {
        ['а'] = "a", ['б'] = "b", ['в'] = "v", ['г'] = "g", ['д'] = "d",
        ['е'] = "e", ['ё'] = "yo", ['ж'] = "zh", ['з'] = "z", ['и'] = "i",
        ['й'] = "y", ['к'] = "k", ['л'] = "l", ['м'] = "m", ['н'] = "n",
        ['о'] = "o", ['п'] = "p", ['р'] = "r", ['с'] = "s", ['т'] = "t",
        ['у'] = "u", ['ф'] = "f", ['х'] = "kh", ['ц'] = "ts", ['ч'] = "ch",
        ['ш'] = "sh", ['щ'] = "sch", ['ъ'] = "", ['ы'] = "y", ['ь'] = "",
        ['э'] = "e", ['ю'] = "yu", ['я'] = "ya"
    };

    private readonly IDbContextFactory<ApplicationDbContext> _contextFactory;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly OpenAiRewriteService _rewriteService;
    private readonly SmartLabTop24hOptions _options;
    private readonly ILogger<SmartLabTop24hImportService> _logger;

    public SmartLabTop24hImportService(
        IDbContextFactory<ApplicationDbContext> contextFactory,
        IHttpClientFactory httpClientFactory,
        OpenAiRewriteService rewriteService,
        IOptions<SmartLabTop24hOptions> options,
        ILogger<SmartLabTop24hImportService> logger)
    {
        _contextFactory = contextFactory;
        _httpClientFactory = httpClientFactory;
        _rewriteService = rewriteService;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<SmartLabImportSummary> ImportAsync(CancellationToken cancellationToken)
    {
        var summary = new SmartLabImportSummary();
        var links = await GetTopLinksAsync(cancellationToken);
        summary.TopLinksFound = links.Count;

        if (links.Count == 0)
        {
            return summary;
        }

        var systemUserId = await ResolveSystemUserIdAsync(cancellationToken);
        if (systemUserId == null)
        {
            _logger.LogError(
                "SmartLab import aborted: system user '{UserName}' was not found.",
                _options.SystemUserName);
            summary.Failed = links.Count;
            return summary;
        }

        foreach (var link in links.Take(_options.MaxTopicsPerRun))
        {
            cancellationToken.ThrowIfCancellationRequested();

            var result = await ProcessLinkAsync(systemUserId.Value, link, cancellationToken);
            switch (result)
            {
                case SmartLabImportProcessResult.Created:
                    summary.CreatedTopics++;
                    break;
                case SmartLabImportProcessResult.Skipped:
                    summary.SkippedAlreadyImported++;
                    break;
                default:
                    summary.Failed++;
                    break;
            }
        }

        return summary;
    }

    private async Task<IReadOnlyList<string>> GetTopLinksAsync(CancellationToken cancellationToken)
    {
        try
        {
            var client = CreateSmartLabClient();
            var html = await client.GetStringAsync(_options.TopUrl, cancellationToken);

            var doc = new HtmlDocument();
            doc.LoadHtml(html);

            var targetHeading = NormalizeText(_options.TopSectionTitle);
            var tabNodes = doc.DocumentNode.SelectNodes("//div[contains(@class,'tab')]");
            if (tabNodes == null)
            {
                return Array.Empty<string>();
            }

            HtmlNode? targetTab = null;
            foreach (var tab in tabNodes)
            {
                var heading = tab.SelectSingleNode("./h4");
                if (heading == null)
                {
                    continue;
                }

                var headingText = NormalizeText(heading.InnerText);
                if (headingText.Contains(targetHeading, StringComparison.Ordinal))
                {
                    targetTab = tab;
                    break;
                }
            }

            if (targetTab == null)
            {
                _logger.LogWarning("SmartLab import: target section '{Section}' not found on top page.", _options.TopSectionTitle);
                return Array.Empty<string>();
            }

            var linkNodes = targetTab.SelectNodes(".//div[contains(@class,'trt')]//a[@href]");
            if (linkNodes == null || linkNodes.Count == 0)
            {
                return Array.Empty<string>();
            }

            var links = linkNodes
                .Select(x => NormalizeUrl(x.GetAttributeValue("href", string.Empty)))
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            return links;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "SmartLab import failed to parse the top page.");
            return Array.Empty<string>();
        }
    }

    private async Task<Guid?> ResolveSystemUserIdAsync(CancellationToken cancellationToken)
    {
        await using var context = await _contextFactory.CreateDbContextAsync(cancellationToken);

        if (!string.IsNullOrWhiteSpace(_options.SystemUserName))
        {
            var normalizedUserName = _options.SystemUserName.Trim().ToUpperInvariant();
            var userId = await context.Users
                .AsNoTracking()
                .Where(x => x.NormalizedUserName == normalizedUserName)
                .Select(x => (Guid?)x.Id)
                .FirstOrDefaultAsync(cancellationToken);

            if (userId != null)
            {
                return userId;
            }
        }

        var fallbackUserId = await context.Users
            .AsNoTracking()
            .OrderBy(x => x.RegistrationDate)
            .Select(x => (Guid?)x.Id)
            .FirstOrDefaultAsync(cancellationToken);

        return fallbackUserId;
    }

    private async Task<SmartLabImportProcessResult> ProcessLinkAsync(
        Guid systemUserId,
        string link,
        CancellationToken cancellationToken)
    {
        try
        {
            await using var context = await _contextFactory.CreateDbContextAsync(cancellationToken);

            var alreadyImported = await context.SmartLabImportedLinks
                .AsNoTracking()
                .AnyAsync(x => x.Url == link, cancellationToken);

            if (alreadyImported)
            {
                return SmartLabImportProcessResult.Skipped;
            }

            var client = CreateSmartLabClient();
            var articleHtml = await client.GetStringAsync(link, cancellationToken);
            if (!TryParseArticle(articleHtml, out var parsedArticle))
            {
                _logger.LogWarning("SmartLab import: failed to parse article structure for {Url}.", link);
                return SmartLabImportProcessResult.Failed;
            }

            var htmlWithLocalImages = await DownloadAndReplaceImagesAsync(
                context,
                client,
                parsedArticle.ContentHtml,
                systemUserId,
                cancellationToken);

            var rewriteResult = await _rewriteService.RewriteAsync(
                parsedArticle.Title,
                htmlWithLocalImages,
                cancellationToken);

            if (!rewriteResult.IsSuccess)
            {
                _logger.LogWarning(
                    "SmartLab import: OpenAI rewrite failed for {Url}: {Reason}",
                    link,
                    rewriteResult.Error ?? "unknown error");

                return SmartLabImportProcessResult.Failed;
            }

            var slug = await GenerateUniqueSlugAsync(context, rewriteResult.Title, cancellationToken);

            var topic = new Topic
            {
                UserId = systemUserId,
                Date = DateTime.Now,
                Header = rewriteResult.Title,
                Text = rewriteResult.Html,
                Hide = false,
                Slug = slug
            };

            var imported = new SmartLabImportedLink
            {
                Id = Guid.NewGuid(),
                Url = link,
                Header = rewriteResult.Title,
                ImportedAt = DateTime.UtcNow,
                Topic = topic
            };

            context.Topics.Add(topic);
            context.SmartLabImportedLinks.Add(imported);

            await context.SaveChangesAsync(cancellationToken);
            if (!await NotifyYandexAsync(slug, cancellationToken))
            {
                _logger.LogWarning(
                    "SmartLab import: Yandex index notify failed for slug {Slug}.",
                    slug);
            }

            return SmartLabImportProcessResult.Created;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "SmartLab import failed for {Url}.", link);
            return SmartLabImportProcessResult.Failed;
        }
    }

    private async Task<bool> NotifyYandexAsync(string slug, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(slug))
        {
            return false;
        }

        var pageUrl = $"{_options.StockChartBaseUrl.TrimEnd('/')}/ServiceNews/Content/{slug}";
        var fullUrl =
            $"{YandexIndexNowBaseUrl}?url={Uri.EscapeDataString(pageUrl)}&key={Uri.EscapeDataString(YandexIndexNowKey)}";

        try
        {
            var client = _httpClientFactory.CreateClient("SmartLabImportClient");
            using var response = await client.GetAsync(fullUrl, cancellationToken);
            return response.IsSuccessStatusCode;
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "SmartLab import: exception on Yandex index notify for {Url}.", pageUrl);
            return false;
        }
    }

    private async Task<string> DownloadAndReplaceImagesAsync(
        ApplicationDbContext context,
        HttpClient client,
        string contentHtml,
        Guid userId,
        CancellationToken cancellationToken)
    {
        var wrappedHtml = $"<div id=\"smartlab-content-root\">{contentHtml}</div>";
        var doc = new HtmlDocument();
        doc.LoadHtml(wrappedHtml);

        var root = doc.GetElementbyId("smartlab-content-root");
        if (root == null)
        {
            return contentHtml;
        }

        var replacements = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

        var imageNodes = root.SelectNodes(".//img[@src]");
        if (imageNodes != null)
        {
            foreach (var imageNode in imageNodes)
            {
                var src = imageNode.GetAttributeValue("src", string.Empty);
                var newUrl = await ResolveLocalImageUrlAsync(context, client, replacements, src, userId, cancellationToken);
                if (!string.IsNullOrWhiteSpace(newUrl))
                {
                    imageNode.SetAttributeValue("src", newUrl);
                }
            }
        }

        var linkNodes = root.SelectNodes(".//a[@href]");
        if (linkNodes != null)
        {
            foreach (var linkNode in linkNodes)
            {
                var href = linkNode.GetAttributeValue("href", string.Empty);
                if (!IsImageUrl(href))
                {
                    continue;
                }

                var newUrl = await ResolveLocalImageUrlAsync(context, client, replacements, href, userId, cancellationToken);
                if (!string.IsNullOrWhiteSpace(newUrl))
                {
                    linkNode.SetAttributeValue("href", newUrl);
                }
            }
        }

        return root.InnerHtml;
    }

    private async Task<string?> ResolveLocalImageUrlAsync(
        ApplicationDbContext context,
        HttpClient client,
        IDictionary<string, string> replacements,
        string rawUrl,
        Guid userId,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(rawUrl))
        {
            return null;
        }

        if (rawUrl.StartsWith("data:", StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        var normalizedUrl = NormalizeUrl(rawUrl);
        if (string.IsNullOrWhiteSpace(normalizedUrl) || !IsImageUrl(normalizedUrl))
        {
            return null;
        }

        if (replacements.TryGetValue(normalizedUrl, out var existing))
        {
            return existing;
        }

        var localUrl = await DownloadAndStoreImageAsync(context, client, normalizedUrl, userId, cancellationToken);
        if (string.IsNullOrWhiteSpace(localUrl))
        {
            return null;
        }

        replacements[normalizedUrl] = localUrl;
        replacements[rawUrl] = localUrl;

        return localUrl;
    }

    private async Task<string?> DownloadAndStoreImageAsync(
        ApplicationDbContext context,
        HttpClient client,
        string imageUrl,
        Guid userId,
        CancellationToken cancellationToken)
    {
        try
        {
            using var response = await client.GetAsync(imageUrl, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning(
                    "SmartLab import: image download failed status={Status} url={Url}",
                    (int)response.StatusCode,
                    imageUrl);
                return null;
            }

            var bytes = await response.Content.ReadAsByteArrayAsync(cancellationToken);
            if (bytes.Length == 0)
            {
                return null;
            }

            var contentType = response.Content.Headers.ContentType?.MediaType;
            var extension = ResolveImageExtension(imageUrl, contentType);
            bytes = ConvertToWebpIfNeeded(bytes, extension, imageUrl, out extension);
            var fileName = $"{Path.GetRandomFileName().Replace(".", "x")}{extension}";

            context.FileEntities.Add(new FileEntity
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                FileName = fileName,
                FileData = bytes,
                CreatedTime = DateTime.Now,
                OpenTime = DateTime.Now,
                DownLoads = 0
            });

            return $"{_options.StockChartBaseUrl.TrimEnd('/')}/shots/{fileName}";
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "SmartLab import: image download exception for {Url}", imageUrl);
            return null;
        }
    }

    private static string ResolveImageExtension(string url, string? contentType)
    {
        var byType = contentType?.ToLowerInvariant() switch
        {
            "image/png" => ".png",
            "image/jpeg" => ".jpg",
            "image/jpg" => ".jpg",
            "image/webp" => ".webp",
            "image/gif" => ".gif",
            "image/bmp" => ".bmp",
            "image/svg+xml" => ".svg",
            _ => null
        };

        if (!string.IsNullOrWhiteSpace(byType))
        {
            return byType;
        }

        var cleanPath = url.Split('?')[0].Split('#')[0];
        var extension = Path.GetExtension(cleanPath);

        if (string.IsNullOrWhiteSpace(extension))
        {
            return ".jpg";
        }

        if (!extension.StartsWith(".", StringComparison.Ordinal))
        {
            extension = "." + extension;
        }

        return ImageExtensions.Contains(extension) ? extension.ToLowerInvariant() : ".jpg";
    }

    private byte[] ConvertToWebpIfNeeded(byte[] sourceBytes, string sourceExtension, string imageUrl, out string resultExtension)
    {
        resultExtension = sourceExtension;
        if (!sourceExtension.Equals(".jpg", StringComparison.OrdinalIgnoreCase)
            && !sourceExtension.Equals(".jpeg", StringComparison.OrdinalIgnoreCase)
            && !sourceExtension.Equals(".png", StringComparison.OrdinalIgnoreCase))
        {
            return sourceBytes;
        }

        try
        {
            using var image = Image.Load(sourceBytes);
            using var output = new MemoryStream();
            image.Save(output, new WebpEncoder
            {
                FileFormat = WebpFileFormatType.Lossy,
                Quality = WebpLossyQuality
            });

            resultExtension = ".webp";
            return output.ToArray();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(
                ex,
                "SmartLab import: failed to convert image to webp, using original format for {Url}",
                imageUrl);

            return sourceBytes;
        }
    }

    private static bool TryParseArticle(string html, out ParsedArticle parsedArticle)
    {
        parsedArticle = default!;

        var doc = new HtmlDocument();
        doc.LoadHtml(html);

        var topicNode = doc.DocumentNode.SelectSingleNode(
            "//div[contains(@class,'topic') and @tid and .//h1[contains(@class,'title')]]");

        if (topicNode == null)
        {
            return false;
        }

        var titleNode = topicNode.SelectSingleNode(".//h1[contains(@class,'title')]//span")
            ?? topicNode.SelectSingleNode(".//h1[contains(@class,'title')]");

        var contentNode = topicNode.SelectSingleNode("./div[contains(@class,'content')]")
            ?? topicNode.SelectSingleNode(".//div[contains(@class,'content')]");

        if (titleNode == null || contentNode == null)
        {
            return false;
        }

        var nodesToRemove = contentNode.SelectNodes(".//script|.//style|.//noscript");
        if (nodesToRemove != null)
        {
            foreach (var node in nodesToRemove)
            {
                node.Remove();
            }
        }

        var title = HtmlEntity.DeEntitize(titleNode.InnerText).Trim();
        var contentHtml = contentNode.InnerHtml.Trim();

        if (string.IsNullOrWhiteSpace(title) || string.IsNullOrWhiteSpace(contentHtml))
        {
            return false;
        }

        parsedArticle = new ParsedArticle(title, contentHtml);
        return true;
    }

    private async Task<string> GenerateUniqueSlugAsync(
        ApplicationDbContext context,
        string header,
        CancellationToken cancellationToken)
    {
        var baseSlug = GenerateSlugBase(header);
        var slug = baseSlug;
        var suffix = 1;

        while (await context.Topics.AnyAsync(x => x.Slug == slug, cancellationToken))
        {
            slug = $"{baseSlug}-{suffix}";
            suffix++;
        }

        return slug;
    }

    private static string GenerateSlugBase(string header)
    {
        var transliterated = Transliterate(header.Trim());
        var slug = Regex.Replace(transliterated, @"[^a-zA-Z0-9\-]", "-")
            .ToLowerInvariant();
        slug = Regex.Replace(slug, @"-+", "-").Trim('-');
        return string.IsNullOrWhiteSpace(slug) ? "smartlab-post" : slug;
    }

    private static string Transliterate(string text)
    {
        var builder = new StringBuilder(text.Length * 2);
        foreach (var ch in text.ToLowerInvariant())
        {
            if (TransliterationMap.TryGetValue(ch, out var replacement))
            {
                builder.Append(replacement);
            }
            else
            {
                builder.Append(ch);
            }
        }

        return builder.ToString();
    }

    private bool IsImageUrl(string url)
    {
        if (string.IsNullOrWhiteSpace(url))
        {
            return false;
        }

        if (url.StartsWith("data:", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        var normalized = NormalizeUrl(url);
        if (string.IsNullOrWhiteSpace(normalized))
        {
            return false;
        }

        if (normalized.Contains("/uploads/", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        var path = normalized.Split('?')[0].Split('#')[0];
        var extension = Path.GetExtension(path);
        return !string.IsNullOrWhiteSpace(extension) && ImageExtensions.Contains(extension);
    }

    private string NormalizeUrl(string rawUrl)
    {
        if (string.IsNullOrWhiteSpace(rawUrl))
        {
            return string.Empty;
        }

        var url = HtmlEntity.DeEntitize(rawUrl).Trim();
        if (url.StartsWith("//", StringComparison.Ordinal))
        {
            url = "https:" + url;
        }

        if (Uri.TryCreate(url, UriKind.Absolute, out var absolute))
        {
            return absolute.GetLeftPart(UriPartial.Path);
        }

        if (!Uri.TryCreate(_options.BaseUrl, UriKind.Absolute, out var baseUri))
        {
            return string.Empty;
        }

        return Uri.TryCreate(baseUri, url, out var combined)
            ? combined.GetLeftPart(UriPartial.Path)
            : string.Empty;
    }

    private static string NormalizeText(string value)
    {
        var deEntitized = HtmlEntity.DeEntitize(value);
        return Regex.Replace(deEntitized, "\\s+", " ").Trim().ToLowerInvariant();
    }

    private HttpClient CreateSmartLabClient()
    {
        var client = _httpClientFactory.CreateClient("SmartLabImportClient");
        return client;
    }

    private enum SmartLabImportProcessResult
    {
        Created = 1,
        Skipped = 2,
        Failed = 3
    }
}
