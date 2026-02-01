using Microsoft.Extensions.Logging;
using Quartz;
using StockChart.Repository.Interfaces;

namespace StockChart.UpdateService.Jobs;

[DisallowConcurrentExecution]
public sealed class DividendsMoexJob : IJob
{
    private readonly IDividendsMoexService _dividendsService;
    private readonly ILogger<DividendsMoexJob> _logger;

    public DividendsMoexJob(IDividendsMoexService dividendsService, ILogger<DividendsMoexJob> logger)
    {
        _dividendsService = dividendsService;
        _logger = logger;
    }

    public async Task Execute(IJobExecutionContext context)
    {
        try
        {
            var updated = await _dividendsService.UpdateDueDividendsAsync(context.CancellationToken);
            _logger.LogInformation("DividendsMoexJob: updated {Count}", updated);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "DividendsMoexJob failed");
        }
    }
}
