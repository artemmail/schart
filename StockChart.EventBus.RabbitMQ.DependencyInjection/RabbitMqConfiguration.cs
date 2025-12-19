namespace StockChart.EventBus.RabbitMQ.DependencyInjection
{
    /// <summary>
    /// Секция конфигурации приложений
    /// </summary>
    public class RabbitMqConfiguration
    {
        /// <summary>
        /// Включен
        /// </summary>
        public bool Enabled { get; set; }

        /// <summary>
        /// Название брокера (Exchange в RabbitMQ)
        /// </summary>
        public string Broker { get; set; }

        /// <summary>
        /// Количество попыток отправить сообщений
        /// </summary>
        public int RetryCount { get; set; }

        /// <summary>
        /// Наименование очереди сообщений приложения (события)
        /// </summary>
        public string QueueName { get; set; }

        /// <summary>
        /// Тип очереди - fanout или direct
        /// </summary>
        public string ExchangeType { get; set; }

        /// <summary>
        /// Наименование очереди сообщений приложения (запросы)
        /// </summary>
        public string CommandQueueName { get; set; }

        /// <summary>
        /// Настройка доступа к шине
        /// </summary>
        public RabbitMqServiceAccess BusAccess { get; set; }
    }
}