using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using StockChart.EventBus.Abstractions;
using StockChart.EventBus.Managers;
using StockChart.EventBus.RabbitMQ.DependencyInjection.Hosted;
using StockChart.EventBus.Subscribers;
using RabbitMQ.Client;
using System.Data;

namespace StockChart.EventBus.RabbitMQ.DependencyInjection
{
    /// <summary>
    /// Инжектор для реализации шины на основе RabbitMQ
    /// </summary>
    public static class RabbitMqInjectionExtension
    {
        /// <summary>
        /// Количество попыток по-умолчанию
        /// </summary>
        private const int DEFAULT_RETRY_COUNT = 5;

        public static IServiceCollection AddRabbitMq(this IServiceCollection services, IConfiguration configuration)
        {
            var rabbitMqConfiguration = configuration.Get<RabbitMqConfiguration>();

            //Если шина выключена, вставляем затычку.
            if (rabbitMqConfiguration == null || !rabbitMqConfiguration.Enabled)
            {
                services.AddSingleton<IEventBus, EmptyEventBus>();
                services.AddSingleton<ICommandBus, EmptyEventBus>();

                return services;
            }

            var rabbitMqServiceAccess = rabbitMqConfiguration.BusAccess;

            if (rabbitMqServiceAccess == null)
                throw new DataException(nameof(rabbitMqServiceAccess));

            services.AddSingleton<IRabbitMqPersistentConnection>(sp =>
            {
                var logger = sp.GetRequiredService<ILogger<DefaultRabbitMqPersistentConnection>>();

                var factory = new ConnectionFactory()
                {
                    HostName = rabbitMqServiceAccess.Host,
                    DispatchConsumersAsync = true
                };

                if (!string.IsNullOrEmpty(rabbitMqServiceAccess.UserName))
                {
                    factory.UserName = rabbitMqServiceAccess.UserName;
                }

                if (!string.IsNullOrEmpty(rabbitMqServiceAccess.Password))
                {
                    factory.Password = rabbitMqServiceAccess.Password;
                }

                var retryCount = DEFAULT_RETRY_COUNT;
                if (rabbitMqServiceAccess.RetryCount != 0)
                {
                    retryCount = rabbitMqServiceAccess.RetryCount;
                }

                return new DefaultRabbitMqPersistentConnection(factory, logger, retryCount);
            });

            services.AddTransient<ISubscriptionRepository, SubscriptionRepository>();
            services.AddTransient<ISubscriberTypeDescriptorRegistry, SubscriberTypeDescriptorRegistry>();

            services.AddSingleton<IEventBus, EventBusRabbitMq>(sp =>
            {
                var rabbitMqPersistentConnection = sp.GetRequiredService<IRabbitMqPersistentConnection>();

                var logger = sp.GetRequiredService<ILogger<EventBusRabbitMq>>();

                var eventBusSubcriptionsManager = sp.GetRequiredService<ISubscriptionRepository>();

                var retryCount = DEFAULT_RETRY_COUNT;
                if (rabbitMqConfiguration.RetryCount != 0)
                {
                    retryCount = rabbitMqConfiguration.RetryCount;
                }

                return new EventBusRabbitMq(rabbitMqPersistentConnection,
                    eventBusSubcriptionsManager,
                    logger,
                    rabbitMqConfiguration.Broker,
                    rabbitMqConfiguration.ExchangeType,
                    rabbitMqConfiguration.QueueName,
                    retryCount);
            });

            // services.AddSingleton<ICommandBus, CommandBusRabbitMq>(factory =>
            // {
            //     var rabbitMqPersistentConnection = factory.GetRequiredService<IRabbitMqPersistentConnection>();
            //
            //     var iLifetimeScope = factory.GetRequiredService<ILifetimeScope>();
            //
            //     var logger = factory.GetRequiredService<ILogger<CommandBusRabbitMq>>();
            //
            //     var eventBusSubcriptionsManager = factory.GetRequiredService<ICommandBusSubscriptionsManager>();
            //
            //     var retryCount = DEFAULT_RETRY_COUNT;
            //     if (rabbitMqConfiguration.RetryCount != 0)
            //     {
            //         retryCount = rabbitMqConfiguration.RetryCount;
            //     }
            //
            //     return new CommandBusRabbitMq(iLifetimeScope, rabbitMqPersistentConnection, eventBusSubcriptionsManager, logger, rabbitMqConfiguration.Broker, rabbitMqConfiguration.ExchangeType, rabbitMqConfiguration.CommandQueueName, retryCount);
            // });

            services.AddSingleton<IEventBusSubscriptionsManager, InMemoryEventBusSubscriptionsManager>();
            services.AddSingleton<ICommandBusSubscriptionsManager, InMemoryCommandBusSubscriptionsManager>();

            services.AddHostedService<RabbitMQHostedService>();

            return services;
        }

        public static IServiceCollection AddSubscriber<T>(this IServiceCollection services) where T : class, ISubscriber
        {
            services.AddTransient<ISubscriber, T>();
            return services;
        }
    }
}
