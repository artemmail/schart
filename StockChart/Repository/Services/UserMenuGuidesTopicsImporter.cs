using Markdig;
using Markdig.Extensions.AutoIdentifiers;
using Markdig.Renderers;
using Markdig.Syntax;
using Markdig.Syntax.Inlines;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using StockChart.Model;
using StockChart.Repository.Interfaces;
using System.IO;
using System.Text;
using System.Text.RegularExpressions;

namespace StockChart.Repository.Services;

public sealed record UserMenuGuidesTopicsImportOptions(
    bool DryRun = false,
    bool UpdateExisting = false);

public sealed record UserMenuGuidesTopicsImportItem(
    string FileName,
    int TopicId,
    string Slug,
    string Header);

public sealed class UserMenuGuidesTopicsImportResult
{
    public string DocsDirectory { get; init; } = string.Empty;
    public int TotalFiles { get; init; }
    public bool DryRun { get; init; }
    public bool UpdateExisting { get; init; }

    public int CreatedCount { get; init; }
    public int UpdatedCount { get; init; }
    public int SkippedCount { get; init; }

    public List<string> Skipped { get; init; } = new();
    public List<UserMenuGuidesTopicsImportItem> Imported { get; init; } = new();

    // Slugs created during this run (useful for optional IndexNow ping).
    public List<string> CreatedSlugs { get; init; } = new();

    public List<string> Errors { get; init; } = new();
}

public sealed class UserMenuGuidesTopicsImporter
{
    private static readonly MarkdownPipeline UserGuidesMarkdownPipeline = new MarkdownPipelineBuilder()
        .UseAdvancedExtensions()
        .UseAutoIdentifiers(AutoIdentifierOptions.GitHub)
        .Build();

    private readonly ApplicationDbContext _db;
    private readonly ITopicsRepository _topicsRepository;
    private readonly IWebHostEnvironment _environment;

    public UserMenuGuidesTopicsImporter(ApplicationDbContext db, ITopicsRepository topicsRepository, IWebHostEnvironment environment)
    {
        _db = db;
        _topicsRepository = topicsRepository;
        _environment = environment;
    }

