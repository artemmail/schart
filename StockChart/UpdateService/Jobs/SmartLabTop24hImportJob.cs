using Microsoft.Extensions.Logging;
using Quartz;
using StockChart.UpdateService.Services;

namespace StockChart.UpdateService.Jobs;

[DisallowConcurrentExecution]
public sealed class SmartLabTop24hImportJob : IJob
{
    private readonly SmartLabTop24hImportService _service;
    private readonly ILogger<SmartLabTop24hImportJob> _logger;

    public SmartLabTop24hImportJob(
        SmartLabTop24hImportService service,
        ILogger<SmartLabTop24hImportJob> logger)
    {
        _service = service;
        _logger = logger;
    }

    public async Task Execute(IJobExecutionContext context)
    {
        try
        {
            var result = await _service.ImportAsync(context.CancellationToken);
            _logger.LogInformation(
                "SmartLabTop24hImportJob finished: links={Links} created={Created} skipped={Skipped} failed={Failed}",
                result.TopLinksFound,
                result.CreatedTopics,
                result.SkippedAlreadyImported,
                result.Failed);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "SmartLabTop24hImportJob failed");
        }
    }
}
