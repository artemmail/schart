using DataProvider.Models;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Channels;
using System.Threading.Tasks;

namespace DataProvider.Services;

public sealed class QuikImportQueueService : BackgroundService, IQuikImportQueue
{
    private readonly Channel<QuikImportBatch> _channel = Channel.CreateBounded<QuikImportBatch>(new BoundedChannelOptions(256)
    {
        SingleReader = true,
        SingleWriter = false,
        FullMode = BoundedChannelFullMode.Wait
    });

    private readonly ITradesCacherRepository _tradesCacher;
    private readonly ILastTradeCache _lastTradeCache;
    private readonly ILogger<QuikImportQueueService> _logger;
    private int _queueDepth;

    public QuikImportQueueService(
        ITradesCacherRepository tradesCacher,
        ILastTradeCache lastTradeCache,
        ILogger<QuikImportQueueService> logger)
    {
        _tradesCacher = tradesCacher;
        _lastTradeCache = lastTradeCache;
        _logger = logger;
    }

    public int QueueDepth => Volatile.Read(ref _queueDepth);

    public async ValueTask EnqueueAsync(QuikImportBatch batch, CancellationToken cancellationToken)
    {
        if (batch == null || batch.Trades.Count == 0)
            return;

        Interlocked.Increment(ref _queueDepth);
        try
        {
            await _channel.Writer.WriteAsync(batch, cancellationToken);
        }
        catch
        {
            Interlocked.Decrement(ref _queueDepth);
            throw;
        }
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await foreach (var batch in _channel.Reader.ReadAllAsync(stoppingToken))
        {
            try
            {
                await ProcessBatchAsync(batch, stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to process QUIK import batch.");
            }
            finally
            {
                Interlocked.Decrement(ref _queueDepth);
            }
        }
    }

    private async Task ProcessBatchAsync(QuikImportBatch batch, CancellationToken cancellationToken)
    {
        if (batch.Trades.Count == 0)
            return;

        foreach (var tickerGroup in batch.Trades
                     .GroupBy(x => x.Ticker, StringComparer.OrdinalIgnoreCase)
                     .OrderBy(g => g.Key, StringComparer.OrdinalIgnoreCase))
        {
            var ticker = TickerKey.Normalize(tickerGroup.Key);
            if (string.IsNullOrEmpty(ticker))
                continue;

            var orderedTrades = tickerGroup
                .OrderBy(x => x.TradeNumber)
                .ThenBy(x => x.TradeTimeMs);

            var hasTickerInfo = MarketInfoServiceHolder.TryGetTicker(ticker, out var tickerInfo);
            if (!hasTickerInfo)
            {
                MarketInfoServiceHolder.RefreshTickers();
                hasTickerInfo = MarketInfoServiceHolder.TryGetTicker(ticker, out tickerInfo);
            }
            long lastNumber = 0;
            if (hasTickerInfo)
                lastNumber = await _lastTradeCache.GetLastTradeNumberAsync(
                    tickerInfo.id,
                    includeTradesFallback: true,
                    cancellationToken: cancellationToken);

            foreach (var trade in orderedTrades)
            {
                if (trade.TradeNumber <= 0 || trade.Price <= 0 || trade.Quantity <= 0)
                    continue;

                if (hasTickerInfo && trade.TradeNumber <= lastNumber)
                    continue;

                var record = ToDbRecord(trade, ticker);
                _tradesCacher.PushTrade(ticker, new Trade(record));
                HostetDBWriterService.Enqueue(0, record);

                if (hasTickerInfo)
                {
                    lastNumber = trade.TradeNumber;
                    _lastTradeCache.UpdateLastTradeNumber(tickerInfo.id, trade.TradeNumber);
                }
            }
        }
    }

    private static DBRecord ToDbRecord(QuikImportTrade trade, string ticker)
    {
        var tradeDate = DateTimeOffset.FromUnixTimeMilliseconds(trade.TradeTimeMs).LocalDateTime;
        var direction = trade.Direction is 0 or 1
            ? trade.Direction
            : ((trade.Flags & 1) == 1 ? 1 : 0);

        return new DBRecord
        {
            ticker = ticker,
            name = ticker,
            market = 0,
            marketcode = trade.ClassCode,
            number = trade.TradeNumber,
            datetime = tradeDate,
            price = trade.Price,
            quantity = trade.Quantity,
            volume = trade.Price * trade.Quantity,
            OI = trade.OpenInterest,
            direction = direction
        };
    }
}
