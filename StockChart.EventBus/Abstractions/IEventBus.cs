using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using StockChart.EventBus.Subscribers;

namespace StockChart.EventBus.Abstractions
{
    /// <summary>
    /// Абстракция над реализацией шины событий (то, что видит потребитель)
    /// </summary>
    public interface IEventBus
    {
        /// <summary>
        /// Подписаться на событие
        /// </summary>
        /// <param name="subscriber"></param>
        void Subscribe(ISubscriber subscriber);

        /// <summary>
        /// Отписаться от события
        /// </summary>
        /// <param name="subscriber"></param>
        void Unsubscribe(ISubscriber subscriber);

        /// <summary>
        /// Запустить шину с выбранными подписантами
        /// </summary>
        /// <param name="subscribers"></param>
        void Start(IEnumerable<ISubscriber> subscribers);

        /// <summary>
        /// Отправить сообщение
        /// </summary>
        void Send(Type messageType, IEnumerable<object> messages);
        
        /// <summary>
        /// Отправить сообщение
        /// </summary>
        Task SendAsync(Type messageType, IEnumerable<object> messages, CancellationToken cancellationToken);
    }
}
