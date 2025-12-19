using Newtonsoft.Json;
using StockChart.EventBus.Models;
using StockChart.EventBus.Subscribers;
using SignalRMvc.Hubs;
using StockChart.Extentions;
using StockChart.Messages;
using StockChart.Repository;
using StockChart.Repository.Services;

namespace StockChart.Notification.WebApi.RabbitMQ.Subscriptions;

public class ClusterSubscriber : ISubscriber, IConsumer<ClusterMessage>, IConsumer<CandleMessage>, IConsumer<TickerMessage>
{
    private readonly CandlesHub _uptimeHub;
    private readonly IClusterRepository _clusterRepository;
    private readonly ICandlesRepository _candlesRepository;
    private readonly ITickersRepository _tickersRepository;
    private readonly ILogger<ClusterSubscriber> _logger;

    public ClusterSubscriber(
        CandlesHub uptimeHub,
        IServiceProvider serviceProvider,
        ILogger<ClusterSubscriber> logger)
    {
        _uptimeHub = uptimeHub;
        IServiceScope scope = serviceProvider.CreateScope();
        _tickersRepository = scope.ServiceProvider.GetRequiredService<ITickersRepository>();
        _candlesRepository = scope.ServiceProvider.GetRequiredService<ICandlesRepository>();
        _clusterRepository = scope.ServiceProvider.GetRequiredService<IClusterRepository>();
        _logger = logger;
    }

    public async Task ConsumeAsync(ClusterMessage message, CancellationToken cancellationToken)
    {
        await ConsumeMessageAsync(
            message.body,
            ProcessClusterAsync,
            "Error processing ClusterMessage",
            cancellationToken);
    }

    public async Task ConsumeAsync(TickerMessage message, CancellationToken cancellationToken)
    {
        await ConsumeMessageAsync(
            message.body,
            ProcessTickerAsync,
            "Error processing TickerMessage",
            cancellationToken);
    }

    public async Task ConsumeAsync(CandleMessage message, CancellationToken cancellationToken)
    {
        await ConsumeMessageAsync(
            message.body,
            ProcessCandleAsync,
            "Error processing CandleMessage",
            cancellationToken);
    }

    private async Task ConsumeMessageAsync<T>(
        IDictionary<string, T> body,
        Func<string, T, Task> processMethod,
        string logMessage,
        CancellationToken cancellationToken)
    {
        if (_uptimeHub.Clients == null)
            return;

        var tasks = body.Select(kvp => processMethod(kvp.Key, kvp.Value));

        try
        {
            await Task.WhenAll(tasks);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "{LogMessage}", logMessage);
        }
    }

    private async Task ProcessClusterAsync(string key, List<ClusterColumnWCF> body)
    {
        var subsCluster = SubsCluster.Parse(key);

        if (!_tickersRepository.Tickers.TryGetValue(subsCluster.ticker.ToUpper(), out var ticker))
        {
            _logger.LogWarning("Ticker not found: {Ticker}", subsCluster.ticker);
            return;
        }

        var groupName = subsCluster.ToString();
        var period = subsCluster.period.GetValueOrDefault();

        if ((ticker.Market == 20 && period > 60) || period > 1440)
        {
            if (subsCluster.step == 0)
            {
                var candles = await _candlesRepository.GetLastCandles(ticker.Id, period, 3);
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

                await _uptimeHub.Clients.Group(groupName).SendCoreAsync("recieveCluster", new object[] { list });
            }
            else
            {
                var clusters = await _clusterRepository.GetLastCluster(ticker.Id, (decimal)period, subsCluster.step, 3);
                await _uptimeHub.Clients.Group(groupName).SendCoreAsync("recieveCluster", new object[] { clusters });
            }
        }
        else
        {
            await _uptimeHub.Clients.Group(groupName).SendCoreAsync("recieveCluster", new object[] { body });
        }
    }

    private async Task ProcessTickerAsync(string key, List<tick> body)
    {
        var subsCluster = SubsCluster.Parse(key);
        var groupName = subsCluster.ToString();

        await _uptimeHub.Clients.Group(groupName).SendCoreAsync("recieveTicks", new object[] { body });
    }

    private async Task ProcessCandleAsync(string key, List<BaseCandle> body)
    {
        var subsCandle = SubsCandle.Parse(key);

        if (!_tickersRepository.Tickers.TryGetValue(subsCandle.ticker.ToUpper(), out var ticker))
        {
            _logger.LogWarning("Ticker not found: {Ticker}", subsCandle.ticker);
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
            candles = (await _candlesRepository.GetLastCandles(ticker.Id, period, 3)).Cast<BaseCandle>().ToList();
        }

        var result = new
        {
            key = new { subsCandle.ticker, subsCandle.period },
            data = CandlePacker.PackCandlesResult(candles, false)
        };

        var groupName = subsCandle.ToString();

        await _uptimeHub.Clients.Group(groupName).SendCoreAsync("recieveCandle", new object[] { JsonConvert.SerializeObject(result) });
    }
}
