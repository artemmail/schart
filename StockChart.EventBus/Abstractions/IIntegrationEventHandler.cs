using System.Threading.Tasks;
using StockChart.EventBus.Events;

namespace StockChart.EventBus.Abstractions
{
    /// <summary>
    /// Обработчик событий, приходящих из шины
    /// </summary>
    public interface IIntegrationEventHandler<in TIntegrationEvent>
        where TIntegrationEvent: IntegrationEvent
    {
        Task Handle(TIntegrationEvent @event);
    }
}
