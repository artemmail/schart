using System;
using System.Collections.Generic;
using StockChart.EventBus.Abstractions;
using StockChart.EventBus.Events;

namespace StockChart.EventBus.Managers
{
    /// <summary>
    /// Менеджер подписок на запросы данных через шину
    /// </summary>
    public interface ICommandBusSubscriptionsManager
    {
        bool IsEmpty { get; }

        event EventHandler<string> OnEventRemoved;
        
        /// <summary>
        /// Добавить обработчик на событие
        /// </summary>
        void AddSubscription<T, TH>() 
            where T : IntegrationEvent 
            where TH : IIntegrationCommandHandler<T>;

        /// <summary>
        /// Удалить обработчик на событие
        /// </summary>
        void RemoveSubscription<T, TH>()
            where T : IntegrationEvent
            where TH : IIntegrationCommandHandler<T>;

        /// <summary>
        /// Имеются ли подписчики на событие
        /// </summary>
        bool HasSubscriptionsForEvent<T>() where T : IntegrationEvent;

        /// <summary>
        /// Имеются ли подписчики на событие
        /// </summary>
        bool HasSubscriptionsForEvent(string eventName);

        /// <summary>
        /// Получить тип сообщения по его имени
        /// </summary>
        Type GetEventTypeByName(string eventName);

        /// <summary>
        /// Очистить список обработчиков
        /// </summary>
        void Clear();

        /// <summary>
        /// Получить обработчики на событие
        /// </summary>
        IEnumerable<SubscriptionInfo> GetHandlersForEvent<T>() where T : IntegrationEvent;

        /// <summary>
        /// Получить обработчики на событие
        /// </summary>
        IEnumerable<SubscriptionInfo> GetHandlersForEvent(string eventName);

        /// <summary>
        /// Получить название события
        /// </summary>
        string GetEventKey<T>();
    }
}