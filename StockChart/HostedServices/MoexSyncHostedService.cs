using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using StockChart.Repository.Interfaces;

namespace StockChart.Api.HostedServices
{
    public sealed class MoexSyncHostedService : IHostedService, IDisposable
    {
        private static readonly TimeSpan TimerInterval = TimeSpan.FromHours(12);
        private readonly ILogger<MoexSyncHostedService> _logger;
        private readonly IServiceProvider _serviceProvider;
        private readonly SemaphoreSlim _mutex = new SemaphoreSlim(1, 1);
        private Timer? _timer;

        public MoexSyncHostedService(ILogger<MoexSyncHostedService> logger, IServiceProvider serviceProvider)
        {
            _logger = logger;
            _serviceProvider = serviceProvider;
        }

        public Task StartAsync(CancellationToken cancellationToken)
        {
            _timer = new Timer(DoWork, null, TimeSpan.Zero, TimerInterval);
            _logger.LogInformation("MoexSyncHostedService started");
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
                var syncService = scope.ServiceProvider.GetRequiredService<IMoexSyncService>();
                var result = await syncService.SyncAllAsync();
                _logger.LogInformation(
                    "MoexSyncHostedService: stocks={Stocks} bonds={Bonds} futures={Futures} options={Options} links={Links}",
                    result.UpdatedStocks,
                    result.UpdatedBonds,
                    result.UpdatedFutures,
                    result.UpdatedOptions,
                    result.LinksUpserted);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "MoexSyncHostedService failed");
            }
            finally
            {
                _mutex.Release();
            }
        }

        public Task StopAsync(CancellationToken cancellationToken)
        {
            _logger.LogInformation("MoexSyncHostedService stopped");
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