    public async Task<UserMenuGuidesTopicsImportResult> ImportAsync(
        ApplicationUser actor,
        UserMenuGuidesTopicsImportOptions options,
        CancellationToken cancellationToken = default)
    {
        if (actor == null)
        {
            throw new ArgumentNullException(nameof(actor));
        }

        var docsDir = ResolveUserMenuGuidesDir();
        if (string.IsNullOrWhiteSpace(docsDir) || !Directory.Exists(docsDir))
        {
            return new UserMenuGuidesTopicsImportResult
            {
                DocsDirectory = docsDir ?? string.Empty,
                TotalFiles = 0,
                DryRun = options.DryRun,
                UpdateExisting = options.UpdateExisting,
                Errors = new List<string> { $"Docs directory not found: {docsDir}" }
            };
        }

        var allFiles = Directory
            .EnumerateFiles(docsDir, "*.md", SearchOption.TopDirectoryOnly)
            .Select(path => new FileInfo(path))
            .OrderBy(fi => fi.Name, StringComparer.OrdinalIgnoreCase)
            .ToList();

        var files = allFiles
            .Where(fi => !Regex.IsMatch(fi.Name, @"^8\d_admin_.*\.md$", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant))
            .ToList();

        const string sourceMarkerPrefix = "<!-- source:user-menu-guides/";

        // Load existing imported topics (idempotency) by marker, in one query.
        var existingImported = await _db.Topics
            .Where(t => t.Text.Contains(sourceMarkerPrefix))
            .Select(t => new { t.Id, t.Slug, t.Text })
            .ToListAsync(cancellationToken);

        var existingByFileName = new Dictionary<string, (int Id, string Slug)>(StringComparer.OrdinalIgnoreCase);
        foreach (var t in existingImported)
        {
            var fileName = TryExtractSourceFileName(t.Text);
            if (!string.IsNullOrWhiteSpace(fileName))
            {
                existingByFileName[fileName] = (t.Id, t.Slug);
            }
        }

        var fileNameToSlug = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        var imported = new List<UserMenuGuidesTopicsImportItem>();
        var skipped = new List<string>();
        var errors = new List<string>();
        var createdSlugs = new List<string>();
        var createdCount = 0;
        var updatedCount = 0;

        // Pass 1: create/update with temporary links. We'll fix cross-links in pass 2.
        var toFixLinks = new List<(string FileName, int TopicId, string Header, string Slug)>();

        foreach (var fi in files)
        {
            try
            {
                var mdRaw = await File.ReadAllTextAsync(fi.FullName, Encoding.UTF8, cancellationToken);
                var (h1, bodyMarkdown) = ExtractHeaderAndBodyMarkdown(mdRaw);
                var header = GetSeoHeader(fi.Name, h1);

                var sourceMarker = $"{sourceMarkerPrefix}{fi.Name} -->\n";
                var html = ConvertMarkdownToHtml(bodyMarkdown, UserGuidesMarkdownPipeline, fileNameToSlug: null);
                var textHtml = sourceMarker + html;

                if (existingByFileName.TryGetValue(fi.Name, out var existing))
                {
                    fileNameToSlug[fi.Name] = existing.Slug;

                    if (!options.UpdateExisting)
                    {
                        skipped.Add(fi.Name);
                        continue;
                    }

                    if (!options.DryRun)
                    {
                        var updated = await _topicsRepository.UpdateTopicAsync(actor, existing.Id, header, textHtml, isAdmin: true);
                        if (updated == null)
                        {
                            errors.Add($"{fi.Name}: failed to update topic id={existing.Id}");
                            continue;
                        }
                    }

                    updatedCount++;
                    imported.Add(new UserMenuGuidesTopicsImportItem(fi.Name, existing.Id, existing.Slug, header));
                    toFixLinks.Add((fi.Name, existing.Id, header, existing.Slug));
                    continue;
                }

                if (options.DryRun)
                {
                    imported.Add(new UserMenuGuidesTopicsImportItem(fi.Name, 0, "(dry-run)", header));
                    toFixLinks.Add((fi.Name, 0, header, "(dry-run)"));
                    continue;
                }

                var created = await _topicsRepository.CreateTopicAsync(actor, header, textHtml);
                fileNameToSlug[fi.Name] = created.Slug;

                createdCount++;
                createdSlugs.Add(created.Slug);
                imported.Add(new UserMenuGuidesTopicsImportItem(fi.Name, created.Id, created.Slug, header));
                toFixLinks.Add((fi.Name, created.Id, header, created.Slug));
            }
            catch (Exception ex)
            {
                errors.Add($"{fi.Name}: {ex.Message}");
            }
        }

        // Pass 2: rewrite internal links and update only items we created/updated in this run.
        if (!options.DryRun)
        {
            foreach (var item in toFixLinks.Where(x => x.TopicId > 0))
            {
                try
                {
                    var fi = files.FirstOrDefault(f => string.Equals(f.Name, item.FileName, StringComparison.OrdinalIgnoreCase));
                    if (fi == null)
                    {
                        continue;
                    }

                    var mdRaw = await File.ReadAllTextAsync(fi.FullName, Encoding.UTF8, cancellationToken);
                    var (h1, bodyMarkdown) = ExtractHeaderAndBodyMarkdown(mdRaw);
                    var header = GetSeoHeader(fi.Name, h1);

                    var sourceMarker = $"{sourceMarkerPrefix}{fi.Name} -->\n";
                    var html = ConvertMarkdownToHtml(bodyMarkdown, UserGuidesMarkdownPipeline, fileNameToSlug);
                    var textHtml = sourceMarker + html;

                    var updated = await _topicsRepository.UpdateTopicAsync(actor, item.TopicId, header, textHtml, isAdmin: true);
                    if (updated == null)
                    {
                        errors.Add($"{fi.Name}: failed to update links for topic id={item.TopicId}");
                    }
                }
                catch (Exception ex)
                {
                    errors.Add($"{item.FileName}: {ex.Message}");
                }
            }
        }

        return new UserMenuGuidesTopicsImportResult
        {
            DocsDirectory = docsDir,
            TotalFiles = files.Count,
            DryRun = options.DryRun,
            UpdateExisting = options.UpdateExisting,
            CreatedCount = createdCount,
            UpdatedCount = updatedCount,
            SkippedCount = skipped.Count,
            Skipped = skipped,
            Imported = imported,
            CreatedSlugs = createdSlugs,
            Errors = errors
        };
    }

    private string ResolveUserMenuGuidesDir()
    {
        // Prefer local candidate (published layout might be different), fallback to repo-root layout.
        var localCandidate = Path.GetFullPath(Path.Combine(_environment.ContentRootPath, "Angular", "mat", "docs", "user-menu-guides"));
        if (Directory.Exists(localCandidate))
        {
            return localCandidate;
        }

        var repoRootCandidate = Path.GetFullPath(Path.Combine(_environment.ContentRootPath, "..", "Angular", "mat", "docs", "user-menu-guides"));
        return repoRootCandidate;
    }

    private static string? TryExtractSourceFileName(string html)
    {
        if (string.IsNullOrWhiteSpace(html))
        {
            return null;
        }

        // Example: <!-- source:user-menu-guides/20_footprint.md -->
        var match = Regex.Match(
            html,
            @"<!--\s*source:user-menu-guides/(?<file>[^\s>]+)\s*-->",
            RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);

        return match.Success ? match.Groups["file"].Value.Trim() : null;
    }

