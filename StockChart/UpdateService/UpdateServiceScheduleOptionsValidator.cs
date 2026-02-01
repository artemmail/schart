using System.Collections.Generic;
using Microsoft.Extensions.Options;
using Quartz;

namespace StockChart.UpdateService;

public sealed class UpdateServiceScheduleOptionsValidator : IValidateOptions<UpdateServiceScheduleOptions>
{
    public ValidateOptionsResult Validate(string? name, UpdateServiceScheduleOptions options)
    {
        var failures = new List<string>();

        if (options.DividendsMoexInterval <= TimeSpan.Zero)
        {
            failures.Add("UpdateService:Schedules:DividendsMoexInterval must be a positive TimeSpan.");
        }

        if (options.MoexSyncInterval <= TimeSpan.Zero)
        {
            failures.Add("UpdateService:Schedules:MoexSyncInterval must be a positive TimeSpan.");
        }

        if (options.YooMoneyInterval <= TimeSpan.Zero)
        {
            failures.Add("UpdateService:Schedules:YooMoneyInterval must be a positive TimeSpan.");
        }

        if (options.LotSizeFileInterval <= TimeSpan.Zero)
        {
            failures.Add("UpdateService:Schedules:LotSizeFileInterval must be a positive TimeSpan.");
        }

        if (string.IsNullOrWhiteSpace(options.NightlyBatchImportCron))
        {
            failures.Add("UpdateService:Schedules:NightlyBatchImportCron is required.");
        }
        else if (!CronExpression.IsValidExpression(options.NightlyBatchImportCron))
        {
            failures.Add("UpdateService:Schedules:NightlyBatchImportCron is not a valid Quartz cron expression.");
        }

        return failures.Count > 0 ? ValidateOptionsResult.Fail(failures) : ValidateOptionsResult.Success;
    }
}
