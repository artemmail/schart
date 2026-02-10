using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Newtonsoft.Json;
using StockChart.EventBus.Subscribers;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;
using System;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace StockChart.EventBus.RabbitMQ.Components
{
    public class ChannelQueueAsync : IDisposable
    {
        private IChannel _channel;
        private readonly IRabbitMqPersistentConnection _connection;
        private readonly ExchangeConf _configuration;
        private readonly ISubscriptionRepository _repository;

        public ChannelQueueAsync(
            IRabbitMqPersistentConnection connection,
            ExchangeConf configuration,
            ISubscriptionRepository repository)
        {
            _connection = connection;
            _configuration = configuration;
            _repository = repository;
            this.Declare();
        }

        private ILogger _logger = NullLogger.Instance;

        public ILogger Logger
        {
            get => _logger;
            set
            {
                _logger = value;
                _configuration.Logger = value;
            }
        }

        public void Close()
        {
            _channel
                .CloseAsync(CancellationToken.None)
                .GetAwaiter()
                .GetResult();
        }

        public void Bind(Type key)
        {
            if (_repository.SupportedMessageTypes.Contains(key))
            {
                _configuration.Bind(_channel, key.FullName);
            }
        }

        public void Unbind(Type key)
        {
            if (!_repository.SupportedMessageTypes.Contains(key))
            {
                _configuration.Unbind(_channel, key.FullName);
            }
        }

        public void Start()
        {
            var consumer = new AsyncEventingBasicConsumer(_channel);
            consumer.ReceivedAsync += Received_Handle;
            _channel
                .BasicConsumeAsync(
                    queue: _configuration.Queue,
                    autoAck: false,
                    consumerTag: string.Empty,
                    noLocal: false,
                    exclusive: RabbitMQConstants.DECLARE_CONSUMER_AS_EXCLUSIVE,
                    arguments: null,
                    consumer: consumer,
                    cancellationToken: CancellationToken.None)
                .GetAwaiter()
                .GetResult();
        }

        public void Declare()
        {
            if (!_connection.IsConnected)
                _connection.TryConnect();

            _channel = _connection.CreateChannel();

            _configuration.Declare(_channel);

            _channel.CallbackExceptionAsync += Exception_Handle;
        }

        public void Publish(Type key, object messages)
        {
            var msg = RabbitMqMessage.From(messages);
            var serializeMessage = JsonConvert.SerializeObject(msg);
            var body = Encoding.UTF8.GetBytes(serializeMessage);

            _configuration.Publish(_channel, key.FullName, body);
        }

        private async Task Received_Handle(object sender, BasicDeliverEventArgs ea)
        {
            var eventName = ea.RoutingKey;
            var body = ea.Body.ToArray();
            var message = Encoding.UTF8.GetString(body);

            var isHandled = await ProcessEvent(eventName, message);
            if (isHandled)
                await _channel.BasicAckAsync(
                    deliveryTag: ea.DeliveryTag,
                    multiple: false,
                    cancellationToken: CancellationToken.None);
            else
                await _channel.BasicNackAsync(
                    deliveryTag: ea.DeliveryTag,
                    multiple: false,
                    requeue: true,
                    cancellationToken: CancellationToken.None);

            await Task.Yield();
        }

        private Task Exception_Handle(object sender, CallbackExceptionEventArgs ea)
        {
            Logger.LogError(ea.Exception, "Ошибка RabbitMQ");

            this.Dispose();
            this.Declare();
            this.Start();

            return Task.CompletedTask;
        }

        private async Task<bool> ProcessEvent(string eventName, string message)
        {
            try
            {
                if (string.IsNullOrEmpty(message))
                {
                    Logger.LogWarning($"Получено пустое сообщение: {message}. Обработка невозможна.");
                    return true;
                }

                var msg = RabbitMqMessage.From(message);
                if (msg == null)
                {
                    Logger.LogWarning($"Получено неизвестное сообщение: {message}. Обработка невозможна.");
                    return true;
                }

                var typed = Type.GetType(msg.Type);
                if (typed == null)
                {
                    Logger.LogWarning($"Тип сообщений: {msg.Type} не найден. Обработка невозможна.");
                    return true;
                }

                var obj = msg.Obj;

                await _repository.MatchConsumeAsync(typed, new[] { obj }, CancellationToken.None);
                return true;
            }
            catch (ApplicationException e)
            {
                Logger.LogWarning($"Обработка сообщения {eventName} завершилась ошибкой бизнес-логики. Считаем что обработано успешно. Исключение: {e}");
                return true;
            }
            catch (Exception ex)
            {
                Logger.LogError(ex, "Ошибка обработки сообщения из очереди");
                return false;
            }
        }

        public void Dispose()
        {
            _channel?.Dispose();
        }
    }
}
