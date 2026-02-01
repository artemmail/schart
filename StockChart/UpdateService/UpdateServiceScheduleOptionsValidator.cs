using System.Collections.Generic;
using Microsoft.Extensions.Options;
using Quartz;

namespace StockChart.UpdateService;

public sealed class UpdateServiceScheduleOptionsValidator : IValidateOptions<UpdateServiceScheduleOptions>
{
    public ValidateOptionsResult Validate(string? name, UpdateServiceScheduleOptions options)
    {
        var failures = new List<string>();

        ValidateSchedule(failures, "DividendsMoexInterval", options.DividendsMoexInterval);
        ValidateSchedule(failures, "MoexSyncInterval", options.MoexSyncInterval);
        ValidateSchedule(failures, "YooMoneyInterval", options.YooMoneyInterval);
        ValidateSchedule(failures, "LotSizeFileInterval", options.LotSizeFileInterval);
        ValidateSchedule(failures, "NightlyBatchImportCron", options.NightlyBatchImportCron);

        return failures.Count > 0 ? ValidateOptionsResult.Fail(failures) : ValidateOptionsResult.Success;
    }

    private static void ValidateSchedule(List<string> failures, string name, string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            failures.Add($"UpdateService:Schedules:{name} is required.");
            return;
        }

        if (!ScheduleParsing.TryParseSchedule(value, out var schedule))
        {
            failures.Add($"UpdateService:Schedules:{name} must be a TimeSpan (hh:mm:ss) or a Quartz cron expression.");
            return;
        }

        if (!schedule.IsCron && schedule.Interval <= TimeSpan.Zero)
        {
            failures.Add($"UpdateService:Schedules:{name} must be a positive TimeSpan.");
        }
    }
}
