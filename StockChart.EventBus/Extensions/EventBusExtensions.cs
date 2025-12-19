using System.Threading;
using System.Threading.Tasks;
using StockChart.EventBus.Abstractions;

namespace StockChart.EventBus.Extensions
{
    public static class EventBusExtensions
    {
        public static void Send(this IEventBus bus, object message)
        {
            bus.Send(message.GetType(), new []{message});
        }
        
        public static Task SendAsync(this IEventBus bus, object message, CancellationToken cancellationToken)
        {
            return bus.SendAsync(message.GetType(), new[] { message }, cancellationToken);
        }
    }
}