    private static (string? H1, string BodyMarkdown) ExtractHeaderAndBodyMarkdown(string markdown)
    {
        if (string.IsNullOrWhiteSpace(markdown))
        {
            return (null, string.Empty);
        }

        var normalized = markdown.Replace("\r\n", "\n").Replace("\r", "\n");
        var lines = normalized.Split('\n');

        for (var i = 0; i < lines.Length; i++)
        {
            var line = lines[i]?.TrimEnd() ?? string.Empty;
            if (string.IsNullOrWhiteSpace(line))
            {
                continue;
            }

            if (line.StartsWith("# ", StringComparison.Ordinal))
            {
                var h1 = line.Substring(2).Trim();

                var sb = new StringBuilder();
                for (var j = i + 1; j < lines.Length; j++)
                {
                    // Skip the immediate blank line after H1 (common Markdown style).
                    if (j == i + 1 && string.IsNullOrWhiteSpace(lines[j]))
                    {
                        continue;
                    }

                    sb.AppendLine(lines[j]);
                }

                return (h1, sb.ToString().Trim());
            }

            // If the first non-empty line isn't a H1, don't try to guess.
            break;
        }

        return (null, normalized.Trim());
    }

    private static string GetSeoHeader(string fileName, string? h1)
    {
        // Keep the original H1 for most docs (it matches the menu item and reads naturally),
        // but enrich a few very short titles for better indexing.
        var baseTitle = (h1 ?? string.Empty).Trim();
        return fileName switch
        {
            "01_main.md" => "Главная StockChart.ru: стартовая панель, виджеты рынка и быстрые сценарии",
            "02_tariffs.md" => "Тарифы StockChart.ru: подписка, доступ к инструментам и оплата",
            "03_mcp_console.md" => "MCP Console StockChart.ru: ИИ‑ассистент, быстрые запросы и практические кейсы",
            "24_multi_candles.md" => "Мультиграфики StockChart.ru: сравнение тикеров, таймфреймы и работа от контекста",
            "25_favorites_board.md" => "Доска FootPrint: список избранных тикеров и рабочее место трейдера",
            "30_open_positions.md" => "Открытые позиции: контроль сделок, риск‑менеджмент и дневник трейдера",
            "31_futures_list.md" => "Список фьючерсов: быстрый поиск контрактов и переход в аналитику",
            "33_option_board.md" => "Доска опционов StockChart.ru: страйки, ликвидность и быстрые фильтры",
            "50_service_news.md" => "Лента блогов и обновлений StockChart.ru: релизы, заметки и разборы",
            "51_support_dialog.md" => "Поддержка StockChart.ru: как написать и что приложить, чтобы быстрее помогли",
            "52_create_topic.md" => "Создать тему в блоге: как оформить пост и получить полезную обратную связь",
            "53_share_image.md" => "Опубликовать картинку: как делиться скриншотами графиков и разметкой",
            _ => !string.IsNullOrWhiteSpace(baseTitle) ? baseTitle : fileName
        };
    }

    private static string ConvertMarkdownToHtml(string markdown, MarkdownPipeline pipeline, IReadOnlyDictionary<string, string>? fileNameToSlug)
    {
        var document = Markdown.Parse(markdown ?? string.Empty, pipeline);

        if (fileNameToSlug != null && fileNameToSlug.Count > 0)
        {
            RewriteUserGuideLinks(document, fileNameToSlug);
        }

        using var writer = new StringWriter();
        var renderer = new HtmlRenderer(writer);
        pipeline.Setup(renderer);
        renderer.Render(document);
        writer.Flush();
        return writer.ToString();
    }

    private static void RewriteUserGuideLinks(MarkdownDocument document, IReadOnlyDictionary<string, string> fileNameToSlug)
    {
        foreach (var link in document.Descendants<LinkInline>())
        {
            if (link.IsImage)
            {
                continue;
            }

            var url = link.Url?.Trim();
            if (string.IsNullOrWhiteSpace(url))
            {
                continue;
            }

            // Skip absolute and site-root links.
            if (url.StartsWith("http://", StringComparison.OrdinalIgnoreCase)
                || url.StartsWith("https://", StringComparison.OrdinalIgnoreCase)
                || url.StartsWith("/", StringComparison.Ordinal)
                || url.StartsWith("#", StringComparison.Ordinal))
            {
                continue;
            }

            // Skip "mailto:" and other schemes.
            if (Uri.TryCreate(url, UriKind.Absolute, out _))
            {
                continue;
            }

            var parts = url.Split('#', 2);
            var pathPart = parts[0];
            if (!pathPart.EndsWith(".md", StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            var fileName = Path.GetFileName(pathPart);
            if (string.IsNullOrWhiteSpace(fileName))
            {
                continue;
            }

            if (!fileNameToSlug.TryGetValue(fileName, out var slug) || string.IsNullOrWhiteSpace(slug))
            {
                continue;
            }

            var fragment = parts.Length == 2 && !string.IsNullOrWhiteSpace(parts[1]) ? $"#{parts[1]}" : string.Empty;
            link.Url = $"/ServiceNews/Content/{slug}{fragment}";
        }
    }
}

