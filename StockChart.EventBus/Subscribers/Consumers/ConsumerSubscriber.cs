using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq.Expressions;
using System.Threading;
using System.Threading.Tasks;

namespace StockChart.EventBus.Subscribers.Consumers
{
    internal abstract class ConsumerSubscriber
    {
        private static readonly ConcurrentDictionary<Type, Func<ConsumerSubscriber>> _factoryCache = 
            new ConcurrentDictionary<Type, Func<ConsumerSubscriber>>();

        public abstract void Add(ISubscriber subscriber);

        public abstract void Remove(ISubscriber subscriber);

        public abstract Task ConsumeAsync(IEnumerable<object> messages, CancellationToken cancellationToken);

        public static ConsumerSubscriber Create(Type messageType)
        {
            if (messageType == null)
                throw new ArgumentNullException("messageType");

            var factory = _factoryCache.GetOrAdd(messageType, Build);
            return factory();
        }

        private static Func<ConsumerSubscriber> Build(Type type)
        {
            var instanceType = typeof(ConsumerSubscriber<>).MakeGenericType(type);
            
            var lambda = Expression.Lambda<Func<ConsumerSubscriber>>(Expression.New(instanceType));

            return lambda.Compile();
        }
    }
}