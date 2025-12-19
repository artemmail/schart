using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using StockChart.Repository.Services;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace StockChart.Api.HostedServices
{
    public class YooMoneyHostedService : IHostedService, IDisposable
    {
        private readonly ILogger<YooMoneyHostedService> _logger;
        private readonly IServiceProvider _serviceProvider;
        private Timer _timer;

        public YooMoneyHostedService(
            ILogger<YooMoneyHostedService> logger,
            IServiceProvider serviceProvider)
        {
            _logger = logger;
            _serviceProvider = serviceProvider;
        }

        public Task StartAsync(CancellationToken cancellationToken)
        {
            // Запускаем таймер, который будет вызывать DoWork каждые 1 минуту
            _timer = new Timer(DoWork, null, TimeSpan.Zero, TimeSpan.FromMinutes(1));

            _logger.LogInformation("YooMoneyHostedService запущен");
            return Task.CompletedTask;
        }

        private void DoWork(object state)
        {
            _logger.LogInformation("YooMoneyHostedService выполняет задачу: {time}", DateTimeOffset.Now);

            try
            {
                // Создаём scope
                using var scope = _serviceProvider.CreateScope();

                // Достаём IYooMoneyRepository и IBillingRepository из scope
                var yooMoneyRepository = scope.ServiceProvider.GetRequiredService<IYooMoneyRepository>();
                var billingRepository = scope.ServiceProvider.GetRequiredService<IBillingRepository>();

                // Далее — ваш код
                var operations = yooMoneyRepository.operationHistory(0, 20);

                if (operations is not null)
                {
                    foreach (var op in operations)
                    {
                        if (!string.IsNullOrEmpty(op.label))
                        {
                            billingRepository.recievePayment(op.label);
                            _logger.LogInformation("Payment received with label: {label}", op.label);
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка при выполнении YooMoneyHostedService");
            }
        }

        public Task StopAsync(CancellationToken cancellationToken)
        {
            _logger.LogInformation("YooMoneyHostedService остановлен");

            // Останавливаем таймер
            _timer?.Change(Timeout.Infinite, 0);
            return Task.CompletedTask;
        }

        public void Dispose()
        {
            // Освобождаем ресурсы
            _timer?.Dispose();
        }
    }
}
