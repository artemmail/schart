using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.DependencyInjection;
using Newtonsoft.Json;
using SignalRMvc.Hubs;
using StockChart.EventBus.Models;
using StockChart.EventBus.Subscribers;
using StockChart.Extentions;
using StockChart.Messages;
using StockChart.Repository;
using StockChart.Repository.Services;

namespace StockChart.Notification.WebApi.RabbitMQ.Subscriptions;

public class ClusterSubscriber : ISubscriber, IConsumer<ClusterMessage>, IConsumer<CandleMessage>, IConsumer<TickerMessage>
{
    private readonly IHubContext<CandlesHub> _hubContext;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ITickersRepository _tickersRepository;
    private readonly ILogger<ClusterSubscriber> _logger;

    public ClusterSubscriber(
        IHubContext<CandlesHub> hubContext,
        IServiceScopeFactory scopeFactory,
        ITickersRepository tickersRepository,
        ILogger<ClusterSubscriber> logger)
    {
        _hubContext = hubContext;
        _scopeFactory = scopeFactory;
        _tickersRepository = tickersRepository;
        _logger = logger;
    }

    public async Task ConsumeAsync(ClusterMessage message, CancellationToken cancellationToken)
    {
        await ConsumeMessageAsync(
            message.body,
            ProcessClusterAsync,
            "ClusterMessage",
            "Error processing ClusterMessage",
            cancellationToken);
    }

    public async Task ConsumeAsync(TickerMessage message, CancellationToken cancellationToken)
    {
        await ConsumeMessageAsync(
            message.body,
            ProcessTickerAsync,
            "TickerMessage",
            "Error processing TickerMessage",
            cancellationToken);
    }

    public async Task ConsumeAsync(CandleMessage message, CancellationToken cancellationToken)
    {
        await ConsumeMessageAsync(
            message.body,
            ProcessCandleAsync,
            "CandleMessage",
            "Error processing CandleMessage",
            cancellationToken);
    }

