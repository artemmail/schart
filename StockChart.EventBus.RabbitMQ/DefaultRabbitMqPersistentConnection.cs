using System;
using System.IO;
using System.Net.Sockets;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Polly;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;
using RabbitMQ.Client.Exceptions;

namespace StockChart.EventBus.RabbitMQ
{
    /// <summary>
    /// Менеджер поддерживаемых соединений в шине RabbitMQ
    /// </summary>
    public class DefaultRabbitMqPersistentConnection
       : IRabbitMqPersistentConnection
    {
        private readonly IConnectionFactory _connectionFactory;
        private readonly ILogger<DefaultRabbitMqPersistentConnection> _logger;
        private readonly int _retryCount;

        IConnection _connection;

        bool _disposed;

        object _syncRoot = new object();

        public DefaultRabbitMqPersistentConnection(IConnectionFactory connectionFactory, ILogger<DefaultRabbitMqPersistentConnection> logger, int retryCount = 0)
        {
            _connectionFactory = connectionFactory ?? throw new ArgumentNullException(nameof(connectionFactory));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _retryCount = retryCount;
        }

        public bool IsConnected => _connection != null && _connection.IsOpen && !_disposed;

        public IChannel CreateChannel()
        {
            if (!IsConnected)
            {
                throw new InvalidOperationException("No RabbitMQ connections are available to perform this action");
            }

            return _connection
                .CreateChannelAsync(new CreateChannelOptions(false, false, null, null), CancellationToken.None)
                .GetAwaiter()
                .GetResult();
        }

        public void Dispose()
        {
            if (_disposed) return;

            _disposed = true;

            try
            {
                _connection.Dispose();
            }
            catch (IOException ex)
            {
                _logger.LogCritical(ex.ToString());
            }
        }

        public bool TryConnect()
        {
          
            _logger.LogInformation("RabbitMQ Client is trying to connect");

            lock (_syncRoot)
            {
                var policy = Policy
                    .Handle<SocketException>()
                    .Or<BrokerUnreachableException>()
                    .WaitAndRetry(_retryCount, retryAttempt => TimeSpan.FromSeconds(Math.Pow(2, retryAttempt)), (ex, time) =>
                    {
                        _logger.LogWarning(ex.ToString());
                    }
                );

                policy.Execute(() =>
                {
                    _connection = _connectionFactory
                        .CreateConnectionAsync(CancellationToken.None)
                        .GetAwaiter()
                        .GetResult();
                });

                if (!IsConnected)
                {
                    _logger.LogCritical("FATAL ERROR: RabbitMQ connections could not be created and opened");
                    return false;
                }

                _connection.ConnectionShutdownAsync += OnConnectionShutdown;
                _connection.CallbackExceptionAsync += OnCallbackException;
                _connection.ConnectionBlockedAsync += OnConnectionBlocked;

                _logger.LogInformation($"RabbitMQ persistent connection acquired a connection {_connection.Endpoint.HostName} and is subscribed to failure events");

                return true;
            }
        }

        private Task OnConnectionBlocked(object sender, ConnectionBlockedEventArgs e)
        {
            if (_disposed) return Task.CompletedTask;

            _logger.LogWarning("A RabbitMQ connection is shutdown. Trying to re-connect...");

            TryConnect();
            return Task.CompletedTask;
        }

        private Task OnCallbackException(object sender, CallbackExceptionEventArgs e)
        {
            if (_disposed) return Task.CompletedTask;

            _logger.LogWarning("A RabbitMQ connection throw exception. Trying to re-connect...");

            TryConnect();
            return Task.CompletedTask;
        }

        private Task OnConnectionShutdown(object sender, ShutdownEventArgs reason)
        {
            if (_disposed) return Task.CompletedTask;

            _logger.LogWarning("A RabbitMQ connection is on shutdown. Trying to re-connect...");

            TryConnect();
            return Task.CompletedTask;
        }
    }
}
