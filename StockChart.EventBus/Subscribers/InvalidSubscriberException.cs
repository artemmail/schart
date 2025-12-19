using System;
using System.Diagnostics;
using System.Runtime.Serialization;

namespace StockChart.EventBus.Subscribers
{
    [Serializable]
    public class InvalidSubscriberException : Exception
    {
        private const string TypeKey = "Type";
        private readonly Type _type;

        public InvalidSubscriberException(Type type)
            : this(type, string.Format("Неизвестный обработчик события \"{0}\". Воозможно реализован только интерфейс-маркер \"{1}\".", type.FullName, typeof(ISubscriber).FullName))
        {
        }

        public InvalidSubscriberException(Type type, string message)
            : base(message)
        {
            if (type == null)
                throw new ArgumentNullException("type");

            _type = type;
        }

        public InvalidSubscriberException(Type type, string message, Exception innerException)
            : base(message, innerException)
        {
            if (type == null)
                throw new ArgumentNullException("type");

            _type = type;
        }

        protected InvalidSubscriberException(SerializationInfo info, StreamingContext context)
            : base(info, context)
        {
            var typeName = info.GetString(TypeKey);
            _type = Type.GetType(typeName, true);
        }

        public Type Type
        {
            [DebuggerStepThrough]
            get { return _type; }
        }

        public override void GetObjectData(SerializationInfo info, StreamingContext context)
        {
            base.GetObjectData(info, context);

            info.AddValue(TypeKey, _type.AssemblyQualifiedName);
        }
    }
}