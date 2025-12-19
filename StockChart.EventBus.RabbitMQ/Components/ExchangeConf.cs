using System;
using System.Net.Sockets;
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

        private IBasicProperties _properties;
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

        public void Bind(IModel channel, string key)
        {
            channel.QueueBind(queue: Queue, exchange: Exchange, routingKey: key);
        }

        public void Unbind(IModel channel, string key)
        {
            channel.QueueUnbind(queue: Queue, exchange: Exchange, routingKey: key);
        }

        public void Declare(IModel channel)
        {
            channel.ExchangeDeclare(exchange: Exchange, type: Type, durable: true);
            channel.QueueDeclare(queue: Queue, durable: true, autoDelete: false, arguments: null);
            channel.BasicQos(0, (ushort)this.PrefetchCount, false);

            _properties = channel.CreateBasicProperties();
            _properties.DeliveryMode = 2;
        }

        public void Publish(IModel channel, string key, byte[] body)
        {
            if (_properties == null)
                throw new InvalidOperationException($"{nameof(_properties)} is null.");

            _policy.Execute(() =>
            {
                channel.BasicPublish(exchange: Exchange, routingKey: key, _properties, body);
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