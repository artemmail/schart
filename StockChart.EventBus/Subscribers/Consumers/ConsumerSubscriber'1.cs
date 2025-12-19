using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace StockChart.EventBus.Subscribers.Consumers
{
    internal class ConsumerSubscriber<TMessage> : ConsumerSubscriber
        where TMessage : class
    {
        private readonly ConcurrentDictionary<IConsumer<TMessage>, DateTime> _consumers = new ConcurrentDictionary<IConsumer<TMessage>, DateTime>();

        public override void Add(ISubscriber subscriber)
        {
            if (subscriber == null)
                throw new ArgumentNullException("subscriber");

            _consumers.TryAdd((IConsumer<TMessage>)subscriber, DateTime.Now);
        }

        public override void Remove(ISubscriber subscriber)
        {
            if (subscriber == null)
                throw new ArgumentNullException("subscriber");

            DateTime value;
            _consumers.TryRemove((IConsumer<TMessage>)subscriber, out value);
        }

        public override Task ConsumeAsync(IEnumerable<object> messages, CancellationToken cancellationToken)
        {
            return ConsumeAsync(messages.Cast<TMessage>().ToArray(), cancellationToken);
        }

        private Task ConsumeAsync(IEnumerable<TMessage> messages, CancellationToken cancellationToken)
        {
            var tasks = _consumers.SelectMany(x => messages.Select(y => x.Key.ConsumeAsync(y, cancellationToken))).ToArray();

            if (tasks.Length == 0)
                return Task.CompletedTask;

            if (tasks.Length == 1)
                return tasks[0];

            return Task.WhenAll(tasks);
        }
    }
}