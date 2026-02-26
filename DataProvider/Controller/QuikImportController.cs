using DataProvider.Models;
using DataProvider.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using StockChart.Model;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace DataProvider;

[Route("api/[controller]")]
[ApiController]
public sealed class QuikImportController : ControllerBase
{
    private const int MaxBatchSize = 20000;
    private const int HistoryStartMarginMinutes = 5;
    private readonly IQuikImportQueue _queue;
    private readonly IDbContextFactory<ApplicationDbContext> _contextFactory;
    private readonly ILogger<QuikImportController> _logger;

    public QuikImportController(
        IQuikImportQueue queue,
        IDbContextFactory<ApplicationDbContext> contextFactory,
        ILogger<QuikImportController> logger)
    {
        _queue = queue;
        _contextFactory = contextFactory;
        _logger = logger;
    }

    [HttpPost("trades/text")]
    [Consumes("text/plain")]
    [Produces("text/plain")]
    public async Task<IActionResult> ImportTradesText(CancellationToken cancellationToken)
    {
        using var reader = new StreamReader(Request.Body, Encoding.UTF8);
        var payload = await reader.ReadToEndAsync();
        var parsed = QuikImportTextParser.ParseTrades(payload, MaxBatchSize);

        if (parsed.Trades.Count > 0)
            await _queue.EnqueueAsync(new QuikImportBatch(parsed.Trades), cancellationToken);

        var response = $"accepted={parsed.Trades.Count};rejected={parsed.Rejected};queueDepth={_queue.QueueDepth}";
        return Accepted(response);
    }

    [HttpPost("maxtrades/text")]
    [Consumes("text/plain")]
    [Produces("text/plain")]
    public async Task<IActionResult> MaxTradesText(CancellationToken cancellationToken)
    {
        using var reader = new StreamReader(Request.Body, Encoding.UTF8);
        var payload = await reader.ReadToEndAsync();
        var tickers = QuikImportTextParser.ParseTickers(payload);

        if (tickers.Count == 0)
            return Content(string.Empty, "text/plain");

        var resolved = ResolveTickerIds(tickers);
        var idToMax = await ReadMaxTradesAsync(resolved.Values.ToList(), cancellationToken);

        var sb = new StringBuilder(tickers.Count * 24);
        var withLimit = 0;
        var withoutLimit = 0;
        foreach (var ticker in tickers)
        {
            if (resolved.TryGetValue(ticker, out var id) && idToMax.TryGetValue(id, out var max))
            {
                sb.Append(ticker).Append("|1|").Append(max).Append('\n');
                withLimit++;
            }
            else
            {
                sb.Append(ticker).Append("|0|0").Append('\n');
                withoutLimit++;
            }
        }

        if (withoutLimit > 0)
        {
            _logger.LogWarning(
                "QUIK maxtrades: tickers={Tickers}, resolved={Resolved}, withLimit={WithLimit}, withoutLimit={WithoutLimit}",
                tickers.Count,
                resolved.Count,
                withLimit,
                withoutLimit);
        }

        return Content(sb.ToString(), "text/plain");
    }

    [HttpPost("historyfrom/text")]
    [Consumes("text/plain")]
    [Produces("text/plain")]
    public async Task<IActionResult> HistoryFromText(CancellationToken cancellationToken)
    {
        await using var context = await _contextFactory.CreateDbContextAsync(cancellationToken);

        string source = "MaxTrades";
        DateTime? maxPeriod = await context.MaxTrades
            .AsNoTracking()
            .Select(x => (DateTime?)x.MaxTime)
            .MaxAsync(cancellationToken);

        if (maxPeriod == null || maxPeriod <= DateTime.UnixEpoch)
        {
            source = "Candles";
            maxPeriod = await context.Candles
                .AsNoTracking()
                .Select(x => (DateTime?)x.Period)
                .MaxAsync(cancellationToken);
        }

        if (maxPeriod == null)
        {
            _logger.LogInformation("QUIK historyfrom: no source rows, return 0");
            return Content("0", "text/plain");
        }

        var fromLocal = DateTime.SpecifyKind(maxPeriod.Value, DateTimeKind.Local)
            .AddMinutes(-HistoryStartMarginMinutes);
        var fromUnixMs = new DateTimeOffset(fromLocal).ToUnixTimeMilliseconds();
        if (fromUnixMs < 0)
            fromUnixMs = 0;

        _logger.LogInformation(
            "QUIK historyfrom: source={Source}, maxPeriod={MaxPeriod:o}, marginMinutes={MarginMinutes}, fromUnixMs={FromUnixMs}",
            source,
            maxPeriod.Value,
            HistoryStartMarginMinutes,
            fromUnixMs);

        return Content(fromUnixMs.ToString(), "text/plain");
    }

    private static Dictionary<string, int> ResolveTickerIds(IReadOnlyList<string> tickers)
    {
        var result = new Dictionary<string, int>(tickers.Count, StringComparer.OrdinalIgnoreCase);
        foreach (var ticker in tickers)
        {
            if (MarketInfoServiceHolder.TryGetTicker(ticker, out var info))
                result[ticker] = info.id;
        }

        return result;
    }

    private async Task<Dictionary<int, long>> ReadMaxTradesAsync(List<int> ids, CancellationToken cancellationToken)
    {
        if (ids.Count == 0)
            return [];

        ids = ids.Distinct().ToList();

        await using var context = await _contextFactory.CreateDbContextAsync(cancellationToken);
        var result = await context.MaxTrades
            .AsNoTracking()
            .Where(x => ids.Contains(x.Id))
            .ToDictionaryAsync(x => x.Id, x => x.MaxNumber, cancellationToken);
        var maxTradesRows = result.Count;

        var missingIds = ids
            .Where(id => !result.ContainsKey(id))
            .ToList();

        if (missingIds.Count > 0)
        {
            var fallback = await context.Trades
                .AsNoTracking()
                .Where(x => missingIds.Contains(x.Id))
                .GroupBy(x => x.Id)
                .Select(g => new
                {
                    Id = g.Key,
                    MaxNumber = g.Max(t => t.Number)
                })
                .ToListAsync(cancellationToken);

            foreach (var item in fallback)
                result[item.Id] = item.MaxNumber;

            var unresolvedCount = missingIds.Count - fallback.Count;
            _logger.LogInformation(
                "QUIK maxtrades fallback: ids={Ids}, maxTradesRows={MaxTradesRows}, fallbackRows={FallbackRows}, unresolvedRows={UnresolvedRows}",
                ids.Count,
                maxTradesRows,
                fallback.Count,
                unresolvedCount);
        }

        return result;
    }
}