    private async Task ConsumeMessageAsync<T>(
        IDictionary<string, T>? body,
        Func<string, T, Task> processMethod,
        string messageType,
        string logMessage,
        CancellationToken cancellationToken)
    {
        if (body == null || body.Count == 0)
        {
            SignalRFlowFileLogger.Write(
                "StockChart.ClusterSubscriber.Receive",
                $"type={messageType}; keys=0");
            return;
        }

        var sampleKeys = string.Join(",", body.Keys.Take(5));
        _logger.LogInformation(
            "Received {MessageType} keys={KeysCount}",
            messageType,
            body.Count);
        SignalRFlowFileLogger.Write(
            "StockChart.ClusterSubscriber.Receive",
            $"type={messageType}; keys={body.Count}; sampleKeys={sampleKeys}");

        var tasks = body.Select(kvp => processMethod(kvp.Key, kvp.Value));

        try
        {
            await Task.WhenAll(tasks);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "{LogMessage}", logMessage);
            SignalRFlowFileLogger.Write(
                "StockChart.ClusterSubscriber.Error",
                $"{messageType}: {ex.Message}");
        }
    }

    private async Task ProcessClusterAsync(string key, List<ClusterColumnWCF> body)
    {
        if (body == null)
        {
            SignalRFlowFileLogger.Write(
                "StockChart.ClusterSubscriber.DispatchCluster",
                $"key={key}; payload=null");
            return;
        }

        var subsCluster = SubsCluster.Parse(key);
        subsCluster.ticker = NormalizeTickerForHub(subsCluster.ticker);

        if (!_tickersRepository.Tickers.TryGetValue(subsCluster.ticker.ToUpperInvariant(), out var ticker))
        {
            _logger.LogWarning("Ticker not found: {Ticker}", subsCluster.ticker);
            SignalRFlowFileLogger.Write(
                "StockChart.ClusterSubscriber.DispatchCluster",
                $"key={key}; status=ticker_not_found");
            return;
        }

        var groupName = subsCluster.ToString();
        var aliasGroupName = TryBuildAliasClusterKey(subsCluster, ticker);
        var period = subsCluster.period.GetValueOrDefault();

        if ((ticker.Market == 20 && period > 60) || period > 1440)
        {
            using var scope = _scopeFactory.CreateScope();

            if (subsCluster.step == 0)
            {
                var candlesRepository = scope.ServiceProvider.GetRequiredService<ICandlesRepository>();
                var candles = await candlesRepository.GetLastCandles(ticker.Id, period, 3);
                var list = candles.Select(row => new ClusterColumnBase
                {
                    x = row.Period,
                    o = row.OpnPrice,
                    c = row.ClsPrice,
                    l = row.MinPrice,
                    h = row.MaxPrice,
                    oi = row.Oi,
                    q = row.Quantity,
                    bq = row.BuyQuantity,
                    v = row.Volume,
                    bv = row.BuyVolume
                }).ToList();

                var tasks = new List<Task>
                {
                    _hubContext.Clients.Group(groupName).SendCoreAsync("receiveCluster", new object[] { list }),
                    _hubContext.Clients.Group(groupName).SendCoreAsync(
                        "receiveClusterEnvelope",
                        new object[] { new { key = groupName, data = (object)list } })
                };

                if (!string.IsNullOrEmpty(aliasGroupName))
                {
                    tasks.Add(_hubContext.Clients.Group(groupName).SendCoreAsync(
                        "receiveClusterEnvelope",
                        new object[] { new { key = aliasGroupName, data = (object)list } }));
                }

                await Task.WhenAll(tasks);

                SignalRFlowFileLogger.Write(
                    "StockChart.ClusterSubscriber.DispatchCluster",
                    $"group={groupName}; aliasGroup={aliasGroupName ?? "none"}; sourceItems={body.Count}; sentItems={list.Count}; mode=rebuild_candles");
            }
            else
            {
                var clusterRepository = scope.ServiceProvider.GetRequiredService<IClusterRepository>();
                var clusters = await clusterRepository.GetLastCluster(ticker.Id, (decimal)period, subsCluster.step, 3);
                var tasks = new List<Task>
                {
                    _hubContext.Clients.Group(groupName).SendCoreAsync("receiveCluster", new object[] { clusters }),
                    _hubContext.Clients.Group(groupName).SendCoreAsync(
                        "receiveClusterEnvelope",
                        new object[] { new { key = groupName, data = (object)clusters } })
                };

                if (!string.IsNullOrEmpty(aliasGroupName))
                {
                    tasks.Add(_hubContext.Clients.Group(groupName).SendCoreAsync(
                        "receiveClusterEnvelope",
                        new object[] { new { key = aliasGroupName, data = (object)clusters } }));
                }

                await Task.WhenAll(tasks);

                SignalRFlowFileLogger.Write(
                    "StockChart.ClusterSubscriber.DispatchCluster",
                    $"group={groupName}; aliasGroup={aliasGroupName ?? "none"}; sourceItems={body.Count}; sentItems={clusters.Count}; mode=rebuild_clusters");
            }
        }
        else
        {
            var tasks = new List<Task>
            {
                _hubContext.Clients.Group(groupName).SendCoreAsync("receiveCluster", new object[] { body }),
                _hubContext.Clients.Group(groupName).SendCoreAsync(
                    "receiveClusterEnvelope",
                    new object[] { new { key = groupName, data = (object)body } })
            };

            if (!string.IsNullOrEmpty(aliasGroupName))
            {
                tasks.Add(_hubContext.Clients.Group(groupName).SendCoreAsync(
                    "receiveClusterEnvelope",
                    new object[] { new { key = aliasGroupName, data = (object)body } }));
            }

            await Task.WhenAll(tasks);

            SignalRFlowFileLogger.Write(
                "StockChart.ClusterSubscriber.DispatchCluster",
                $"group={groupName}; aliasGroup={aliasGroupName ?? "none"}; sourceItems={body.Count}; sentItems={body.Count}; mode=realtime");
        }
    }

    private async Task ProcessTickerAsync(string key, List<tick> body)
    {
        if (body == null)
        {
            SignalRFlowFileLogger.Write(
                "StockChart.ClusterSubscriber.DispatchTicks",
                $"key={key}; payload=null");
            return;
        }

        var subsCluster = SubsCluster.Parse(key);
        subsCluster.ticker = NormalizeTickerForHub(subsCluster.ticker);
        var groupName = subsCluster.ToString();
        var aliasGroupName = TryBuildAliasClusterKey(subsCluster);

        var tasks = new List<Task>
        {
            _hubContext.Clients.Group(groupName).SendCoreAsync("receiveTicks", new object[] { body }),
            _hubContext.Clients.Group(groupName).SendCoreAsync(
                "receiveTicksEnvelope",
                new object[] { new { key = groupName, data = (object)body } })
        };

        if (!string.IsNullOrEmpty(aliasGroupName))
        {
            tasks.Add(_hubContext.Clients.Group(groupName).SendCoreAsync(
                "receiveTicksEnvelope",
                new object[] { new { key = aliasGroupName, data = (object)body } }));
        }

        await Task.WhenAll(tasks);

        SignalRFlowFileLogger.Write(
            "StockChart.ClusterSubscriber.DispatchTicks",
            $"group={groupName}; aliasGroup={aliasGroupName ?? "none"}; sentItems={body.Count}");
    }

    private async Task ProcessCandleAsync(string key, List<BaseCandle> body)
    {
        if (body == null)
        {
            SignalRFlowFileLogger.Write(
                "StockChart.ClusterSubscriber.DispatchCandle",
                $"key={key}; payload=null");
            return;
        }

        var subsCandle = SubsCandle.Parse(key);
        subsCandle.ticker = NormalizeTickerForHub(subsCandle.ticker);

        if (!_tickersRepository.Tickers.TryGetValue(subsCandle.ticker.ToUpperInvariant(), out var ticker))
        {
            _logger.LogWarning("Ticker not found: {Ticker}", subsCandle.ticker);
            SignalRFlowFileLogger.Write(
                "StockChart.ClusterSubscriber.DispatchCandle",
                $"key={key}; status=ticker_not_found");
            return;
        }

        if (body is not List<BaseCandle> candles)
        {
            _logger.LogWarning("Invalid candle data for key: {Key}", key);
            return;
        }

        var period = subsCandle.period.GetValueOrDefault();

        if ((ticker.Market == 20 && period > 60) || period > 1440)
        {
            using var scope = _scopeFactory.CreateScope();
            var candlesRepository = scope.ServiceProvider.GetRequiredService<ICandlesRepository>();
            candles = (await candlesRepository.GetLastCandles(ticker.Id, period, 3)).Cast<BaseCandle>().ToList();
        }

        var result = new
        {
            key = new { subsCandle.ticker, subsCandle.period },
            data = CandlePacker.PackCandlesResult(candles, false)
        };

        var groupName = subsCandle.ToString();

        await _hubContext.Clients.Group(groupName).SendCoreAsync("recieveCandle", new object[] { JsonConvert.SerializeObject(result) });
        SignalRFlowFileLogger.Write(
            "StockChart.ClusterSubscriber.DispatchCandle",
            $"group={groupName}; sourceItems={body.Count}; sentItems={candles.Count}");
    }

    private string NormalizeTickerForHub(string? ticker)
    {
        if (string.IsNullOrWhiteSpace(ticker))
        {
            return string.Empty;
        }

        var trimmed = ticker.Trim();
        var upperTicker = trimmed.ToUpperInvariant();

        if (_tickersRepository.Tickers.TryGetValue(upperTicker, out var dictionaryTicker) &&
            !string.IsNullOrWhiteSpace(dictionaryTicker.Securityid))
        {
            return dictionaryTicker.Securityid.Trim();
        }

        return trimmed;
    }

    private string? TryBuildAliasClusterKey(SubsCluster subscription, StockChart.Model.Dictionary? tickerInfo = null)
    {
        var ticker = subscription.ticker;
        if (string.IsNullOrWhiteSpace(ticker) || ticker.Length <= 2)
        {
            return null;
        }

        var market = tickerInfo?.Market;
        if (!market.HasValue &&
            _tickersRepository.Tickers.TryGetValue(ticker.ToUpperInvariant(), out var fromRepoTickerInfo))
        {
            market = fromRepoTickerInfo.Market;
        }

        if ((market ?? 0) != 1)
        {
            return null;
        }

        var aliasTicker = ticker.Substring(0, 2);
        var aliasKey = new SubsCluster
        {
            ticker = aliasTicker,
            period = subscription.period,
            step = subscription.step
        }.ToString();

        return string.Equals(aliasKey, subscription.ToString(), StringComparison.Ordinal)
            ? null
            : aliasKey;
    }
}
