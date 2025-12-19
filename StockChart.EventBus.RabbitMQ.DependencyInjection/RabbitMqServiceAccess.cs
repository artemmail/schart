namespace StockChart.EventBus.RabbitMQ.DependencyInjection
{
    /// <summary>
    /// Секция конфигурации доступа к шине
    /// </summary>
    public class RabbitMqServiceAccess
    {
        /// <summary>
        /// Логин
        /// </summary>
        public string UserName { get; set; }

        /// <summary>
        /// Пароль
        /// </summary>
        public string Password { get; set; }

        /// <summary>
        /// Количество попыток подсоединиться к шине
        /// </summary>
        public int RetryCount { get; set; }

        /// <summary>
        /// Местонахождение шины
        /// </summary>
        public string Host { get; set; }
    }
}