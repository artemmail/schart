using System.Threading.Tasks;
using StockChart.EventBus.Events;

namespace StockChart.EventBus.Abstractions
{
    /// <summary>
    /// Обработчик запросов данных, идущих через шину
    /// </summary>
    public interface IIntegrationCommandHandler<in TIntegrationCommand> 
        where TIntegrationCommand : IntegrationEvent
    {
        /// <summary>
        /// Обработать запрос
        /// </summary>
        Task<object> Handle(TIntegrationCommand command);
    }
}