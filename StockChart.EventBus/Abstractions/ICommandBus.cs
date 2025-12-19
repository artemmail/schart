using System.Threading.Tasks;
using StockChart.EventBus.Events;
using StockChart.EventBus.Subscribers;

namespace StockChart.EventBus.Abstractions
{
    /// <summary>
    /// Абстракция над реализацией шины запросов данных (то, что видит потребитель)
    /// </summary>
    public interface ICommandBus
    {
        /// <summary>
        /// Запросить данные через шину
        /// </summary>
        Task<TIntegrationResponse> RequestAsync<TIntegrationResponse>(IntegrationEvent @event) 
            where TIntegrationResponse : class, new();

        /// <summary>
        /// Подписаться на событие
        /// </summary>
        /// <param name="subscriber"></param>
        void Subscribe(ISubscriber subscriber);

        void Subscribe<T, TH>()
             where T : IntegrationEvent
             where TH : class, IIntegrationCommandHandler<T>;

        /// <summary>
        /// Отписаться от события
        /// </summary>
        /// <param name="subscriber"></param>
        void Unsubscribe(ISubscriber subscriber);
    }
}