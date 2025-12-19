using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;

namespace StockChart.EventBus.Subscribers
{
    public sealed class SubscriberTypeDescriptor
    {
        private readonly Type _type;
        private readonly HashSet<Type> _consumableMessageTypes;

        public SubscriberTypeDescriptor(Type type)
        {
            if (type == null)
                throw new ArgumentNullException(nameof(type));

            var interfaces = type.GetInterfaces();

            _type = type;

            var consumerOpenType = typeof(IConsumer<>);
            var consumableMessageTypes = interfaces
                .Where(x => x.IsGenericType)
                .Where(x => x.GetGenericTypeDefinition() == consumerOpenType)
                .Select(x => x.GetGenericArguments().Single());
            _consumableMessageTypes = new HashSet<Type>(consumableMessageTypes);
        }

        public Type Type
        {
            [DebuggerStepThrough] get => _type;
        }

        public IEnumerable<Type> ConsumableMessageTypes
        {
            [DebuggerStepThrough] get => _consumableMessageTypes;
        }

        public bool IsConsumer
        {
            [DebuggerStepThrough] get => _consumableMessageTypes.Count > 0;
        }
    }
}