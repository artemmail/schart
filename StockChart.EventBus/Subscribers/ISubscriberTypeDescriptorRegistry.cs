using System;

namespace StockChart.EventBus.Subscribers
{
    public interface ISubscriberTypeDescriptorRegistry
    {
        SubscriberTypeDescriptor Get(Type type);
    }
}