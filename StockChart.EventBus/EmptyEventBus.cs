using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using StockChart.EventBus.Abstractions;
using StockChart.EventBus.Events;
using StockChart.EventBus.Subscribers;

namespace StockChart.EventBus
{
    /// <summary>
    /// Затычка для выключенной шины
    /// </summary>
    public class EmptyEventBus : IEventBus, ICommandBus
    {
        private readonly ILogger<EmptyEventBus> _logger;

        public EmptyEventBus(ILogger<EmptyEventBus> logger)
        {
            _logger = logger;
        }

        /// <summary>
        /// Подписаться на событие
        /// </summary>
        /// <param name="subscriber"></param>
        public void Subscribe(ISubscriber subscriber)
        {
            _logger.LogInformation($"Added subscriber: {JsonConvert.SerializeObject(subscriber.GetType().FullName)}.");
        }

        /// <summary>
        /// Отписаться от события
        /// </summary>
        /// <param name="subscriber"></param>
        public void Unsubscribe(ISubscriber subscriber)
        {
            _logger.LogInformation($"Deleted subscriber: {JsonConvert.SerializeObject(subscriber.GetType().FullName)}.");
        }

        /// <summary>
        /// Запустить шину с выбранными подписантами
        /// </summary>
        /// <param name="subscribers"></param>
        public void Start(IEnumerable<ISubscriber> subscribers)
        {
            _logger.LogInformation($"Event bus started.");
        }

        /// <summary>
        /// Отправить сообщение
        /// </summary>
        public void Send(Type messageType, IEnumerable<object> messages)
        {
            var message = string.Join("; ", messages.Select(JsonConvert.SerializeObject));
            _logger.LogInformation($"Logged event of type ${messageType.FullName}: {message}.");
        }

        /// <summary>
        /// Отправить сообщение
        /// </summary>
        public async Task SendAsync(Type messageType, IEnumerable<object> messages, CancellationToken cancellationToken)
        {
            var message = string.Join("; ", messages.Select(JsonConvert.SerializeObject));
            _logger.LogInformation($"Logged event of type ${messageType.FullName}: {message}.");
        }

        /// <summary>
        /// Запросить данные через шину
        /// </summary>
        public async Task<TIntegrationResponse> RequestAsync<TIntegrationResponse>(IntegrationEvent @event) where TIntegrationResponse : class, new()
        {
            _logger.LogInformation($"Logged request: {JsonConvert.SerializeObject(@event)}.");
            throw new NotImplementedException();
        }

        /// <summary>
        /// Подписаться на запрос данных (по типу)
        /// </summary>
        public void Subscribe<T, TH>() where T : IntegrationEvent where TH : class, IIntegrationCommandHandler<T>
        {
            _logger.LogInformation($"Added subscriber: {JsonConvert.SerializeObject(typeof(TH).FullName)}.");
        }

        /// <summary>
        /// Отписаться от обработки запроса
        /// </summary>
        public void Unsubscribe<T, TH>() where T : IntegrationEvent where TH : class, IIntegrationCommandHandler<T>
        {
            _logger.LogInformation($"Deleted subscriber: {JsonConvert.SerializeObject(typeof(TH).FullName)}.");
        }
    }
}
