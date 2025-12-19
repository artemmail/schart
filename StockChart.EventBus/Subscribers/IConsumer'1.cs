using System.Threading;
using System.Threading.Tasks;

namespace StockChart.EventBus.Subscribers
{
    public interface IConsumer<in TMessage> : ISubscriber
        where TMessage : class
    {
        Task ConsumeAsync(TMessage message, CancellationToken cancellationToken);
    }
}