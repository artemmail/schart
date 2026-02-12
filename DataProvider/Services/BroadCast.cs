using Newtonsoft.Json;
using StockChart.EventBus.Abstractions;
using Microsoft.Extensions.Logging;
using StockChart.Notification.WebApi.RabbitMQ.Subscriptions;
using StockChart.Messages;
using DataProvider.Services;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

public class BroadCastOptions
{
    public string? apiPath { get; set; }
}

public class BroadCast : IBroadCast
{
    private readonly ITradesCacherRepository _tradesCacher;
    private readonly IEventBus _bus;
    private readonly ILogger<BroadCast> _logger;

    public BroadCast(ITradesCacherRepository tradesCacher, IEventBus bus, ILogger<BroadCast> logger)
    {
        _bus = bus;
        _tradesCacher = tradesCacher;
        _logger = logger;
    }

    public async Task BroadCastCandles(HashSet<string> list)
    {
        try
        {
            var changedTickersCount = list?.Count ?? 0;
            var normalizedTickers = NormalizeChangedTickers(list);

            await BroadCastClustersCore(normalizedTickers, changedTickersCount);
            var array = Subscriber.subscribed_candles
                .Where(x => ContainsTicker(normalizedTickers, x.ticker))
                .ToArray();

            if (array.Any())
            {
                var payload = _tradesCacher.CandlesQueryBatch(array, 3);
                var payloadKeys = payload?.Count ?? 0;
                var sampleKeys = payload == null
                    ? string.Empty
                    : string.Join(",", payload.Keys.Take(5));

                _logger.LogInformation(
                    "BroadcastCandles changed={ChangedTickers} subscriptions={Subscriptions} payloadKeys={PayloadKeys}",
                    changedTickersCount,
                    array.Length,
                    payloadKeys);
                SignalRFlowFileLogger.Write(
                    "DataProvider.BroadCastCandles",
                    $"changed={changedTickersCount}; subscriptions={array.Length}; payloadKeys={payloadKeys}; sampleKeys={sampleKeys}");

                await _bus.SendAsync(
                    typeof(CandleMessage),
                    new List<CandleMessage> { new CandleMessage { body = payload } },
                    CancellationToken.None);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "BroadcastCandles failed");
            SignalRFlowFileLogger.Write("DataProvider.BroadCastCandles.Error", ex.ToString());
        }
    }


    public async Task BroadCastClusters(HashSet<string> list)
    {
        var changedTickersCount = list?.Count ?? 0;
        var normalizedTickers = NormalizeChangedTickers(list);
        await BroadCastClustersCore(normalizedTickers, changedTickersCount);
    }

    private async Task BroadCastClustersCore(HashSet<string> normalizedTickers, int changedTickersCount)
    {
        var clusterSubscriptions = Subscriber.subscribed_clusters
            .Where(x => ContainsTicker(normalizedTickers, x.ticker) && x.period > 0)
            .ToArray();
        if (clusterSubscriptions.Any())
        {
            var payload = _tradesCacher.ClustersQueryBatch(clusterSubscriptions, 3);
            var payloadKeys = payload?.Count ?? 0;
            var sampleKeys = payload == null
                ? string.Empty
                : string.Join(",", payload.Keys.Take(5));

            _logger.LogInformation(
                "BroadcastClusters changed={ChangedTickers} subscriptions={Subscriptions} payloadKeys={PayloadKeys}",
                changedTickersCount,
                clusterSubscriptions.Length,
                payloadKeys);
            SignalRFlowFileLogger.Write(
                "DataProvider.BroadCastClusters",
                $"changed={changedTickersCount}; subscriptions={clusterSubscriptions.Length}; payloadKeys={payloadKeys}; sampleKeys={sampleKeys}");

            await _bus.SendAsync(
                typeof(ClusterMessage),
                new List<ClusterMessage> { new ClusterMessage { body = payload } },
                CancellationToken.None);
        }

        var tickSubscriptions = Subscriber.subscribed_clusters
            .Where(x => ContainsTicker(normalizedTickers, x.ticker) && x.period == 0)
            .ToArray();
        if (tickSubscriptions.Any())
        {
            var payload = _tradesCacher.TickersQueryBatch(tickSubscriptions);
            var payloadKeys = payload?.Count ?? 0;
            var sampleKeys = payload == null
                ? string.Empty
                : string.Join(",", payload.Keys.Take(5));

            _logger.LogInformation(
                "BroadcastTicks changed={ChangedTickers} subscriptions={Subscriptions} payloadKeys={PayloadKeys}",
                changedTickersCount,
                tickSubscriptions.Length,
                payloadKeys);
            SignalRFlowFileLogger.Write(
                "DataProvider.BroadCastTicks",
                $"changed={changedTickersCount}; subscriptions={tickSubscriptions.Length}; payloadKeys={payloadKeys}; sampleKeys={sampleKeys}");

            await _bus.SendAsync(
                typeof(TickerMessage),
                new List<TickerMessage> { new TickerMessage { body = payload } },
                CancellationToken.None);
        }
    }

    private static HashSet<string> NormalizeChangedTickers(IEnumerable<string>? tickers)
    {
        if (tickers == null)
        {
            return new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        }

        return tickers
            .Select(TickerKey.Normalize)
            .Where(x => !string.IsNullOrEmpty(x))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
    }

    private static bool ContainsTicker(HashSet<string> normalizedTickers, string? ticker)
    {
        var normalizedTicker = TickerKey.Normalize(ticker);
        return !string.IsNullOrEmpty(normalizedTicker) && normalizedTickers.Contains(normalizedTicker);
    }

}
