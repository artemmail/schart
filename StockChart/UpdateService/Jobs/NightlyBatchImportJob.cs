using Microsoft.Extensions.Logging;
using Quartz;
using StockChart.Repository.Services;

namespace StockChart.UpdateService.Jobs;

[DisallowConcurrentExecution]
public sealed class NightlyBatchImportJob : IJob
{
    private static DateTime _lastRunDate = DateTime.MinValue;
    private readonly BatchImportOpenPositionsServiceNew _batchImportService;
    private readonly ILogger<NightlyBatchImportJob> _logger;

    public NightlyBatchImportJob(
        BatchImportOpenPositionsServiceNew batchImportService,
        ILogger<NightlyBatchImportJob> logger)
    {
        _batchImportService = batchImportService;
        _logger = logger;
    }

    public async Task Execute(IJobExecutionContext context)
    {
        try
        {
            var now = DateTime.Now;
            if (_lastRunDate.Date == now.Date)
            {
                _logger.LogInformation("Nightly job already ran today; skipping.");
                return;
            }

            if (_batchImportService.IsRunning)
            {
                _logger.LogInformation("Nightly job: BatchImport already running; skipping.");
                return;
            }

            _logger.LogInformation("Nightly job: starting BatchImport at {Time}", now);
            await _batchImportService.StartDownloadAndImportAsync();
            _lastRunDate = now.Date;
            _logger.LogInformation("Nightly job: BatchImport completed");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Nightly job failed");
        }
    }
}
