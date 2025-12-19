
// Допустим, ваш сервис в таком неймспейсе
using StockChart.Repository.Services;

namespace MyApp.HostedServices
{
    public class NightlyFunctionHostedService : IHostedService, IDisposable
    {
        private readonly ILogger<NightlyFunctionHostedService> _logger;
        private readonly IServiceProvider _serviceProvider;

        private Timer _timer;
        private DateTime _lastRunDate = DateTime.MinValue;

        public NightlyFunctionHostedService(
            ILogger<NightlyFunctionHostedService> logger,
            IServiceProvider serviceProvider)
        {
            _logger = logger;
            _serviceProvider = serviceProvider;
        }

        public Task StartAsync(CancellationToken cancellationToken)
        {
            // Запускаем таймер, вызывающий DoWork каждые 15 минут
            _timer = new Timer(DoWork, null, TimeSpan.Zero, TimeSpan.FromMinutes(15));

            _logger.LogInformation("NightlyFunctionHostedService запущен");
            return Task.CompletedTask;
        }

        private void DoWork(object state)
        {
            // Запускаем асинхронную задачу
            Task.Run(() => CheckAndRunNightlyTask());
        }

        private async Task CheckAndRunNightlyTask()
        {
            try
            {
                var now = DateTime.Now;

                // Проверка: Будний день (Пн–Пт), час = 2, и не выполнялось сегодня
                bool isWeekday = now.DayOfWeek >= DayOfWeek.Tuesday && now.DayOfWeek <= DayOfWeek.Saturday;
                if (isWeekday && now.Hour == 2 && _lastRunDate.Date != now.Date)
                {
                    using var scope = _serviceProvider.CreateScope();

                    // Берём из DI тот же сервис, что и в контроллере
                    var batchImportService = scope.ServiceProvider.GetRequiredService<BatchImportOpenPositionsServiceNew>();

                    if (batchImportService.IsRunning)
                    {
                        _logger.LogInformation("Ночная задача: BatchImport уже запущен; пропускаем запуск");
                    }
                    else
                    {
                        _logger.LogInformation("Ночная задача: запускаем BatchImport в {time}", now);

                        // Тут — та же логика, что в контроллере
                        await batchImportService.StartDownloadAndImportAsync();

                        _logger.LogInformation("Ночная задача: BatchImport завершил запуск");
                    }

                    // Фиксируем дату, чтобы в эти же сутки не запускаться снова
                    _lastRunDate = now.Date;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка при выполнении ночной задачи в NightlyFunctionHostedService");
            }
        }

        public Task StopAsync(CancellationToken cancellationToken)
        {
            _logger.LogInformation("NightlyFunctionHostedService остановлен");
            _timer?.Change(Timeout.Infinite, 0);
            return Task.CompletedTask;
        }

        public void Dispose()
        {
            _timer?.Dispose();
        }
    }
}
