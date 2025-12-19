using System;

namespace StockChart.EventBus.RabbitMQ.DependencyInjection
{
    /// <summary>
    /// Секция конфигурации приложений
    /// </summary>
    public class NotificationSenderConfiguration
    {
        /// <summary>
        /// Идентификатор сервиса для рассылки
        /// </summary>
        public string ServiceId { get; set; }

        /// <summary>
        /// Name
        /// </summary>
        public string Name { get; set; }
        /// <summary>
        /// Частота рассылки в секундах
        /// </summary>
        public int? CheckFrequency { get; set; }
    }
}