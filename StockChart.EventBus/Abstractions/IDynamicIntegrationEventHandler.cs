using System.Threading.Tasks;

namespace StockChart.EventBus.Abstractions
{
    /// <summary>
    /// Обработчик динамических событий шины (без привязки к классу)
    /// </summary>
    public interface IDynamicIntegrationEventHandler
    {
        Task Handle(dynamic eventData);
    }
}
