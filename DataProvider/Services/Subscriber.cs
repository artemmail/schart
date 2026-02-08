using StockChart.EventBus.Models;
using StockChart.EventBus.Subscribers;
using StockChart.Messages;
using Microsoft.Extensions.Logging;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace StockChart.Notification.WebApi.RabbitMQ.Subscriptions;

public class Subscriber : ISubscriber, IConsumer<SubscribeClusterMessage>, IConsumer<SubscribeCandleMessage>
{
    private readonly ILogger<Subscriber> _logger;

    public Subscriber(ILogger<Subscriber> logger)
    {
        _logger = logger;
    }

    public static SubsCandle[] subscribed_candles = Array.Empty<SubsCandle>();

    public static SubsCluster[] subscribed_clusters = Array.Empty<SubsCluster>();



    public Task ConsumeAsync(SubscribeClusterMessage message, CancellationToken cancellationToken)
    {
        subscribed_clusters = message.body ?? Array.Empty<SubsCluster>();
        var sample = string.Join(",", subscribed_clusters.Take(5).Select(x => x.ToString()));

        _logger.LogInformation(
            "Received SubscribeClusterMessage subscriptions={Subscriptions}",
            subscribed_clusters.Length);
        SignalRFlowFileLogger.Write(
            "DataProvider.Subscriber.SubscribeCluster",
            $"subscriptions={subscribed_clusters.Length}; sample={sample}");

        return Task.CompletedTask;
    }


    public Task ConsumeAsync(SubscribeCandleMessage message, CancellationToken cancellationToken)
    {
        subscribed_candles = message.body ?? Array.Empty<SubsCandle>();
        var sample = string.Join(",", subscribed_candles.Take(5).Select(x => x.ToString()));

        _logger.LogInformation(
            "Received SubscribeCandleMessage subscriptions={Subscriptions}",
            subscribed_candles.Length);
        SignalRFlowFileLogger.Write(
            "DataProvider.Subscriber.SubscribeCandle",
            $"subscriptions={subscribed_candles.Length}; sample={sample}");

        return Task.CompletedTask;
    }

}





