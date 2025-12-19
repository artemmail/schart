using System;
using System.Collections.Concurrent;

namespace StockChart.EventBus.Subscribers
{
    public class SubscriberTypeDescriptorRegistry : ISubscriberTypeDescriptorRegistry
    {
        private readonly ConcurrentDictionary<Type, SubscriberTypeDescriptor> _cache = new ConcurrentDictionary<Type, SubscriberTypeDescriptor>();

        public SubscriberTypeDescriptor Get(Type type)
        {
            if (type == null)
                throw new ArgumentNullException("type");

            return _cache.GetOrAdd(type, x => new SubscriberTypeDescriptor(x));
        }
    }
}