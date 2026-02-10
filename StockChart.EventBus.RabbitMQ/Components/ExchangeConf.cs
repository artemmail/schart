using System;
using System.Net.Sockets;
using System.Threading;
using Microsoft.Extensions.Logging;
using Polly;
using Polly.Retry;
using RabbitMQ.Client;
using RabbitMQ.Client.Exceptions;

namespace StockChart.EventBus.RabbitMQ.Components
{
    public class ExchangeConf
    {
         private string Exchange { get; set; }
        private string Type { get; set; }
        private int PrefetchCount { get; set; }

        public string Queue { get; set; }

        private BasicProperties _properties;
        private readonly RetryPolicy _policy;

        public ILogger Logger { get; set; }

        public ExchangeConf(int retryCount)
        {
            _policy = Policy
                .Handle<BrokerUnreachableException>()
                .Or<SocketException>()
                .WaitAndRetry(retryCount,
                    retryAttempt => TimeSpan.FromSeconds(Math.Pow(2, retryAttempt)),
                    (ex, time) =>
                    {
                        Logger?.LogWarning(ex.ToString());
                    });
        }

        public void Bind(IChannel channel, string key)
        {
            channel.QueueBindAsync(
                    queue: Queue,
                    exchange: Exchange,
                    routingKey: key,
                    arguments: null,
                    noWait: false,
                    cancellationToken: CancellationToken.None)
                .GetAwaiter()
                .GetResult();
        }

        public void Unbind(IChannel channel, string key)
        {
            channel.QueueUnbindAsync(
                    queue: Queue,
                    exchange: Exchange,
                    routingKey: key,
                    arguments: null,
                    cancellationToken: CancellationToken.None)
                .GetAwaiter()
                .GetResult();
        }

        public void Declare(IChannel channel)
        {
            channel.ExchangeDeclareAsync(
                    exchange: Exchange,
                    type: Type,
                    durable: true,
                    autoDelete: false,
                    arguments: null,
                    passive: false,
                    noWait: false,
                    cancellationToken: CancellationToken.None)
                .GetAwaiter()
                .GetResult();

            channel.QueueDeclareAsync(
                    queue: Queue,
                    durable: true,
                    exclusive: false,
                    autoDelete: false,
                    arguments: null,
                    passive: false,
                    noWait: false,
                    cancellationToken: CancellationToken.None)
                .GetAwaiter()
                .GetResult();

            channel.BasicQosAsync(
                    prefetchSize: 0,
                    prefetchCount: (ushort)this.PrefetchCount,
                    global: false,
                    cancellationToken: CancellationToken.None)
                .GetAwaiter()
                .GetResult();

            _properties = new BasicProperties
            {
                DeliveryMode = DeliveryModes.Persistent
            };
        }

        public void Publish(IChannel channel, string key, byte[] body)
        {
            if (_properties == null)
                throw new InvalidOperationException($"{nameof(_properties)} is null.");

            _policy.Execute(() =>
            {
                channel.BasicPublishAsync(
                        exchange: Exchange,
                        routingKey: key,
                        mandatory: false,
                        basicProperties: _properties,
                        body: body,
                        cancellationToken: CancellationToken.None)
                    .GetAwaiter()
                    .GetResult();
            });
        }

        public static ExchangeConf Create(string exchange, string queue, string type, int prefetchCount, int retryCount)
        {
            return new ExchangeConf(retryCount)
            {
                Exchange = exchange,
                Type = type,
                Queue = queue,
                PrefetchCount = prefetchCount
            };
        }
    }
}
