using Microsoft.Extensions.Logging;
using Quartz;
using StockChart.Repository.Interfaces;

namespace StockChart.UpdateService.Jobs;

[DisallowConcurrentExecution]
public sealed class MoexSyncJob : IJob
{
    private readonly IMoexSyncService _syncService;
    private readonly ILogger<MoexSyncJob> _logger;

    public MoexSyncJob(IMoexSyncService syncService, ILogger<MoexSyncJob> logger)
    {
        _syncService = syncService;
        _logger = logger;
    }

    public async Task Execute(IJobExecutionContext context)
    {
        try
        {
            var result = await _syncService.SyncAllAsync(context.CancellationToken);
            _logger.LogInformation(
                "MoexSyncJob: securityTypes={SecurityTypes} stocks={Stocks} bonds={Bonds} futures={Futures} options={Options} links={Links}",
                result.UpdatedSecurityTypes,
                result.UpdatedStocks,
                result.UpdatedBonds,
                result.UpdatedFutures,
                result.UpdatedOptions,
                result.LinksUpserted);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "MoexSyncJob failed");
        }
    }
}
