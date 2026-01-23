using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using StockChart.Repository.Interfaces;

namespace StockChart.Api.HostedServices
{
    public class DividendsMoexHostedService : IHostedService, IDisposable
    {
        private static readonly TimeSpan TimerInterval = TimeSpan.FromHours(1);
        private readonly ILogger<DividendsMoexHostedService> _logger;
        private readonly IServiceProvider _serviceProvider;
        private readonly SemaphoreSlim _mutex = new SemaphoreSlim(1, 1);
        private Timer? _timer;

        public DividendsMoexHostedService(
            ILogger<DividendsMoexHostedService> logger,
            IServiceProvider serviceProvider)
        {
            _logger = logger;
            _serviceProvider = serviceProvider;
        }

        public Task StartAsync(CancellationToken cancellationToken)
        {
            _timer = new Timer(DoWork, null, TimeSpan.Zero, TimerInterval);
            _logger.LogInformation("DividendsMoexHostedService запущен");
            return Task.CompletedTask;
        }

        private void DoWork(object? state)
        {
            _ = RunAsync();
        }

        private async Task RunAsync()
        {
            if (!await _mutex.WaitAsync(0))
            {
                return;
            }

            try
            {
                using var scope = _serviceProvider.CreateScope();
                var dividendsService = scope.ServiceProvider.GetRequiredService<IDividendsMoexService>();
                var updated = await dividendsService.UpdateDueDividendsAsync();
                _logger.LogInformation("DividendsMoexHostedService: обновлено записей {Count}", updated);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Ошибка при выполнении DividendsMoexHostedService");
            }
            finally
            {
                _mutex.Release();
            }
        }

        public Task StopAsync(CancellationToken cancellationToken)
        {
            _logger.LogInformation("DividendsMoexHostedService остановлен");
            _timer?.Change(Timeout.Infinite, 0);
            return Task.CompletedTask;
        }

        public void Dispose()
        {
            _timer?.Dispose();
            _mutex.Dispose();
        }
    }
}
