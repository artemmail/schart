using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System;

namespace StockChart.EventBus.RabbitMQ.Components
{
    internal class RabbitMqMessage
    {
        public JObject Body { get; set; }

        public string Type { get; set; }

        public long Date { get; set; }

        public object Obj => Body.ToObject(System.Type.GetType(Type));

        public static RabbitMqMessage From(object message)
        {
            return new RabbitMqMessage
            {
                Type = message.GetType().AssemblyQualifiedName,
                Body = JObject.FromObject(message),
                Date = DateTimeOffset.UtcNow.ToUnixTimeSeconds()
            };
        }

        public static RabbitMqMessage From(string message)
        {
            try
            {
                var objMessage = JsonConvert.DeserializeObject<RabbitMqMessage>(message);
                if (objMessage == null)
                    return null;

                return new RabbitMqMessage
                {
                    Type = objMessage.Type,
                    Body = objMessage.Body,
                    Date = objMessage.Date
                };
            }
            catch
            {
                return null;
            }
        }
    }
}