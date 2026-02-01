using Microsoft.Extensions.Logging;
using Quartz;
using StockChart.Repository.Services;

namespace StockChart.UpdateService.Jobs;

[DisallowConcurrentExecution]
public sealed class YooMoneyJob : IJob
{
    private readonly IYooMoneyRepository _yooMoneyRepository;
    private readonly IBillingRepository _billingRepository;
    private readonly ILogger<YooMoneyJob> _logger;

    public YooMoneyJob(
        IYooMoneyRepository yooMoneyRepository,
        IBillingRepository billingRepository,
        ILogger<YooMoneyJob> logger)
    {
        _yooMoneyRepository = yooMoneyRepository;
        _billingRepository = billingRepository;
        _logger = logger;
    }

    public Task Execute(IJobExecutionContext context)
    {
        _logger.LogInformation("YooMoneyJob running at {Time}", DateTimeOffset.Now);

        try
        {
            var operations = _yooMoneyRepository.operationHistory(0, 20);

            if (operations is not null)
            {
                foreach (var op in operations)
                {
                    if (!string.IsNullOrEmpty(op.label))
                    {
                        _billingRepository.recievePayment(op.label);
                        _logger.LogInformation("Payment received with label: {Label}", op.label);
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "YooMoneyJob failed");
        }

        return Task.CompletedTask;
    }
}
