using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using StockChart.EventBus.Abstractions;
using StockChart.EventBus.Subscribers;

namespace StockChart.EventBus.RabbitMQ.DependencyInjection.Hosted
{
    public class RabbitMQHostedService : BackgroundService
    {
        private readonly IEventBus _bus;
        private readonly IServiceProvider _provider;

        public RabbitMQHostedService(IEventBus bus, IServiceProvider provider)
        {
            _bus = bus;
            _provider = provider;
        }
        
        /// <inheritdoc />
        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            var subs = _provider.GetServices<ISubscriber>();
            _bus.Start(subs);
        }
    }
}