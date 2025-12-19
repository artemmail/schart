using StockChart.EventBus.Models;
using StockChart.EventBus.Subscribers;
using StockChart.Messages;
using System.Threading;
using System.Threading.Tasks;

namespace StockChart.Notification.WebApi.RabbitMQ.Subscriptions;

public class Subscriber : ISubscriber, IConsumer<SubscribeClusterMessage>, IConsumer<SubscribeCandleMessage>
{



    public Subscriber()
    {

    }

    public static SubsCandle[] subscribed_candles = new SubsCandle[0];

    public static SubsCluster[] subscribed_clusters = new SubsCluster[0];



    public async Task ConsumeAsync(SubscribeClusterMessage message, CancellationToken cancellationToken)
    {
        subscribed_clusters = message.body;
    }


    public async Task ConsumeAsync(SubscribeCandleMessage message, CancellationToken cancellationToken)
    {
        subscribed_candles = message.body;

    }

}





