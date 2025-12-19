using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using StockChart.EventBus.Subscribers.Consumers;

namespace StockChart.EventBus.Subscribers
{
    public class SubscriptionRepository : ISubscriptionRepository
    {
        private readonly ISubscriberTypeDescriptorRegistry _subscriberTypeDescriptorRegistry;
        private readonly ConcurrentDictionary<Type, ConsumerSubscriber> _consumers = new ConcurrentDictionary<Type, ConsumerSubscriber>();

        public SubscriptionRepository(ISubscriberTypeDescriptorRegistry subscriberTypeDescriptorRegistry)
        {
            _subscriberTypeDescriptorRegistry = subscriberTypeDescriptorRegistry ?? throw new ArgumentNullException(nameof(subscriberTypeDescriptorRegistry));
        }

        public IEnumerable<Type> SupportedMessageTypes => _consumers.Keys;

        public SubscriberTypeDescriptor Add(ISubscriber subscriber)
        {
            if (subscriber == null)
                throw new ArgumentNullException(nameof(subscriber));

            var descriptor = _subscriberTypeDescriptorRegistry.Get(subscriber.GetType());

            var added = TryAddConsumer(descriptor, subscriber);

            if (!added)
                throw new InvalidSubscriberException(descriptor.Type);

            return descriptor;
        }

        /// <inheritdoc />
        public SubscriberTypeDescriptor Get(ISubscriber subscriber)
        {
            var descriptor = _subscriberTypeDescriptorRegistry.Get(subscriber.GetType());
            return descriptor;
        }

        public void Remove(ISubscriber subscriber)
        {
            if (subscriber == null)
                throw new ArgumentNullException(nameof(subscriber));


            var descriptor = _subscriberTypeDescriptorRegistry.Get(subscriber.GetType());

            var removed = TryRemoveConsumer(descriptor, subscriber);

            if (!removed)
                throw new InvalidSubscriberException(descriptor.Type);
        }

        public void Clear()
        {
            _consumers.Clear();
        }

        public Task MatchConsumeAsync(Type messageType, IEnumerable<object> messages, CancellationToken cancellationToken)
        {
            if (messageType == null)
                throw new ArgumentNullException(nameof(messageType));

            if (messages == null)
                throw new ArgumentNullException(nameof(messages));

            var consumers = MatchConsumers(messageType);
            if (consumers.Count == 0)
                return Task.CompletedTask;

            var tasks = consumers.Select(x => x.ConsumeAsync(messages, cancellationToken)).ToArray();

            if (tasks.Length == 1)
                return tasks[0];

            return Task.WhenAll(tasks);
        }

        private ConsumerSubscriber GetConsumer(Type messageType)
        {
            return _consumers.GetOrAdd(messageType, ConsumerSubscriber.Create);
        }

        private IReadOnlyList<ConsumerSubscriber> MatchConsumers(Type messageType)
        {
            var consumers = new List<ConsumerSubscriber>();
            foreach (var type in _consumers.Keys)
            {
                if (type.IsAssignableFrom(messageType) && _consumers.TryGetValue(type, out var consumer))
                    consumers.Add(consumer);
            }

            return consumers;
        }

        private bool TryAddConsumer(SubscriberTypeDescriptor descriptor, ISubscriber subscriber)
        {
            if (!descriptor.IsConsumer)
                return false;

            foreach (var consumer in descriptor.ConsumableMessageTypes.Select(GetConsumer))
                consumer.Add(subscriber);

            return true;
        }

        private bool TryRemoveConsumer(SubscriberTypeDescriptor descriptor, ISubscriber subscriber)
        {
            if (!descriptor.IsConsumer)
                return false;

            foreach (var consumer in descriptor.ConsumableMessageTypes.Select(GetConsumer))
                consumer.Remove(subscriber);

            return true;
        }
    }
}