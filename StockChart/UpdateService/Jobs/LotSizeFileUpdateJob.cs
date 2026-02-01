using Microsoft.Extensions.Logging;
using Quartz;
using StockChart.UpdateService.Services;

namespace StockChart.UpdateService.Jobs;

[DisallowConcurrentExecution]
public sealed class LotSizeFileUpdateJob : IJob
{
    private readonly LotSizeFileUpdateService _service;
    private readonly ILogger<LotSizeFileUpdateJob> _logger;

    public LotSizeFileUpdateJob(
        LotSizeFileUpdateService service,
        ILogger<LotSizeFileUpdateJob> logger)
    {
        _service = service;
        _logger = logger;
    }

    public async Task Execute(IJobExecutionContext context)
    {
        try
        {
            await _service.UpdateDataAsync(context.CancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "LotSizeFileUpdateJob failed");
        }
    }
}
