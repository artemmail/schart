using RabbitMQ.Client;
using System;

namespace StockChart.EventBus.RabbitMQ
{
    /// <summary>
    /// Абстракция менеджера поддерживаемых соединений
    /// </summary>
    public interface IRabbitMqPersistentConnection : IDisposable
    {
        bool IsConnected { get; }

        bool TryConnect();

        IModel CreateModel();
    }
}
