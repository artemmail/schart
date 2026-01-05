using Microsoft.Extensions.Logging;
using Polly.Retry;
using StockChart.EventBus.Abstractions;
using StockChart.EventBus.RabbitMQ.Components;
using StockChart.EventBus.Subscribers;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace StockChart.EventBus.RabbitMQ
{
    public class EventBusRabbitMq : IEventBus, IDisposable
    {
        private readonly IRabbitMqPersistentConnection _persistentConnection;
        private readonly ISubscriptionRepository _repository;
        private readonly ILogger<EventBusRabbitMq> _logger;
        private readonly int _retryCount;

        private readonly RetryPolicy _policy;
        private readonly ChannelQueueAsync _channel;

        private int _initialized;


        private string _routingKey;

        public EventBusRabbitMq(
            IRabbitMqPersistentConnection persistentConnection,
            ISubscriptionRepository repository,
            ILogger<EventBusRabbitMq> logger,
            string brokerName,
            string exchangeType,
            string queueName,
            int retryCount = 5,
            int prefetchCount = 20)
        {
            _persistentConnection = persistentConnection ?? throw new ArgumentNullException(nameof(persistentConnection));
            _repository = repository;
            _logger = logger;
            _retryCount = retryCount;

            ExchangeConf conf;

        l1:
            try
            {
                conf = ExchangeConf.Create(brokerName, queueName, exchangeType, prefetchCount, retryCount);
                _channel = new ChannelQueueAsync(_persistentConnection, conf, _repository);

                _channel.Logger = logger;
            }
            catch (Exception ex)
            {
                logger.LogError("rabbit!", ex);
                Thread.Sleep(5000);
                  goto l1;
            }
        }

        public void Subscribe(ISubscriber subscriber)
        {

            var desc = _repository.Add(subscriber);
            foreach (var descConsumableMessageType in desc.ConsumableMessageTypes)
            {
                _channel.Bind(descConsumableMessageType);
            }
        }

        public void Unsubscribe(ISubscriber subscriber)
        {
            var desc = _repository.Get(subscriber);

            if (desc == null)
                return;

            _repository.Remove(subscriber);

            foreach (var descConsumableMessageType in desc.ConsumableMessageTypes)
            {
                if (_repository.SupportedMessageTypes.Contains(descConsumableMessageType))
                    continue;

                _channel.Unbind(descConsumableMessageType);
            }

            if (!_repository.SupportedMessageTypes.Any())
            {
                _channel.Close();
            }
        }

        /// <summary>
        /// Запустить шину с выбранными подписантами
        /// </summary>
        /// <param name="subscribers"></param>
        public void Start(IEnumerable<ISubscriber> subscribers)
        {

            foreach (var subscriber in subscribers)
            {
                this.Subscribe(subscriber);
            }

            this._channel.Start();
        }

        /// <summary>
        /// Отправить сообщение
        /// </summary>
        public void Send(Type messageType, IEnumerable<object> messages)
        {

            foreach (var message in messages)
            {
                _channel.Publish(messageType, message);
            }
        }

        /// <summary>
        /// Отправить сообщение
        /// </summary>
        public Task SendAsync(Type messageType, IEnumerable<object> messages, CancellationToken cancellationToken)
        {
            //return;
            return Task.Run(() => { Send(messageType, messages); }, cancellationToken);
        }

        public void Dispose()
        {
            _channel.Dispose();

            _repository.Clear();
        }
    }
}