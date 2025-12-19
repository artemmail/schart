using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace StockChart.EventBus.Subscribers
{
    public interface ISubscriptionRepository
    {
        IEnumerable<Type> SupportedMessageTypes { get; }

        SubscriberTypeDescriptor Add(ISubscriber subscriber);

        SubscriberTypeDescriptor Get(ISubscriber subscriber);

        void Remove(ISubscriber subscriber);

        void Clear();

        Task MatchConsumeAsync(Type messageType, IEnumerable<object> messages, CancellationToken cancellationToken);
    }
}